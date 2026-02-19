
import express from 'express';
import { WebSocketServer } from 'ws';
import path from 'path';
import { Simulation } from './sim/sim';
import { Policy } from './sim/types';
import { SIM_CONFIG } from './sim/config';

const app = express();
const port = Number(process.env.PORT) || 3000;
const clientDistPath = path.resolve(__dirname, '../../client/dist');

app.get('/health', (_req, res) => {
    res.status(200).send('ok');
});

app.use(express.static(clientDistPath));

app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
});

const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

const wss = new WebSocketServer({ server });

let sim: Simulation | null = null;
let simInterval: NodeJS.Timeout | null = null;
let tickCounter = 0;

function sendError(ws: { send: (payload: string) => void }, reason: string) {
    ws.send(JSON.stringify({ type: 'ERROR', reason }));
}

function validatePolicyShape(policy: unknown): policy is Policy {
    if (!policy || typeof policy !== 'object') {
        return false;
    }

    const parsed = policy as Policy;
    if (typeof parsed.name !== 'string' || !Array.isArray(parsed.rules) || !parsed.defaults) {
        return false;
    }

    if (parsed.rules.length > 20) {
        return false;
    }

    for (const rule of parsed.rules) {
        if (!Array.isArray(rule.if) || !Array.isArray(rule.then)) {
            return false;
        }
        if (rule.if.length > 5 || rule.then.length > 5) {
            return false;
        }
    }

    const defaults = parsed.defaults;
    if (
        (defaults.workerRole !== 'mine' && defaults.workerRole !== 'build_barracks') ||
        typeof defaults.trainSoldier !== 'boolean' ||
        (defaults.armyMode !== 'attack' && defaults.armyMode !== 'defend')
    ) {
        return false;
    }

    return true;
}

wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());

            if (data.type === 'START_MATCH') {
                const bluePolicy = data.bluePolicy;
                const redPolicy = data.redPolicy;

                if (!validatePolicyShape(bluePolicy) || !validatePolicyShape(redPolicy)) {
                    sendError(ws, 'Invalid policy payload');
                    return;
                }

                console.log('Starting match with policies:', bluePolicy.name, redPolicy.name);

                if (simInterval) clearInterval(simInterval);

                sim = new Simulation(bluePolicy, redPolicy);
                tickCounter = 0;

                // Notify start
                ws.send(JSON.stringify({ type: 'MATCH_STARTED', snapshot: sim.getSnapshot() }));

                // Start loop
                const dt = 1 / SIM_CONFIG.tickRate;
                const snapshotEveryTicks = Math.max(1, Math.round(SIM_CONFIG.tickRate / SIM_CONFIG.snapshotRate));
                simInterval = setInterval(() => {
                    if (!sim) {
                        return;
                    }

                    sim.tick(dt);
                    tickCounter += 1;

                    if (tickCounter % snapshotEveryTicks === 0 || !sim.running) {
                        ws.send(JSON.stringify({ type: 'STATE_SNAPSHOT', snapshot: sim.getSnapshot() }));
                    }

                    if (!sim.running) {
                        ws.send(JSON.stringify({ type: 'MATCH_ENDED', winner: sim.winner }));
                        if (simInterval) {
                            clearInterval(simInterval);
                            simInterval = null;
                        }
                    }
                }, 1000 / SIM_CONFIG.tickRate);
            }

            if (data.type === 'RESET') {
                if (simInterval) {
                    clearInterval(simInterval);
                    simInterval = null;
                }
                sim = null;
                ws.send(JSON.stringify({ type: 'RESET_CONFIRMED' }));
            }
        } catch (e) {
            console.error('Error handling message:', e);
        }
    });
});

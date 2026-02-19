import { Entity, Policy, Snapshot, Team, TeamState } from './types';
import { SIM_CONFIG } from './config';
import { createBarracks, createCore, createMineral, createSoldier, createWorker } from './entities';
import { evaluatePolicy } from './policy';
import { updateWorker } from './ai_worker';
import { updateSoldier } from './ai_soldier';

export class Simulation {
    time = 0;
    running = true;
    winner: Team | 'draw' | null = null;
    entities: Entity[] = [];

    private readonly bluePolicy: Policy;
    private readonly redPolicy: Policy;
    private readonly blueState: TeamState;
    private readonly redState: TeamState;

    constructor(bluePolicy: Policy, redPolicy: Policy) {
        this.bluePolicy = bluePolicy;
        this.redPolicy = redPolicy;
        this.blueState = { minerals: 0, intents: { ...bluePolicy.defaults } };
        this.redState = { minerals: 0, intents: { ...redPolicy.defaults } };
        this.initWorld();
    }

    tick(dt: number): void {
        if (!this.running) {
            return;
        }

        this.time += dt;

        evaluatePolicy(this.bluePolicy, this.time, this.blueState, this.entities, 'blue');
        evaluatePolicy(this.redPolicy, this.time, this.redState, this.entities, 'red');

        this.handleProduction(dt);
        this.handleWorkersAndSoldiers(dt);
        this.handleConstruction(dt);

        this.entities = this.entities.filter((entity) => entity.type === 'mineral' || entity.hp > 0);
        this.evaluateWinner();
    }

    getSnapshot(): Snapshot {
        return {
            time: this.time,
            winner: this.winner,
            running: this.running,
            teams: {
                blue: { minerals: this.blueState.minerals },
                red: { minerals: this.redState.minerals },
            },
            entities: this.entities.map((entity) => ({
                id: entity.id,
                team: entity.team,
                type: entity.type,
                pos: entity.pos,
                hp: entity.hp,
                radius: entity.radius,
                state: entity.state,
                buildProgress: entity.buildProgress,
                buildSite: entity.buildSite,
                trainProgress: entity.trainProgress,
                carry: entity.carry,
            })),
        };
    }

    private initWorld(): void {
        this.entities.push(createCore('blue', { ...SIM_CONFIG.map.blueCore }));
        this.entities.push(createCore('red', { ...SIM_CONFIG.map.redCore }));

        SIM_CONFIG.map.blueMinerals.forEach((pos) => this.entities.push(createMineral({ ...pos })));
        SIM_CONFIG.map.redMinerals.forEach((pos) => this.entities.push(createMineral({ ...pos })));

        const blueCore = this.entities.find((entity) => entity.team === 'blue' && entity.type === 'core');
        const redCore = this.entities.find((entity) => entity.team === 'red' && entity.type === 'core');

        if (!blueCore || !redCore) {
            throw new Error('Failed to initialize cores');
        }

        this.entities.push(createWorker('blue', { x: blueCore.pos.x + 40, y: blueCore.pos.y }));
        this.entities.push(createWorker('red', { x: redCore.pos.x - 40, y: redCore.pos.y }));
    }

    private handleWorkersAndSoldiers(dt: number): void {
        const blueEnemies = this.entities.filter((entity) => entity.team === 'red');
        const redEnemies = this.entities.filter((entity) => entity.team === 'blue');

        for (const entity of this.entities) {
            if (entity.type === 'worker' && (entity.team === 'blue' || entity.team === 'red')) {
                const teamState = entity.team === 'blue' ? this.blueState : this.redState;
                updateWorker(entity, this.entities, teamState, dt);
            }

            if (entity.type === 'soldier' && (entity.team === 'blue' || entity.team === 'red')) {
                const teamState = entity.team === 'blue' ? this.blueState : this.redState;
                const enemies = entity.team === 'blue' ? blueEnemies : redEnemies;
                updateSoldier(entity, this.entities, enemies, teamState, dt);
            }
        }
    }

    private handleConstruction(dt: number): void {
        for (const worker of this.entities) {
            if (
                worker.type !== 'worker' ||
                worker.state !== 'building' ||
                (worker.team !== 'blue' && worker.team !== 'red')
            ) {
                continue;
            }

            worker.buildProgress = (worker.buildProgress ?? 0) + dt;
            if (worker.buildProgress >= SIM_CONFIG.entities.barracks.buildTime) {
                const buildSite = worker.buildSite ?? worker.pos;
                worker.buildProgress = 0;
                worker.state = 'idle';
                worker.buildSite = undefined;
                this.entities.push(createBarracks(worker.team, { x: buildSite.x, y: buildSite.y }));
            }
        }
    }

    private handleProduction(dt: number): void {
        const barracksList = this.entities.filter((entity) => entity.type === 'barracks');

        for (const barracks of barracksList) {
            if (barracks.team !== 'blue' && barracks.team !== 'red') {
                continue;
            }

            const teamState = barracks.team === 'blue' ? this.blueState : this.redState;
            const progress = barracks.trainProgress ?? 0;

            if (
                progress <= 0 &&
                teamState.intents.trainSoldier &&
                teamState.minerals >= SIM_CONFIG.entities.soldier.cost
            ) {
                teamState.minerals -= SIM_CONFIG.entities.soldier.cost;
                barracks.trainProgress = 0.0001;
                continue;
            }

            if (progress > 0) {
                barracks.trainProgress = progress + dt;
                if ((barracks.trainProgress ?? 0) >= SIM_CONFIG.entities.soldier.trainTime) {
                    this.entities.push(
                        createSoldier(barracks.team, {
                            x: barracks.pos.x,
                            y: barracks.pos.y + barracks.radius + 12,
                        })
                    );
                    barracks.trainProgress = 0;
                }
            }
        }
    }

    private evaluateWinner(): void {
        const blueCore = this.entities.find((entity) => entity.team === 'blue' && entity.type === 'core');
        const redCore = this.entities.find((entity) => entity.team === 'red' && entity.type === 'core');

        if (!blueCore || blueCore.hp <= 0) {
            this.winner = 'red';
            this.running = false;
            return;
        }

        if (!redCore || redCore.hp <= 0) {
            this.winner = 'blue';
            this.running = false;
            return;
        }

        if (this.time >= SIM_CONFIG.matchDuration) {
            if (blueCore.hp > redCore.hp) {
                this.winner = 'blue';
            } else if (redCore.hp > blueCore.hp) {
                this.winner = 'red';
            } else {
                this.winner = 'draw';
            }
            this.running = false;
        }
    }
}

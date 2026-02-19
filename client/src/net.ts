
import type { Snapshot, Policy } from './types';

function resolveWebSocketUrl(): string {
    const explicit = import.meta.env.VITE_WS_URL;
    if (explicit && typeof explicit === 'string' && explicit.length > 0) {
        return explicit;
    }

    if (import.meta.env.DEV) {
        return 'ws://localhost:3000';
    }

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${window.location.host}`;
}

export class Net {
    ws: WebSocket;
    onSnapshot: (snap: Snapshot) => void = () => { };
    onMatchStart: () => void = () => { };
    onMatchEnd: (winner: string) => void = () => { };

    constructor() {
        this.ws = new WebSocket(resolveWebSocketUrl());
        this.ws.onopen = () => {
            console.log('Connected to server');
        };
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            switch (data.type) {
                case 'MATCH_STARTED':
                    this.onMatchStart();
                    break;
                case 'STATE_SNAPSHOT':
                    this.onSnapshot(data.snapshot);
                    break;
                case 'MATCH_ENDED':
                    this.onMatchEnd(data.winner);
                    break;
            }
        };
        this.ws.onerror = (e) => console.error('WS Error:', e);
    }

    startMatch(bluePolicy: Policy, redPolicy: Policy) {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'START_MATCH',
                bluePolicy,
                redPolicy
            }));
        } else {
            console.error('WS not ready');
        }
    }

    reset() {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'RESET' }));
        }
    }
}

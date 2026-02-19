
import { Net } from './net';
import { Renderer } from './render';
import { UI } from './ui';
import type { Entity, Snapshot } from './types';

const net = new Net();
const renderer = new Renderer('sim-canvas');
const ui = new UI();

renderer.canvas.addEventListener('click', (event) => {
    const rect = renderer.canvas.getBoundingClientRect();
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;
    const entity = renderer.getEntityAtCanvas(canvasX, canvasY);
    ui.updateInspector(entity);
});

ui.onStart = (blue, red) => {
    net.startMatch(blue, red);
    ui.updateStatus('Match requested...');
};

ui.onReset = () => {
    net.reset();
    ui.updateStatus('Reset requested...');
};

net.onMatchStart = () => {
    ui.updateStatus('Match Started');
};

net.onSnapshot = (snap: Snapshot) => {
    renderer.render(snap);

    const blueCounts = summarizeTeam(snap.entities, 'blue');
    const redCounts = summarizeTeam(snap.entities, 'red');
    ui.updateHud(snap.time, snap.teams.blue.minerals, snap.teams.red.minerals, blueCounts, redCounts);
};

net.onMatchEnd = (winner) => {
    ui.updateStatus(`Match Ended! Winner: ${winner}`);
};

function summarizeTeam(entities: Entity[], team: 'blue' | 'red'): string {
    const workers = entities.filter((entity) => entity.team === team && entity.type === 'worker').length;
    const barracks = entities.filter((entity) => entity.team === team && entity.type === 'barracks').length;
    const soldiers = entities.filter((entity) => entity.team === team && entity.type === 'soldier').length;
    return `W:${workers} B:${barracks} S:${soldiers}`;
}

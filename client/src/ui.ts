
import { PRESET_POLICIES } from './presets';
import type { Entity } from './types';

export class UI {
    blueSelect: HTMLSelectElement;
    redSelect: HTMLSelectElement;
    blueText: HTMLTextAreaElement;
    redText: HTMLTextAreaElement;
    startBtn: HTMLButtonElement;
    resetBtn: HTMLButtonElement;
    statusDiv: HTMLDivElement;
    inspectorDiv: HTMLDivElement;

    onStart: (blue: any, red: any) => void = () => { };
    onReset: () => void = () => { };

    constructor() {
        this.blueSelect = document.getElementById('blue-policy') as HTMLSelectElement;
        this.redSelect = document.getElementById('red-policy') as HTMLSelectElement;
        this.blueText = document.getElementById('blue-json') as HTMLTextAreaElement;
        this.redText = document.getElementById('red-json') as HTMLTextAreaElement;
        this.startBtn = document.getElementById('start-btn') as HTMLButtonElement;
        this.resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
        this.statusDiv = document.getElementById('status') as HTMLDivElement;
        this.inspectorDiv = document.getElementById('inspector') as HTMLDivElement;

        this.initPresets();
        this.bindEvents();
    }

    initPresets() {
        PRESET_POLICIES.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.name;
            opt.text = p.name;
            this.blueSelect.add(opt.cloneNode(true) as HTMLOptionElement);
            this.redSelect.add(opt.cloneNode(true) as HTMLOptionElement);
        });

        // Default selection
        this.blueSelect.value = 'Rush';
        this.redSelect.value = 'Standard';
        this.updateJson('blue');
        this.updateJson('red');
    }

    updateJson(team: 'blue' | 'red') {
        const select = team === 'blue' ? this.blueSelect : this.redSelect;
        const text = team === 'blue' ? this.blueText : this.redText;
        const policy = PRESET_POLICIES.find(p => p.name === select.value);
        if (policy) {
            text.value = JSON.stringify(policy, null, 2);
        }
    }

    bindEvents() {
        this.blueSelect.addEventListener('change', () => this.updateJson('blue'));
        this.redSelect.addEventListener('change', () => this.updateJson('red'));

        this.startBtn.addEventListener('click', () => {
            try {
                const blue = JSON.parse(this.blueText.value);
                const red = JSON.parse(this.redText.value);
                this.onStart(blue, red);
            } catch (e) {
                alert('Invalid JSON');
            }
        });

        this.resetBtn.addEventListener('click', () => {
            this.onReset();
        });
    }

    updateStatus(msg: string) {
        this.statusDiv.innerText = msg;
    }

    updateHud(time: number, blueMinerals: number, redMinerals: number, blueCounts: string, redCounts: string) {
        this.statusDiv.innerText = `Time ${time.toFixed(1)}s | Blue M:${Math.floor(blueMinerals)} ${blueCounts} | Red M:${Math.floor(redMinerals)} ${redCounts}`;
    }

    updateInspector(entity: Entity | null) {
        if (!entity) {
            this.inspectorDiv.innerText = 'Inspector: click a unit/building to view details.';
            return;
        }

        const lines = [
            `Inspector: ${entity.team.toUpperCase()} ${entity.type.toUpperCase()}`,
            `id: ${entity.id}`,
            `hp: ${entity.hp.toFixed(1)}`,
            `pos: (${entity.pos.x.toFixed(1)}, ${entity.pos.y.toFixed(1)})`,
            `state: ${entity.state ?? 'n/a'}`,
            `carry: ${(entity.carry ?? 0).toFixed(1)}`,
            `buildProgress: ${(entity.buildProgress ?? 0).toFixed(2)}`,
            `trainProgress: ${(entity.trainProgress ?? 0).toFixed(2)}`,
        ];

        if (entity.buildSite) {
            lines.push(`buildSite: (${entity.buildSite.x.toFixed(1)}, ${entity.buildSite.y.toFixed(1)})`);
        }

        this.inspectorDiv.innerText = lines.join(' | ');
    }
}

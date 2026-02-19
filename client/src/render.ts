
import type { Entity, Snapshot } from './types';

const BARRACKS_SLOTS = {
    blue: [{ x: 230, y: 350 }],
    red: [{ x: 970, y: 350 }],
};

export class Renderer {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    lastSnapshot: Snapshot | null = null;

    private workerSprite: HTMLImageElement;
    private soldierSprite: HTMLImageElement;
    private coreSprite: HTMLImageElement;
    private barracksSprite: HTMLImageElement;
    private mineralSprite: HTMLImageElement;
    private previousPositions: Map<string, { x: number, y: number }> = new Map();
    private entityFacing: Map<string, 'left' | 'right'> = new Map();

    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;
        this.width = 1200;
        this.height = 700;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.workerSprite = new Image();
        this.workerSprite.src = '/sprites/worker-1-left.png';

        this.soldierSprite = new Image();
        this.soldierSprite.src = '/sprites/soldier-1-left.png';

        this.coreSprite = new Image();
        this.coreSprite.src = '/sprites/core-1-left.png';

        this.barracksSprite = new Image();
        this.barracksSprite.src = '/sprites/barracks-1-left.png';

        this.mineralSprite = new Image();
        this.mineralSprite.src = '/sprites/mineral-1.png';
    }

    render(snapshot: Snapshot) {
        this.lastSnapshot = snapshot;

        // Clear
        this.ctx.fillStyle = '#222';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.drawBuildSlots();

        // Render entities
        for (const entity of snapshot.entities) {
            this.updateFacing(entity);
            this.drawEntity(entity);
        }

        // Prune stale entities from state
        const currentIds = new Set(snapshot.entities.map(e => e.id));
        for (const id of this.previousPositions.keys()) {
            if (!currentIds.has(id)) {
                this.previousPositions.delete(id);
                this.entityFacing.delete(id);
            }
        }
    }

    private updateFacing(entity: Entity) {
        const prev = this.previousPositions.get(entity.id);
        if (prev) {
            const dx = entity.pos.x - prev.x;
            if (dx > 0.1) this.entityFacing.set(entity.id, 'right');
            else if (dx < -0.1) this.entityFacing.set(entity.id, 'left');
        }
        this.previousPositions.set(entity.id, { ...entity.pos });
    }

    getEntityAtCanvas(canvasX: number, canvasY: number): Entity | null {
        if (!this.lastSnapshot) {
            return null;
        }

        for (let index = this.lastSnapshot.entities.length - 1; index >= 0; index -= 1) {
            const entity = this.lastSnapshot.entities[index];
            const dx = canvasX - entity.pos.x;
            const dy = canvasY - entity.pos.y;
            if (Math.sqrt(dx * dx + dy * dy) <= entity.radius) {
                return entity;
            }
        }

        return null;
    }

    private drawBuildSlots() {
        this.ctx.save();
        this.ctx.setLineDash([6, 4]);

        this.ctx.strokeStyle = '#3b82f6';
        for (const slot of BARRACKS_SLOTS.blue) {
            this.ctx.strokeRect(slot.x - 24, slot.y - 24, 48, 48);
        }

        this.ctx.strokeStyle = '#ef4444';
        for (const slot of BARRACKS_SLOTS.red) {
            this.ctx.strokeRect(slot.x - 24, slot.y - 24, 48, 48);
        }

        this.ctx.restore();
    }

    drawEntity(entity: Entity) {
        const { x, y } = entity.pos;
        const { radius, hp, team, type } = entity;

        // Color based on team
        let color = team === 'blue' ? '#00f' : '#f00';
        if (type === 'mineral') color = '#0ff';
        if (type === 'mineral') { // Neutral
            if (this.mineralSprite.complete && this.mineralSprite.naturalWidth > 0) {
                const size = radius * 2.5;
                this.ctx.drawImage(this.mineralSprite, x - size / 2, y - size / 2, size, size);
            } else {
                this.ctx.fillStyle = '#0ff';
                this.ctx.beginPath();
                this.ctx.arc(x, y, radius, 0, Math.PI * 2);
                this.ctx.fill();
            }
        } else {
            this.ctx.fillStyle = color;

            if (type === 'core') {
                if (this.coreSprite.complete && this.coreSprite.naturalWidth > 0) {
                    const size = radius * 2.8;
                    this.ctx.save();
                    this.ctx.translate(x, y);
                    // Blue is left, faces right (flip). Red is right, faces left (no flip).
                    if (team === 'blue') this.ctx.scale(-1, 1);
                    this.ctx.drawImage(this.coreSprite, -size / 2, -size / 2, size, size);
                    this.ctx.restore();
                } else {
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                // HP bar
                this.drawHpBar(x, y, radius, hp, 200);
            } else if (type === 'worker') {
                if (this.workerSprite.complete && this.workerSprite.naturalWidth > 0) {
                    const facing = this.entityFacing.get(entity.id) || 'right';
                    this.ctx.save();
                    this.ctx.translate(x, y);
                    if (facing === 'right') {
                        this.ctx.scale(-1, 1);
                    }
                    const size = radius * 2.5;
                    this.ctx.drawImage(this.workerSprite, -size / 2, -size / 2, size, size);
                    this.ctx.restore();
                } else {
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
                    this.ctx.fill();
                }

                if (entity.state === 'building') {
                    this.drawProgressBar(x, y + radius + 6, 30, Math.min((entity.buildProgress ?? 0) / 10, 1), '#f59e0b');
                }
            } else if (type === 'barracks') {
                if (this.barracksSprite.complete && this.barracksSprite.naturalWidth > 0) {
                    const size = radius * 2.5;
                    this.ctx.save();
                    this.ctx.translate(x, y);
                    if (team === 'blue') this.ctx.scale(-1, 1);
                    this.ctx.drawImage(this.barracksSprite, -size / 2, -size / 2, size, size);
                    this.ctx.restore();
                } else {
                    this.ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
                }
                this.drawHpBar(x, y, radius, hp, 120);
                if ((entity.trainProgress ?? 0) > 0) {
                    this.drawProgressBar(x, y + radius + 6, 40, Math.min((entity.trainProgress ?? 0) / 4, 1), '#22c55e');
                }
            } else if (type === 'soldier') {
                if (this.soldierSprite.complete && this.soldierSprite.naturalWidth > 0) {
                    const facing = this.entityFacing.get(entity.id) || 'right';
                    this.ctx.save();
                    this.ctx.translate(x, y);
                    if (facing === 'right') this.ctx.scale(-1, 1);
                    const size = radius * 3.0;
                    this.ctx.drawImage(this.soldierSprite, -size / 2, -size / 2, size, size);
                    this.ctx.restore();
                } else {
                    // Triangle
                    this.ctx.beginPath();
                    this.ctx.moveTo(x, y - radius);
                    this.ctx.lineTo(x + radius, y + radius);
                    this.ctx.lineTo(x - radius, y + radius);
                    this.ctx.closePath();
                    this.ctx.fill();
                }
            }

            if (entity.state && entity.type !== 'core') {
                this.ctx.fillStyle = '#e5e7eb';
                this.ctx.font = '10px sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(entity.state, x, y - radius - 12);
            }
        }
    }

    drawHpBar(x: number, y: number, r: number, hp: number, maxHp: number) {
        const pct = hp / maxHp;
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(x - r, y - r - 10, r * 2, 5);
        this.ctx.fillStyle = '#0f0';
        this.ctx.fillRect(x - r, y - r - 10, r * 2 * pct, 5);
    }

    drawProgressBar(x: number, y: number, width: number, progress: number, color: string) {
        const clamped = Math.max(0, Math.min(progress, 1));
        this.ctx.fillStyle = '#1f2937';
        this.ctx.fillRect(x - width / 2, y, width, 4);
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x - width / 2, y, width * clamped, 4);
    }
}

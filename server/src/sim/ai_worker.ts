
import { Entity, TeamState, Vec2 } from './types';
import { SIM_CONFIG } from './config';

export function updateWorker(
    worker: Entity,
    entities: Entity[],
    teamState: TeamState,
    dt: number
) {
    if (worker.state === 'building') {
        return;
    }

    // workerRole: "mine" | "build_barracks"
    const role = teamState.intents.workerRole;

    if (role === 'mine') {
        handleMining(worker, entities, teamState, dt);
    } else if (role === 'build_barracks') {
        handleBuildBarracks(worker, entities, teamState, dt);
    }
}

function handleMining(worker: Entity, entities: Entity[], teamState: TeamState, dt: number) {
    const currentCarry = worker.carry ?? 0;
    const carryCapacity = SIM_CONFIG.entities.worker.carryCapacity;
    const core = entities.find((entity) => entity.team === worker.team && entity.type === 'core');

    // Carrying cargo: walk back and deposit at core.
    if (currentCarry > 0) {
        worker.state = 'returning';
        if (core) {
            if (distance(worker.pos, core.pos) < core.radius + worker.radius + 5) {
                teamState.minerals += currentCarry;
                worker.carry = 0;
                worker.state = 'idle';
            } else {
                moveTowards(worker, core.pos, dt);
            }
        }
        return;
    } else {
        // Find nearest mineral
        const minerals = entities.filter(e => e.type === 'mineral');
        if (minerals.length > 0) {
            let target = minerals[0];
            let bestDistance = distance(worker.pos, target.pos);
            for (let index = 1; index < minerals.length; index += 1) {
                const candidate = minerals[index];
                const candidateDistance = distance(worker.pos, candidate.pos);
                if (candidateDistance < bestDistance) {
                    target = candidate;
                    bestDistance = candidateDistance;
                }
            }
            if (distance(worker.pos, target.pos) < target.radius + worker.radius + 5) {
                worker.state = 'mining';
                // Zero-time mining: fill cargo instantly, then start return trip.
                worker.carry = carryCapacity;
                worker.state = 'returning';
            } else {
                worker.state = 'to_mineral';
                moveTowards(worker, target.pos, dt);
            }
        }
    }
}

function handleBuildBarracks(worker: Entity, entities: Entity[], teamState: TeamState, dt: number) {
    const existingBarracks = entities.find((entity) => entity.team === worker.team && entity.type === 'barracks');
    const workerBuilding = entities.find(
        (entity) => entity.type === 'worker' && entity.team === worker.team && entity.state === 'building'
    );

    if (existingBarracks || workerBuilding) {
        handleMining(worker, entities, teamState, dt);
        return;
    }

    const buildPos = getBuildSlot(worker);

    if (distance(worker.pos, buildPos) < 5) {
        worker.state = 'at_build_slot';
        if (teamState.minerals >= SIM_CONFIG.entities.barracks.cost) {
            teamState.minerals -= SIM_CONFIG.entities.barracks.cost;
            worker.state = 'building';
            worker.buildProgress = 0;
            worker.buildSite = { ...buildPos };
        }
    } else {
        worker.state = 'to_build_slot';
        moveTowards(worker, buildPos, dt);
    }
}

function getBuildSlot(worker: Entity): Vec2 {
    if (worker.team === 'blue') {
        return SIM_CONFIG.map.barracksSlots.blue[0];
    }
    return SIM_CONFIG.map.barracksSlots.red[0];
}

export function moveTowards(entity: Entity, target: Vec2, dt: number) {
    const dx = target.x - entity.pos.x;
    const dy = target.y - entity.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
        const speed = getEntitySpeed(entity);
        const move = Math.min(dist, speed * dt);
        entity.pos.x += (dx / dist) * move;
        entity.pos.y += (dy / dist) * move;
    }
}

function getEntitySpeed(entity: Entity): number {
    if (entity.type === 'worker') {
        return SIM_CONFIG.entities.worker.speed;
    }
    if (entity.type === 'soldier') {
        return SIM_CONFIG.entities.soldier.speed;
    }
    return 0;
}

export function distance(a: Vec2, b: Vec2): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}


import { v4 as uuidv4 } from 'uuid';
import { Entity, EntityType, EntityTeam, Team, Vec2 } from './types';
import { SIM_CONFIG } from './config';

export function createEntity(
    type: EntityType,
    team: EntityTeam,
    pos: Vec2
): Entity {
    const config = SIM_CONFIG.entities[type];
    return {
        id: uuidv4(),
        team,
        type,
        pos,
        hp: 'hp' in config ? config.hp : 1,
        radius: config.radius,
        state: 'idle',
        cooldown: 0,
    };
}

export function createWorker(team: Team, pos: Vec2): Entity {
    return createEntity('worker', team, pos);
}

export function createSoldier(team: Team, pos: Vec2): Entity {
    return createEntity('soldier', team, pos);
}

export function createBarracks(team: Team, pos: Vec2): Entity {
    const e = createEntity('barracks', team, pos);
    e.trainProgress = 0;
    e.queue = 0;
    return e;
}

export function createCore(team: Team, pos: Vec2): Entity {
    return createEntity('core', team, pos);
}

export function createMineral(pos: Vec2): Entity {
    return createEntity('mineral', 'neutral', pos);
}

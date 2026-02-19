
import { Entity, TeamState } from './types';
import { SIM_CONFIG } from './config';
import { moveTowards, distance } from './ai_worker';

export function updateSoldier(
    soldier: Entity,
    entities: Entity[],
    enemies: Entity[],
    teamState: TeamState,
    dt: number
) {
    const currentCooldown = soldier.cooldown ?? 0;
    // 1. Check for enemies in range
    const target = enemies.find(e => distance(soldier.pos, e.pos) <= SIM_CONFIG.entities.soldier.attackRange);

    if (target) {
        soldier.state = 'attacking';
        // Attack
        if (currentCooldown <= 0) {
            target.hp -= SIM_CONFIG.entities.soldier.attackDamage;
            soldier.cooldown = SIM_CONFIG.entities.soldier.attackCooldown;
        }
    } else {
        // 2. Move
        // Prioritize closest enemy if in "seek range" or just move to objective
        // For simplicity: always move to nearest enemy OR enemy core

        // Find nearest enemy
        let closestEnemy: Entity | null = null;
        let minDist = Infinity;

        for (const e of enemies) {
            const d = distance(soldier.pos, e.pos);
            if (d < minDist) {
                minDist = d;
                closestEnemy = e;
            }
        }

        if (closestEnemy && minDist < 300) { // Aggro range
            soldier.state = 'chasing';
            moveTowards(soldier, closestEnemy.pos, dt);
        } else {
            // Go to objective based on mode
            const mode = teamState.intents.armyMode;
            if (mode === 'attack') {
                const enemyCore = enemies.find(e => e.type === 'core');
                if (enemyCore) {
                    soldier.state = 'advancing';
                    moveTowards(soldier, enemyCore.pos, dt);
                }
            } else {
                // Defend: go to own core
                const ownCore = entities.find(e => e.team === soldier.team && e.type === 'core');
                if (ownCore) {
                    // Patrol radius around core?
                    // Just go to core for now
                    if (distance(soldier.pos, ownCore.pos) > 100) {
                        soldier.state = 'defending';
                        moveTowards(soldier, ownCore.pos, dt);
                    } else {
                        soldier.state = 'holding';
                    }
                }
            }
        }
    }

    // Cooldown tick
    soldier.cooldown = Math.max(0, currentCooldown - dt);
}

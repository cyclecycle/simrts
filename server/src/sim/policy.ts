
import { Policy, TeamState, Rule, Condition, Action, Entity } from './types';

export function evaluatePolicy(
    policy: Policy,
    currentTime: number,
    state: TeamState,
    entities: Entity[],
    team: string
) {
    // Reset intents to defaults
    const intents = { ...policy.defaults };

    // Evaluate each rule
    for (const rule of policy.rules) {
        if (evaluateConditions(rule.if, currentTime, state, entities, team)) {
            applyActions(rule.then, intents);
        }
    }

    // Update team intents
    state.intents = intents;
}

function evaluateConditions(
    conditions: Condition[],
    time: number,
    state: TeamState,
    entities: Entity[],
    team: string
): boolean {
    for (const cond of conditions) {
        switch (cond.kind) {
            case 'time_gte':
                if (time < cond.seconds) return false;
                break;
            case 'minerals_gte':
                if (state.minerals < cond.amount) return false;
                break;
            case 'has_building':
                const count = entities.filter(e => e.team === team && e.type === cond.building).length;
                if (count < cond.count_gte) return false;
                break;
            case 'unit_count_gte':
                const unitCount = entities.filter(e => e.team === team && e.type === cond.unit).length;
                if (unitCount < cond.count) return false;
                break;
        }
    }
    return true;
}

function applyActions(
    actions: Action[],
    intents: any
) {
    for (const action of actions) {
        switch (action.kind) {
            case 'set_worker_role':
                intents.workerRole = action.role;
                break;
            case 'train_soldier':
                intents.trainSoldier = action.enabled;
                break;
            case 'set_army_mode':
                intents.armyMode = action.mode;
                break;
        }
    }
}

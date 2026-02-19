
import { Policy } from './types';

export const PRESET_POLICIES: Policy[] = [
    {
        name: "Rush",
        defaults: { workerRole: "mine", trainSoldier: true, armyMode: "attack" },
        rules: [
            { if: [{ kind: "minerals_gte", amount: 20 }, { kind: "has_building", building: "barracks", count_gte: 0 }], then: [{ kind: "set_worker_role", role: "build_barracks" }] },
            // If barracks exists, we should probably mine to afford soldiers.
            { if: [{ kind: "has_building", building: "barracks", count_gte: 1 }], then: [{ kind: "set_worker_role", role: "mine" }] }
        ]
    },
    {
        name: "Standard",
        defaults: { workerRole: "mine", trainSoldier: false, armyMode: "defend" },
        rules: [
            { if: [{ kind: "minerals_gte", amount: 40 }], then: [{ kind: "set_worker_role", role: "build_barracks" }] },
            { if: [{ kind: "has_building", building: "barracks", count_gte: 1 }], then: [{ kind: "train_soldier", enabled: true }] },
            { if: [{ kind: "unit_count_gte", unit: "soldier", count: 3 }], then: [{ kind: "set_army_mode", mode: "attack" }] }
        ]
    },
    {
        name: "Greedy",
        defaults: { workerRole: "mine", trainSoldier: false, armyMode: "defend" },
        rules: [
            { if: [{ kind: "minerals_gte", amount: 80 }], then: [{ kind: "set_worker_role", role: "build_barracks" }] },
            { if: [{ kind: "has_building", building: "barracks", count_gte: 1 }], then: [{ kind: "train_soldier", enabled: true }] },
            { if: [{ kind: "time_gte", seconds: 60 }], then: [{ kind: "set_army_mode", mode: "attack" }] }
        ]
    },
    {
        name: "Turtle",
        defaults: { workerRole: "mine", trainSoldier: true, armyMode: "defend" },
        rules: [
            { if: [{ kind: "minerals_gte", amount: 40 }], then: [{ kind: "set_worker_role", role: "build_barracks" }] },
            { if: [{ kind: "time_gte", seconds: 90 }], then: [{ kind: "set_army_mode", mode: "attack" }] }
        ]
    }
];

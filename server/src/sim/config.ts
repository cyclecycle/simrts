
export const SIM_CONFIG = {
    tickRate: 20, // ticks per second
    snapshotRate: 10, // snapshots per second (every 2 ticks)
    map: {
        width: 1200,
        height: 700,
        blueCore: { x: 150, y: 350 },
        redCore: { x: 1050, y: 350 },
        barracksSlots: {
            blue: [{ x: 230, y: 350 }],
            red: [{ x: 970, y: 350 }],
        },
        blueMinerals: [
            { x: 250, y: 250 },
            { x: 250, y: 450 },
        ],
        redMinerals: [
            { x: 950, y: 250 },
            { x: 950, y: 450 },
        ],
    },
    entities: {
        core: { hp: 200, radius: 30 },
        worker: { hp: 35, radius: 8, speed: 60, carryCapacity: 10, mineRate: 1 },
        barracks: { hp: 120, radius: 22, cost: 20, buildTime: 10, buildDistance: 80 },
        soldier: { hp: 45, radius: 9, speed: 75, cost: 15, trainTime: 4, attackRange: 20, attackDamage: 6, attackCooldown: 0.5 },
        mineral: { radius: 15 }, // Visual radius for mineral nodes
    },
    matchDuration: 120, // seconds target
};

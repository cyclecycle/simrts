import type { Policy } from '../../src/sim/types';

export type ScenarioExpectation = {
    bySecond: number;
    minBarracksBlue?: number;
    minBarracksRed?: number;
    minSoldiersBlue?: number;
    minSoldiersRed?: number;
    minPeakSoldiersBlue?: number;
    minPeakSoldiersRed?: number;
};

export type SimulationScenario = {
    name: string;
    bluePolicy: string;
    redPolicy: string;
    expectations: ScenarioExpectation;
};

export const SCENARIOS: SimulationScenario[] = [
    {
        name: 'Rush vs Turtle builds barracks by 90s',
        bluePolicy: 'Rush',
        redPolicy: 'Turtle',
        expectations: {
            bySecond: 90,
            minBarracksBlue: 1,
            minBarracksRed: 1,
        },
    },
    {
        name: 'Rush mirror produces soldiers by 120s',
        bluePolicy: 'Rush',
        redPolicy: 'Rush',
        expectations: {
            bySecond: 120,
            minPeakSoldiersBlue: 1,
            minPeakSoldiersRed: 1,
        },
    },
];

export function resolvePolicy(policyName: string, presets: Policy[]): Policy {
    const policy = presets.find((preset) => preset.name === policyName);
    if (!policy) {
        throw new Error(`Missing preset policy: ${policyName}`);
    }
    return policy;
}

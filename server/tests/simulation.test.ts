import test from 'node:test';
import assert from 'node:assert/strict';

import { Simulation } from '../src/sim/sim';
import { PRESET_POLICIES } from '../src/sim/presets';
import type { Policy } from '../src/sim/types';
import { SIM_CONFIG } from '../src/sim/config';
import { SCENARIOS, resolvePolicy } from './fixtures/scenarios';

const DT = 1 / SIM_CONFIG.tickRate;

function getPolicy(name: string): Policy {
    const policy = PRESET_POLICIES.find((preset) => preset.name === name);
    if (!policy) {
        throw new Error(`Missing preset policy: ${name}`);
    }
    return policy;
}

function runForSeconds(simulation: Simulation, seconds: number): void {
    const ticks = Math.floor(seconds / DT);
    for (let tick = 0; tick < ticks && simulation.running; tick += 1) {
        simulation.tick(DT);
    }
}

function countTeamType(simulation: Simulation, team: 'blue' | 'red', type: 'worker' | 'barracks' | 'soldier' | 'core'): number {
    return simulation.getSnapshot().entities.filter((entity) => entity.team === team && entity.type === type).length;
}

test('pure mining accumulates meaningful minerals quickly', () => {
    const mineOnly: Policy = {
        name: 'MineOnly',
        defaults: { workerRole: 'mine', trainSoldier: false, armyMode: 'defend' },
        rules: [],
    };

    const simulation = new Simulation(mineOnly, mineOnly);
    runForSeconds(simulation, 40);

    const snapshot = simulation.getSnapshot();
    assert.ok(snapshot.teams.blue.minerals >= 20, `expected blue minerals >= 20, got ${snapshot.teams.blue.minerals}`);
    assert.ok(snapshot.teams.red.minerals >= 20, `expected red minerals >= 20, got ${snapshot.teams.red.minerals}`);
});

test('rush policy builds barracks by 90s and starts soldier production', () => {
    const rush = getPolicy('Rush');
    const simulation = new Simulation(rush, rush);

    let blueBuiltBarracks = false;
    let redBuiltBarracks = false;
    let blueMaxSoldiers = 0;
    let redMaxSoldiers = 0;
    let blueSawBuildState = false;
    let redSawBuildState = false;
    let validatedBarracksBy90 = false;

    const ticks = Math.floor(120 / DT);
    for (let tick = 0; tick < ticks && simulation.running; tick += 1) {
        simulation.tick(DT);

        const snapshot = simulation.getSnapshot();
        const time = snapshot.time;

        const blueBarracks = countTeamType(simulation, 'blue', 'barracks');
        const redBarracks = countTeamType(simulation, 'red', 'barracks');
        blueBuiltBarracks = blueBuiltBarracks || blueBarracks > 0;
        redBuiltBarracks = redBuiltBarracks || redBarracks > 0;

        const blueSoldiers = countTeamType(simulation, 'blue', 'soldier');
        const redSoldiers = countTeamType(simulation, 'red', 'soldier');
        blueMaxSoldiers = Math.max(blueMaxSoldiers, blueSoldiers);
        redMaxSoldiers = Math.max(redMaxSoldiers, redSoldiers);

        blueSawBuildState = blueSawBuildState || snapshot.entities.some((entity) => entity.team === 'blue' && entity.type === 'worker' && entity.state === 'building');
        redSawBuildState = redSawBuildState || snapshot.entities.some((entity) => entity.team === 'red' && entity.type === 'worker' && entity.state === 'building');

        if (!validatedBarracksBy90 && time >= 90) {
            assert.ok(blueBuiltBarracks, 'blue should have built at least one barracks by 90s');
            assert.ok(redBuiltBarracks, 'red should have built at least one barracks by 90s');
            validatedBarracksBy90 = true;
        }
    }

    assert.ok(validatedBarracksBy90, 'test should reach 90s to validate barracks timing');
    assert.ok(blueSawBuildState, 'blue worker should enter building state at least once');
    assert.ok(redSawBuildState, 'red worker should enter building state at least once');
    assert.ok(blueMaxSoldiers >= 1, `expected blue to train soldiers, got max ${blueMaxSoldiers}`);
    assert.ok(redMaxSoldiers >= 1, `expected red to train soldiers, got max ${redMaxSoldiers}`);
});

test('rush vs turtle should not stay at zero barracks past 90s', () => {
    const simulation = new Simulation(getPolicy('Rush'), getPolicy('Turtle'));
    runForSeconds(simulation, 90);

    const blueBarracks = countTeamType(simulation, 'blue', 'barracks');
    const redBarracks = countTeamType(simulation, 'red', 'barracks');

    assert.ok(blueBarracks >= 1, `expected Rush side (blue) barracks >= 1 by 90s, got ${blueBarracks}`);
    assert.ok(redBarracks >= 1, `expected Turtle side (red) barracks >= 1 by 90s, got ${redBarracks}`);
});

for (const scenario of SCENARIOS) {
    test(`scenario fixture: ${scenario.name}`, () => {
        const blue = resolvePolicy(scenario.bluePolicy, PRESET_POLICIES);
        const red = resolvePolicy(scenario.redPolicy, PRESET_POLICIES);
        const simulation = new Simulation(blue, red);

        let bluePeakSoldiers = 0;
        let redPeakSoldiers = 0;
        const ticks = Math.floor(scenario.expectations.bySecond / DT);
        for (let tick = 0; tick < ticks && simulation.running; tick += 1) {
            simulation.tick(DT);
            bluePeakSoldiers = Math.max(bluePeakSoldiers, countTeamType(simulation, 'blue', 'soldier'));
            redPeakSoldiers = Math.max(redPeakSoldiers, countTeamType(simulation, 'red', 'soldier'));
        }

        if (typeof scenario.expectations.minBarracksBlue === 'number') {
            const value = countTeamType(simulation, 'blue', 'barracks');
            assert.ok(
                value >= scenario.expectations.minBarracksBlue,
                `expected blue barracks >= ${scenario.expectations.minBarracksBlue}, got ${value}`
            );
        }

        if (typeof scenario.expectations.minBarracksRed === 'number') {
            const value = countTeamType(simulation, 'red', 'barracks');
            assert.ok(
                value >= scenario.expectations.minBarracksRed,
                `expected red barracks >= ${scenario.expectations.minBarracksRed}, got ${value}`
            );
        }

        if (typeof scenario.expectations.minSoldiersBlue === 'number') {
            const value = countTeamType(simulation, 'blue', 'soldier');
            assert.ok(
                value >= scenario.expectations.minSoldiersBlue,
                `expected blue soldiers >= ${scenario.expectations.minSoldiersBlue}, got ${value}`
            );
        }

        if (typeof scenario.expectations.minPeakSoldiersBlue === 'number') {
            assert.ok(
                bluePeakSoldiers >= scenario.expectations.minPeakSoldiersBlue,
                `expected blue peak soldiers >= ${scenario.expectations.minPeakSoldiersBlue}, got ${bluePeakSoldiers}`
            );
        }

        if (typeof scenario.expectations.minSoldiersRed === 'number') {
            const value = countTeamType(simulation, 'red', 'soldier');
            assert.ok(
                value >= scenario.expectations.minSoldiersRed,
                `expected red soldiers >= ${scenario.expectations.minSoldiersRed}, got ${value}`
            );
        }

        if (typeof scenario.expectations.minPeakSoldiersRed === 'number') {
            assert.ok(
                redPeakSoldiers >= scenario.expectations.minPeakSoldiersRed,
                `expected red peak soldiers >= ${scenario.expectations.minPeakSoldiersRed}, got ${redPeakSoldiers}`
            );
        }
    });
}

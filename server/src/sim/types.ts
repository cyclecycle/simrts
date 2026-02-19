
export type Vec2 = { x: number; y: number };

export type Team = 'blue' | 'red';
export type EntityTeam = Team | 'neutral';
export type EntityType = 'core' | 'worker' | 'barracks' | 'soldier' | 'mineral';

export interface Entity {
    id: string;
    team: EntityTeam;
    type: EntityType;
    pos: Vec2;
    hp: number;
    radius: number;
    // Optional / Specific fields
    targetId?: string | null;
    state?: string;
    cooldown?: number;
    carry?: number;
    buildProgress?: number;
    buildSite?: Vec2;
    trainProgress?: number;
    queue?: number; // Soldiers to train
}

// Policy DSL
export type Condition =
    | { kind: "time_gte"; seconds: number }
    | { kind: "minerals_gte"; amount: number }
    | { kind: "has_building"; building: "barracks"; count_gte: number }
    | { kind: "unit_count_gte"; unit: "soldier" | "worker"; count: number };

export type Action =
    | { kind: "set_worker_role"; role: "mine" | "build_barracks" }
    | { kind: "train_soldier"; enabled: boolean }
    | { kind: "set_army_mode"; mode: "attack" | "defend" };

export type Rule = { if: Condition[]; then: Action[] };

export type Policy = {
    name: string;
    rules: Rule[];
    defaults: {
        workerRole: "mine" | "build_barracks";
        trainSoldier: boolean;
        armyMode: "attack" | "defend";
    };
};

export type TeamState = {
    minerals: number;
    intents: {
        workerRole: "mine" | "build_barracks";
        trainSoldier: boolean;
        armyMode: "attack" | "defend";
    };
};

export type Snapshot = {
    time: number;
    winner: Team | 'draw' | null;
    running: boolean;
    teams: {
        blue: { minerals: number };
        red: { minerals: number };
    };
    entities: Array<{
        id: string;
        team: EntityTeam;
        type: EntityType;
        pos: Vec2;
        hp: number;
        radius: number;
        state?: string;
        buildProgress?: number;
        buildSite?: Vec2;
        trainProgress?: number;
        carry?: number;
    }>;
};

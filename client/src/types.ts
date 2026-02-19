
export interface Vec2 {
    x: number;
    y: number;
}

export interface Entity {
    id: string;
    team: 'blue' | 'red' | 'neutral';
    type: 'core' | 'worker' | 'barracks' | 'soldier' | 'mineral';
    pos: Vec2;
    hp: number;
    radius: number;
    state?: string;
    buildProgress?: number;
    buildSite?: Vec2;
    trainProgress?: number;
    carry?: number;
}

export interface Snapshot {
    time: number;
    winner: 'blue' | 'red' | 'draw' | null;
    running: boolean;
    teams: {
        blue: { minerals: number };
        red: { minerals: number };
    };
    entities: Entity[];
}

export interface Policy {
    name: string;
    defaults: any;
    rules: any[];
}

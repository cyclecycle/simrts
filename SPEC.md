## POC Technical Spec: “Policy RTS” (Shapes-First, Web UI, 2-minute matches)

### Goal

A web app (Node.js server + browser client) where you:

1. Choose/edit policies for **Blue AI** and **Red AI**
2. Start a match
3. Watch an RTS-like top-down simulation (simple shapes) auto-execute
4. Match ends with a clear winner + replayable outcome

No manual unit control. Only policy edits before start (v1). (Optional v1.1: allow mid-game policy changes.)

---

# 1) Tech Stack

### Server

* **Node.js + Express**
* Serves static client + hosts **WebSocket** for real-time sim state.
* Owns the **authoritative simulation** (single source of truth).

### Client

* **TypeScript** (recommended) + Vite (or plain JS if you want fastest)
* Rendering: **HTML5 Canvas** (no engine required for v0)
* UI: simple HTML controls (or minimal React—optional)

### Transport

* **ws** WebSocket library (server) + native WebSocket (client)
* Messages: JSON (keep stable, versioned)

### Determinism

* Fixed timestep simulation: e.g. **20 ticks/sec**
* Server sends snapshots at **10 Hz** (every 2 ticks) or “delta” later.
* Client interpolates for smoothness (optional; can just render last snapshot).

---

# 2) Game World

### Map

* 2D rectangle, e.g. **1200×700 world units**
* Two bases at opposite sides:

  * Blue Core at (150, 350)
  * Red Core at (1050, 350)
* Mineral nodes (static circles), symmetric:

  * Blue node at (250, 250), (250, 450)
  * Red node at (950, 250), (950, 450)
* **Building slots (v0):** fixed, predefined barracks slot per team:

  * Blue barracks slot at (230, 350)
  * Red barracks slot at (970, 350)

### Entities

All entities have:

* `id`, `team`, `type`, `pos{x,y}`, `hp`, `radius`
* optionally `targetId`, `state`, `cooldowns`

**Core (Base)**

* HP: 200
* Radius: 30
* Doesn’t move/attack.

**Worker**

* Start: 1 per team
* HP: 35
* Radius: 8
* Speed: 60 units/sec
* Carry capacity: 10 minerals
* Mine rate: +1 mineral/sec while mining (or “mine 1 mineral per 0.5s”)
* Behavior driven by policy “intents”:

  * `mine`, `build(barracks)`, `idle`

**Barracks (Building)**

* Cost: 40 minerals
* Build time: 10s (progress tracked)
* HP: 120
* Radius: 22
* Can produce soldiers once complete.

**Soldier**

* Cost: 15 minerals
* Train time: 4s
* HP: 45
* Radius: 9
* Speed: 75 units/sec
* Attack:

  * Range: 20
  * DPS: 12 (e.g. 6 damage every 0.5s)
* Auto target selection (nearest enemy in range, else move to attack objective).

---

# 3) Economy + Production Rules

### Team State

Per team:

* `minerals: number`
* `supplyUsed`, `supplyCap` (optional; skip for v0)
* `queue` per barracks: training progress

### Mining

* Worker chooses a mineral node, moves to it, mines until full, returns to nearest “deposit point” (Core), deposits, repeats.
* Mineral nodes are infinite in v0 (no depletion).

### Building

* Worker can be assigned `buildBarracks`:

  * move to the team’s predefined barracks slot
  * spend minerals upfront at slot arrival; worker enters `building` state; build progress ticks while in that state
  * On completion, barracks becomes active.
* Building placement is intentionally **out of scope** for v0 (no freeform placement UI).

### Training

* Barracks can train 1 soldier at a time.
* If policy wants training and team has minerals, enqueue train if idle.

---

# 4) Combat + Movement

### Movement

* For v0: **steer directly toward target** (no obstacles besides bases/buildings)
* Collision: minimal; allow overlap or soft separation
* If you want quick readability: apply tiny repulsion when units overlap.

### Targeting

Each soldier tick:

1. If enemy within range: attack closest enemy
2. Else: move toward its current objective:

   * If “attack” mode: enemy core position
   * If “defend” mode: own core position (or a defend point)

### Damage + Death

* When HP <= 0: remove entity
* Win when enemy Core HP <= 0

---

# 5) Policy System

## 5.1 Policy format (v0)

Use a **tiny JSON DSL** so you don’t build a parser on day 1.

### Policy schema

```ts
type Condition =
  | { kind: "time_gte"; seconds: number }
  | { kind: "minerals_gte"; amount: number }
  | { kind: "has_building"; building: "barracks"; count_gte: number }
  | { kind: "unit_count_gte"; unit: "soldier" | "worker"; count: number };

type Action =
  | { kind: "set_worker_role"; role: "mine" | "build_barracks" }
  | { kind: "train_soldier"; enabled: boolean }
  | { kind: "set_army_mode"; mode: "attack" | "defend" };

type Rule = { if: Condition[]; then: Action[] };

type Policy = {
  name: string;
  rules: Rule[];
  defaults: {
    workerRole: "mine" | "build_barracks";
    trainSoldier: boolean;
    armyMode: "attack" | "defend";
  };
};
```

## 5.2 Policy evaluation

Every tick (or every 0.5s to reduce churn):

* Start with defaults
* For each rule in order:

  * If all conditions true: apply its actions (overriding current intents)
* Resulting “intents” update team/controller state:

  * `workerRole`
  * `trainSoldier`
  * `armyMode`

**Key:** You’re not issuing per-unit commands in policy. Policy sets *global team intent* (super simple, demonstrates the concept).

## 5.3 Built-in preset policies (ship with 3)

1. **Rush**

* build barracks ASAP, train, attack ASAP

2. **Greedy**

* mine until minerals >= 80, then barracks, then train, attack at t>=60

3. **Turtle**

* barracks, train, defend until t>=75 then attack

Example preset JSON (Greedy):

```json
{
  "name": "Greedy",
  "defaults": { "workerRole": "mine", "trainSoldier": false, "armyMode": "defend" },
  "rules": [
    { "if": [{ "kind": "minerals_gte", "amount": 40 }], "then": [{ "kind": "set_worker_role", "role": "build_barracks" }] },
    { "if": [{ "kind": "has_building", "building": "barracks", "count_gte": 1 }], "then": [{ "kind": "train_soldier", "enabled": true }] },
    { "if": [{ "kind": "time_gte", "seconds": 60 }], "then": [{ "kind": "set_army_mode", "mode": "attack" }] }
  ]
}
```

---

# 6) Simulation Architecture (Server-Authoritative)

### Main loop

* `tickRate = 20`
* Each tick:

  1. Advance `time += dt`
  2. For each team: evaluate policy -> update intents
  3. Execute economy intents:

     * worker AI (mine/build)
     * barracks training
  4. Execute soldier AI (move/attack)
  5. Apply damage, remove dead entities
  6. Check win condition
  7. If snapshot tick: broadcast `STATE_SNAPSHOT`

### State model

Keep server state as plain JS objects:

```ts
type Vec2 = { x: number; y: number };

type Entity = {
  id: string;
  team: "blue" | "red";
  type: "core" | "worker" | "barracks" | "soldier" | "mineral";
  pos: Vec2;
  hp: number;
  radius: number;
  // optional:
  buildProgress?: number;
  trainProgress?: number;
  carry?: number;
  state?: string;
  targetId?: string | null;
};
```

### Snapshot payload

Send only what client needs to render:

* `time`
* per-team minerals
* list of entities (id, team, type, pos, hp, radius, state-ish)
* match status (running/ended, winner)

---

# 7) Networking Protocol (WebSocket)

### Client → Server

* `START_MATCH` with `bluePolicy`, `redPolicy`, optional `seed`
* `RESET`
* (optional v1.1) `UPDATE_POLICY` mid-game

### Server → Client

* `MATCH_STARTED` (initial state)
* `STATE_SNAPSHOT` (regular updates)
* `MATCH_ENDED` (winner, duration, summary stats)

---

# 8) Client Rendering + UI

## 8.1 Canvas renderer

* Draw map background (dark)
* Draw minerals as cyan circles
* Draw cores as big circles with HP bar
* Draw barracks as rectangles
* Draw workers as small circles
* Draw soldiers as triangles/chevrons
* Draw projectiles as small dots/lines (optional)

### Visual clarity requirements

* Health bars above units/buildings
* Team colors: Blue vs Red
* Basic text HUD: time, minerals, unit counts
* Draw visible build-slot markers so observers can see intended construction location.
* Show entity state labels/progress (e.g., `to_build_slot`, `building`, train progress) for debugging readability.

## 8.2 UI controls

Left panel:

* Blue policy dropdown (Rush/Greedy/Turtle/Custom)
* Textarea showing JSON for policy (editable)
* “Validate” (client-side JSON schema check, minimal)

Right panel:

* Same for Red

Top:

* “Start Match”
* “Reset”
* Speed: 1× / 2× / 4× (client-side render speed only OR server tick multiplier; easiest is server tick multiplier)

Bottom:

* Winner display + match summary (soldiers built, time to first barracks, etc.—optional)

Inspector:

* Click any entity in the canvas to inspect details (id, team, type, hp, state, position, progress values).

---

# 9) Validation + Safety

### Policy validation

On `START_MATCH`, server:

* JSON parse
* Validate shape (light checks)
* Enforce limits:

  * max rules: 20
  * max conditions per rule: 5
  * max actions per rule: 5
* Reject invalid with `ERROR` message

### Rate limiting

* Only allow start/reset occasionally (not needed in local dev but easy guard)

---

# 10) “Definition of Done” (v0)

You can:

1. Open `localhost:<port>`
2. Pick policies for both sides
3. Click Start
4. Watch autonomous simulation
5. Observe workers path to fixed barracks slots and complete barracks construction when policy triggers build intent
6. One base dies within ~120 seconds (or timeout winner/draw by HP comparison)
7. Click entities to inspect state/details during live simulation
8. UI shows winner and final stats
9. Reset and run again with different policies

---

# 11) Suggested Repo Structure

```
poc-policy-rts/
  server/
    src/
      index.ts (express + ws)
      sim/
        sim.ts (loop, tick)
        entities.ts
        ai_worker.ts
        ai_soldier.ts
        policy.ts (eval)
        presets.ts
        config.ts
  client/
    src/
      main.ts
      net.ts
      render.ts
      ui.ts
      presets.ts (mirrors)
    index.html
```

---

# 12) Implementation Notes (to keep it fast)

* Skip fog of war, scouting, multiple workers, supply caps for v0.
* Keep unit AI dumb but consistent.
* Make match length reliable by tuning:

  * soldier DPS
  * core HP
  * mining income
  * barracks + train times

A good first tuning target:

* First barracks finishes around 20–30s
* First soldier hits mid-map around 35–45s
* Decisive fight around 70–110s

---

# 13) Optional v1.1 Enhancements (if you finish early)

* Allow mid-game `UPDATE_POLICY` with a “token budget”:

  * Each rule edit costs tokens
  * Only N edits allowed
* Add a simple “replay” by storing snapshots server-side for the last match
* Add a tiny random jitter seed (small variance in unit decisions)

---

If you want, I can also give you:

* a concrete **config table** (exact numbers tuned to hit ~2 minutes)
* the **exact websocket message JSON** for each type
* and a minimal “policy evaluator” implementation outline that’s hard to mess up.

# ARCANE ENGINE
## Product Requirements Document — Version 2
### Target: Multiplayer First-Person Shooter
Version 2.0 • March 2026

---

## 1. Overview

This document extends the original Arcane Engine PRD (v0.1) beyond the Stage 6 MVP.

**Stages 1–11** of the V2 FPS track are **complete** in the repo (through HUD + `GameState` in `fps-test`). **Stage 12** remains to reach a functional multiplayer first-person shooter in the browser.

### 1.1 V1 Recap (Stages 1–7, all complete)

| Stage | Name | Deliverable |
|-------|------|-------------|
| 1 | ECS Core | World, entity CRUD, query, systems, bitmask optimization |
| 2 | Renderer | Three.js wrapper, game loop, render system |
| 3 | Input | Keyboard + mouse, WASD movement, third-person orbit camera |
| 4 | Scene System | File-based scene discovery, scene manager, lifecycle |
| 5 | CLI Scaffolder | `npx create-arcane`, starter template |
| 6 | Hello Cube Demo | Polished demo, JSDoc, onboarding docs |
| 7 | Physics | Rapier WASM, rigid bodies, box colliders, gravity simulation |

### 1.2 V2 Goal

A functional multiplayer FPS in the browser:

- First-person camera with pointer lock
- WASD movement relative to look direction
- Walk on floors and collide with walls (no clipping)
- Left click fires a hitscan shot
- Entities have health and die when shot
- A minimal HUD: crosshair, health, kill count
- Two to four players connected via WebSocket, able to see and shoot each other

### 1.3 What V2 Deliberately Excludes

- Asset pipeline / GLTF loading (use procedural geometry only)
- Audio
- Weapon variety (one hitscan weapon is enough)
- Anticheat (server trust is fine for a prototype)
- Mobile or gamepad input
- Persistent accounts, matchmaking, lobbies beyond 4 players

---

## 2. Architecture Changes from V1

### 2.1 New packages

| Package | Purpose |
|---------|---------|
| `packages/physics` | Rapier physics — Stage 7 base + Stage 7b (kinematic, `raycast`) + Stage 9 (`CharacterController`) |
| `packages/server` | Minimal WebSocket server for multiplayer — added in Stage 12 |

### 2.2 New dependency graph

```
core
├── renderer   (depends on core)
├── input      (depends on core, renderer)
├── physics    (depends on core, renderer)
└── server     (depends on core — Node.js only, no browser imports)

hello-cube example
└── depends on core, renderer, input, physics
```

### 2.3 Per-frame data flow (V2 target)

1. Input system → reads keyboard + pointer lock mouse delta and mouse buttons into `InputState`
2. Hit flash restore (Stage 10) → restores materials for one-frame hit feedback; runs before weapon/health in `fps-test`
3. Physics system → steps Rapier, creates bodies, syncs dynamic body transforms to ECS
4. Character controller system → applies WASD + gravity via Rapier kinematic body
5. FPS camera system → positions camera at player eye level, applies yaw/pitch
6. Weapon system → on fire input, casts ray, writes `Damage` to hit entity
7. Health system → processes `Damage`, destroys non-player entities at 0 hp; clamps player HP and sets `GameState.phase`; increments `GameState.kills` for `ShootableTarget` destroys
8. Network sync system (Stage 12) → sends local position to server, receives + applies remote positions
9. Render system → syncs ECS transforms to Three.js, submits draw call

---

## 3. Stage 7b — Physics Extension

**Status:** ✅ Complete.

### Goal

Extend `@arcane-engine/physics` with a kinematic body type and a raycast API. No other packages change.

### Why

The current physics package supports `fixed` and `dynamic` bodies. An FPS character needs a `kinematic` body — moved by code, not gravity, but still collides with the world. Hitscan shooting needs a point-to-point raycast.

### Deliverables

**Kinematic body type**

Add `'kinematic'` to `RigidBody`:

```ts
RigidBody: {
  type: 'fixed' | 'dynamic' | 'kinematic';
}
```

A kinematic body is created with `RigidBodyDesc.kinematicPositionBased()` in Rapier. It is moved by setting its next translation each frame, not by forces.

**Raycast API**

```ts
raycast(
  ctx: PhysicsContext,
  origin: { x: number; y: number; z: number },
  direction: { x: number; y: number; z: number },
  maxDistance: number,
): RaycastHit | null

interface RaycastHit {
  colliderHandle: number;
  point: { x: number; y: number; z: number };
  normal: { x: number; y: number; z: number };
  distance: number;
}
```

`raycast` is a pure function — not a system. It is called imperatively (e.g. inside `weaponSystem` on fire input).

### Constraints

- All existing physics tests must continue to pass
- `raycast` has Vitest coverage
- Kinematic body creation is tested alongside fixed/dynamic in `physicsSystem` tests

---

## 4. Stage 8 — First-Person Camera + Pointer Lock

**Status:** ✅ Complete. (Depends on Stage 7b — satisfied.)

### Goal

The player sees through a first-person camera. Clicking the canvas captures the mouse (pointer lock). Mouse movement rotates the view. WASD moves relative to the look direction.

### Deliverables

**Pointer lock**

Wire `document.pointerLockElement` into `createInputManager`. When the canvas is clicked, request pointer lock. `mouse.dx` / `mouse.dy` in `InputState` come from `event.movementX/Y` while locked.

**`FPSCamera` component**

```ts
FPSCamera: {
  yaw: number;    // horizontal rotation (radians)
  pitch: number;  // vertical rotation (radians), clamped ±85°
  height: number; // eye offset above entity position (default 1.6)
}
```

**`fpsCameraSystem(ctx)`**

Replaces `cameraFollowSystem` for FPS scenes. Reads `InputState.mouse.dx/dy`, updates `FPSCamera.yaw/pitch`, then positions `ctx.camera` at `Position + (0, height, 0)` and applies yaw/pitch as Euler rotation. Clears `mouse.dx/dy` after consuming them (same pattern as existing `cameraFollowSystem`).

**Direction-relative movement**

Update or replace `movementSystem` for FPS use: WASD moves along the yaw direction, not world axes. W = forward along yaw, A/D = strafe, no movement on Y.

**Jump**

Spacebar applies an upward velocity to the character body. Handled in the character controller system (Stage 9), but the input binding is set up here.

### Acceptance criteria

- Canvas click captures mouse; Escape releases it
- Mouse left/right rotates view horizontally with no drift
- Mouse up/down rotates view vertically, clamped — no over-rotation
- WASD moves in the direction the camera faces
- `fpsCameraSystem` and `FPSCamera` component are in `@arcane-engine/input`
- All new public functions have Vitest coverage and JSDoc

---

## 5. Stage 9 — Character Controller + Simple Map

**Status:** ✅ Complete. (Depends on Stages 7b and 8 — satisfied.)

**Implementation notes (as shipped):** `CharacterController` includes an internal `_velocityY` field for gravity integration across ticks. Direction-relative movement and jump are handled in `characterControllerSystem` (not `fpsMovementSystem`). The map uses the specified room layout with half-extent colliders; scene entry from title is **F** (`fps-test`).

### Goal

The player cannot fall through the floor or walk through walls. A minimal level exists to navigate.

### Deliverables

**`CharacterController` component**

```ts
CharacterController: {
  speed: number;       // m/s horizontal (default 5)
  jumpSpeed: number;   // m/s vertical (default 6)
  grounded: boolean;   // written by characterControllerSystem
}
```

**`characterControllerSystem(physCtx)`**

System factory. Each tick:

1. Reads `InputState` and `FPSCamera.yaw` to compute a desired velocity vector
2. Applies gravity accumulation (if not grounded)
3. Calls Rapier's `KinematicCharacterController.computeColliderMovement` to resolve movement against scene colliders
4. Sets the kinematic body's next translation
5. Writes `CharacterController.grounded` based on Rapier's `computedGrounded()`

**Simple map scene**

A new `scenes/fps-test.ts` in `examples/hello-cube`:

- Floor (fixed, `BoxCollider` 20×0.5×20)
- Four walls enclosing a 20×6×20 room
- A few internal box obstacles at varying heights to jump over
- Player entity spawned at `(0, 2, 0)` with `CharacterController`, `FPSCamera`, `RigidBody(kinematic)`, `BoxCollider(0.4, 0.9, 0.4)`

**`CharacterController` lives in `@arcane-engine/physics`** (it depends on Rapier internals).

### Acceptance criteria

- Player walks around the room with no clipping through floor or walls
- Jumping works and the player lands correctly
- Character does not slide infinitely on flat surfaces
- All new components and the system factory have Vitest coverage

---

## 6. Stage 10 — Weapons + Hitscan

**Status:** ✅ Complete. Depends on Stages 7b and 9 (both satisfied).

**Implementation notes (as shipped):** `InputState` includes **`mouseButtons: Set<number>`** (`0` = left), updated in **`createInputManager`** via `mousedown` / `mouseup`. Combat lives in **`examples/hello-cube`**: **`Health`**, **`Damage`**, **`HitFlash`** components; **`weaponSystem`**, **`healthSystem`**, **`hitFlashRestoreSystem`**; **`findEntityByColliderHandle`** maps **`raycast`** collider handles to ECS entities via **`RapierBodyRef`**. **`fps-test`** registers systems in order: hit flash restore → physics → character → FPS camera → weapon → health → render; includes shootable targets, muzzle flash (~80 ms DOM overlay), and one-frame white **MeshStandardMaterial** hit flash.

### Goal

Left click fires. A raycast detects the hit. Entities with health take damage and are destroyed at zero hp.

### Deliverables

**`Health` component** (in `@arcane-engine/core` exports or a new `packages/gameplay` — decision: keep in the example for now, promote later)

```ts
Health: {
  current: number;
  max: number;
}
```

**`Damage` component (event-style)**

```ts
Damage: {
  amount: number;
}
```

Added to an entity when it is hit. Consumed and removed by `healthSystem` on the same tick.

**`weaponSystem(physCtx)`**

System factory. On left mouse button press (tracked via `InputState`):

1. Gets player `Position` + `FPSCamera` yaw/pitch
2. Computes ray direction from yaw/pitch
3. Calls `raycast(physCtx, origin, direction, 100)`
4. If hit: looks up the ECS entity by collider handle, adds `Damage` component

**`healthSystem`**

Pure system. Queries `[Health, Damage]`. Subtracts `Damage.amount` from `Health.current`, removes the `Damage` component. If `Health.current <= 0`, calls `destroyEntity` and removes the mesh from the Three.js scene.

**Target entities**

The fps-test scene spawns 6–8 colored box targets with `Health(3)`, `RigidBody(fixed)`, `BoxCollider`, and a mesh. Shooting them three times destroys them.

**Visual feedback**

- Muzzle flash: a brief white overlay div, 80ms, opacity transition
- Hit flash: the hit mesh material briefly changes to white (one frame)

**Mouse button tracking**

Extend `InputState` to track `mouseButtons: Set<number>` (0 = left). Wire `mousedown`/`mouseup` in `createInputManager`.

### Acceptance criteria

- Left click fires exactly once per click (not held auto-fire yet)
- Raycast correctly identifies the hit target
- Targets take damage and disappear after 3 hits
- No errors when shooting at walls (no entity attached to static colliders)
- `weaponSystem`, `healthSystem`, `Health`, `Damage` all have Vitest coverage

---

## 7. Stage 11 — HUD + Game State

**Status:** ✅ Complete. Depends on Stage 10 (complete).

### Goal

A minimal HUD visible during play. A win/lose state with a respawn path.

### Deliverables

**HUD (plain DOM, not Three.js)**

A single `<div id="arcane-hud">` injected over the canvas:

- Crosshair: a small CSS cross at the viewport center
- Health bar: current/max rendered as a colored bar, bottom-left
- Kill counter: top-right, increments on each target destroyed

**`GameState` component (singleton entity)**

```ts
GameState: {
  kills: number;
  playerHp: number;
  phase: 'playing' | 'dead' | 'win';
}
```

**`gameStateSystem`**

Watches `GameState.phase`. On `'dead'`: shows a "You died — press R to respawn" overlay. On `'win'` (all targets dead): shows a "You win" overlay. On R press during dead phase: respawns player at starting position with full health.

**HUD update**

`gameStateSystem` also syncs `kills` and `playerHp` to the DOM each tick (direct `textContent` writes — no virtual DOM).

**Player takes damage**

Extend `weaponSystem` so that if the ray hits the player entity (multiplayer Stage 12), the player's `Health` is also reduced. For Stage 11, player hp only decreases via a test mechanism (a damage zone on the floor is fine).

### Acceptance criteria

- Crosshair is always centered, visible, and does not interfere with pointer lock
- Health bar updates in real time
- Kill count increments correctly
- Death overlay appears, R key respawns the player
- Win condition fires when all targets are destroyed
- HUD elements are created in `setup` and removed in `teardown`

---

## 8. Stage 12 — Multiplayer

**Status:** **Next.** Stages 8–11 are complete in the repo (including HUD / `GameState` in `fps-test`).

### Goal

Two to four players connect via WebSocket, see each other move as ghost meshes, and can shoot each other.

### 8.1 Server

**New package: `packages/server`**

A minimal Node.js WebSocket server. No framework — plain `ws` package.

```
packages/server/
├── package.json        (Node, CommonJS or ESM, ws dependency)
├── src/
│   └── server.ts       (< 120 lines)
└── README.md
```

**Server responsibilities:**

- Accept up to 4 connections; reject beyond that
- Assign each client a unique `playerId` (UUID or incrementing integer)
- On connect: send `{ type: 'welcome', playerId, existingPlayers: [...] }`
- Relay `{ type: 'move', playerId, position, yaw }` to all other clients
- Relay `{ type: 'shoot', playerId, origin, direction }` to all other clients
- On disconnect: broadcast `{ type: 'leave', playerId }` to remaining clients
- No game logic on the server — pure relay

**Run with:** `node dist/server.js` or `tsx src/server.ts`

### 8.2 Client

**`NetworkState` component (singleton entity)**

```ts
NetworkState: {
  localPlayerId: string;
  connected: boolean;
  latencyMs: number;
}
```

**`networkSyncSystem(socket)`**

System factory. Receives a `WebSocket` instance.

Each tick:
- Sends `{ type: 'move', position, yaw }` for the local player (throttled to every 2 ticks = 30hz)

On incoming message:
- `'welcome'`: stores `localPlayerId`, spawns ghost entities for `existingPlayers`
- `'move'`: finds or spawns the ghost entity for `playerId`, updates its `Position` and `Rotation`
- `'shoot'`: runs a local raycast for the remote shot, applies `Damage` if it hits the local player
- `'leave'`: destroys the ghost entity for `playerId`

**Ghost entities**

Remote players are spawned as a simple capsule or box mesh with `Position`, `Rotation`, and a `RemotePlayer` tag component. No physics on ghost entities — position is set directly from network messages.

```ts
RemotePlayer: {
  playerId: string;
}
```

**Connection setup**

The multiplayer scene (`scenes/multiplayer.ts`) creates the `WebSocket`, waits for `'welcome'`, then registers `networkSyncSystem(socket)` and starts the game.

### 8.3 Multiplayer scene

`scenes/multiplayer.ts` in `hello-cube`:

- Same geometry as the fps-test scene (or reuse it)
- Spawns the local player with full FPS kit (CharacterController, FPSCamera, Health, weapon)
- Registers: characterControllerSystem, fpsCameraSystem, weaponSystem, healthSystem, networkSyncSystem, renderSystem
- Accessible from title screen: **M key**

### Acceptance criteria

- Two browser tabs (or two machines on the same network) connect to the server
- Each player sees the other's ghost mesh move in real time
- Shooting a ghost mesh reduces that player's health and is confirmed via server relay
- Disconnect is handled gracefully — ghost entity is removed
- Server prints connected player count to stdout

---

## 9. Revised Full Stage List

| Stage | Name | Status | Key addition |
|-------|------|--------|-------------|
| 1 | ECS Core | ✅ done | World, entity, component, query, systems |
| 2 | Renderer | ✅ done | Three.js wrapper, game loop, render system |
| 3 | Input | ✅ done | Keyboard + mouse, WASD, orbit camera |
| 4 | Scene System | ✅ done | File-based scenes, scene manager |
| 5 | CLI Scaffolder | ✅ done | `npx create-arcane` |
| 6 | Hello Cube Demo | ✅ done | Polished demo, JSDoc, docs |
| 7 | Physics (base) | ✅ done | Rapier bodies, box colliders, gravity |
| 7b | Physics Extension | ✅ done | Kinematic body, raycast API |
| 8 | FPS Camera + Pointer Lock | ✅ done | FPS look, direction-relative move (`fpsMovementSystem`), pointer lock |
| 9 | Character Controller + Map | ✅ done | Kinematic CC, `fps-test` scene, walls/floor/jump |
| 10 | Weapons + Hitscan | ✅ done | Hitscan, example `Health` / `Damage`, `mouseButtons`, targets |
| 11 | HUD + Game State | ✅ done | `#arcane-hud`, `GameState`, kills, death/win, R respawn, damage zone |
| 12 | Multiplayer | 🔲 **next** | WebSocket, ghost players, shoot sync |

---

## 10. Agent Workflow Notes

Stages **7b through 11** are complete. **Stage 12** (multiplayer) is the next bounded session-sized chunk.

Stage 12 (server) can be started in a Codex sandbox in parallel with other work, since the server package has no browser dependencies.

Codex is well-suited for:
- Stage 12 server (small, self-contained Node.js file)

Claude Code is well-suited for:
- Stage 12 client (ghost entities, `networkSyncSystem`, scene registration)

**Handoff for the next session:** [`PROMPT.md`](./PROMPT.md) (Stage 12).  
**Archived Stage 11 prompt:** [`CURSOR_STAGE11_PROMPT.md`](./CURSOR_STAGE11_PROMPT.md).

---

## 11. Definition of Done (V2)

V2 is complete when:

- `pnpm test`, `pnpm typecheck`, and `pnpm build` pass from the repo root
- A player can open `http://localhost:5173`, press M, connect to a local WebSocket server, walk around a room in first person, and shoot another player in a second tab
- All new public APIs have JSDoc and Vitest coverage
- `README.md`, `AGENTS.md`, and `CLAUDE.md` stage references are updated to reflect V2 complete (Stage 12)

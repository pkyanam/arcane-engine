# ARCANE ENGINE
## Product Requirements Document — Version 4
### Target: Gameplay-Ready Browser Game Framework
Version 4.0 • April 2026 • Proposed roadmap after V3.0

---

## 1. Overview

This document proposes the V4 roadmap for Arcane Engine after the completed V3 asset-ready track.

**Stages 1–23 are complete in the repo.** Arcane Engine now has:

- core ECS (world, entities, components, queries, systems, scenes, game loop)
- Three.js renderer (transforms, lighting, shadows, environment)
- input (keyboard, mouse, pointer lock, FPS look, touch)
- scene system (file-based scenes, manager, lifecycle, preload seam)
- physics (Rapier WASM — rigid bodies, colliders, kinematic bodies, character controller, raycast)
- asset pipeline (textures, glTF/GLB models, animation playback, cache, preload manifests)
- multiplayer relay (WebSocket server, ghost sync, smoothing)
- CLI scaffolder (`create-arcane` with `starter` and `asset-ready` templates)
- hello-cube teaching example (FPS, combat, HUD, multiplayer, touch, imported assets)

### 1.1 What V4 Is For

V3 proved Arcane Engine can load and render real assets. V4 proves it can **power real gameplay**.

The goal is to upgrade Arcane Engine from an asset-ready framework into a **gameplay-ready framework** — one where a developer (or coding agent) can build a complete, polished browser game without inventing core gameplay infrastructure from scratch.

### 1.2 V4 Reference Design: Shardline

To ground V4 in real requirements rather than abstract feature lists, this PRD uses a reference game concept:

> **Shardline: Sanctum Breach** — A short, replayable first-person sci-fi fantasy infiltration game. The player enters a sealed facility, restarts three shard reactors, fights defensive constructs, and extracts before collapse. 8–15 minute sessions, scored runs, stylized low-poly aesthetic.

Shardline is **not** a V4 deliverable. It is a design lens. Every V4 engine feature must be justifiable by what Shardline (or a game like it) would need. If a feature only serves Shardline and no other plausible game, it does not belong in the engine.

### 1.3 V4 Product Thesis

If V3 proved Arcane Engine can be both **readable** and **asset-capable**, V4 should prove it can be **gameplay-capable** without losing its identity as a small, strict-TypeScript, agent-friendly framework.

After V4, a developer should be able to scaffold a project and have immediate access to:

- spatial audio and music
- trigger volumes and interaction prompts
- AI behaviors for NPCs and enemies
- particle and visual effects
- post-processing (bloom, screen effects)
- timers, scoring, and local persistence
- a clean UI/HUD toolkit
- promoted gameplay primitives (health, damage, game state)

### 1.4 What V4 Deliberately Excludes

Do not build by default:

- a visual editor or inspector
- procedural world generation
- full dialogue or narrative systems
- inventory management or crafting
- stealth simulation (line-of-sight is an AI primitive, not a stealth game)
- authoritative multiplayer servers, rollback netcode, or matchmaking
- persistent accounts or backend services
- WebGPU renderer
- mobile-first product scope (touch remains an optional fallback)
- advanced terrain, voxel systems, or world streaming
- a plugin marketplace or third-party extension system
- blend trees, animation retargeting, or animation graph editors

### 1.5 Agent-Driven Development

V4 is designed for development by AI coding agents (Claude Code, Codex, Cursor). Every stage:

- has a single clear goal
- lists concrete deliverables with API shapes
- defines acceptance criteria that an agent can verify
- fits within one focused work session
- ends with code, tests, and updated docs
- documents explicit non-goals so agents do not over-build

---

## 2. Baseline Entering V4

### 2.1 V1 + V2 + V3 Recap

| Era | Stages | Status | What It Proved |
|-----|--------|--------|----------------|
| V1 | 1–7 | ✅ complete | ECS, renderer, input, scenes, CLI, demo, physics |
| V2 | 7b–12 | ✅ complete | FPS controls, hitscan combat, HUD, multiplayer relay |
| V3 | 13–23 | ✅ complete | Asset pipeline, animation, preload, polish, templates |

### 2.2 Current Package Map

| Package | Owns |
|---------|------|
| `@arcane-engine/core` | ECS world, queries, systems, scene manager, game loop |
| `@arcane-engine/renderer` | Three.js setup, transforms, lighting, shadows, render system |
| `@arcane-engine/assets` | textures, models, animation playback, preload, cache, disposal |
| `@arcane-engine/input` | keyboard, mouse, pointer lock, FPS camera, movement, touch |
| `@arcane-engine/physics` | Rapier world, rigid bodies, colliders, character controller, raycast |
| `@arcane-engine/server` | WebSocket relay (Node.js, no game logic) |
| `@arcane-engine/create-arcane` | CLI scaffolder, templates |

### 2.3 Current Gaps V4 Must Address

| Gap | Impact |
|-----|--------|
| No audio at all | Games feel lifeless without sound |
| No trigger/interaction system | Every game reinvents proximity checks and "press E" |
| No AI/NPC primitives | Enemy behavior requires building state machines from scratch |
| No particle or VFX system | Visual feedback limited to mesh swaps and DOM overlays |
| No post-processing | Emissive materials, damage effects, and atmosphere need bloom/vignette |
| No timer or scoring framework | Every game reinvents countdowns, stats, and result screens |
| No local persistence | Best scores, settings, and progress vanish on refresh |
| HUD is raw DOM only | No structured approach to game UI, prompts, or overlays |
| Gameplay primitives are example-local | Health, Damage, GameState stuck in hello-cube |
| No interaction or activation pattern | Objectives, doors, switches need a standard approach |

---

## 3. V4 Architecture Direction

### 3.1 New Packages

| Package | Purpose |
|---------|---------|
| `packages/audio` | Web Audio API integration, spatial sound, SFX, music, mixer |
| `packages/gameplay` | Promoted gameplay primitives: health, damage, game state, triggers, interaction, timers, scoring |
| `packages/vfx` | Particle emitters, billboard sprites, screen flash, tracer effects |
| `packages/postprocessing` | Three.js EffectComposer wrapper: bloom, vignette, custom passes |
| `packages/ui` | Structured game UI: HUD elements, prompt system, overlay manager, screen transitions |

### 3.2 Updated Dependency Graph

```text
core
├── renderer        (depends on core)
├── input           (depends on core, renderer)
├── physics         (depends on core, renderer)
├── assets          (depends on core, renderer)
├── audio           (depends on core, renderer)
├── gameplay        (depends on core; optional deps on physics, renderer)
├── vfx             (depends on core, renderer)
├── postprocessing  (depends on renderer)
├── ui              (depends on core)
└── server          (Node-only relay, depends on core)

templates/starter         → core, renderer, input
templates/asset-ready     → core, renderer, input, assets
templates/gameplay-ready  → core, renderer, input, assets, audio, gameplay, vfx, postprocessing, ui
examples/hello-cube       → all packages
```

### 3.3 Design Constraints for V4

- every new package follows the same conventions: strict TypeScript, `defineComponent()` for components, `(world, dt)` for systems
- new packages must be **opt-in** — importing `@arcane-engine/audio` should not affect apps that do not use audio
- prefer thin wrappers around browser APIs (Web Audio, DOM) and Three.js utilities (EffectComposer, particle geometry) over custom engines
- APIs must be explicit enough for a coding agent to use from docs alone
- every new public function must have Vitest coverage and JSDoc
- keep packages independently useful — `gameplay` should work without `audio`, `vfx` should work without `gameplay`

---

## 4. Stage 24 — Gameplay Package: Core Primitives

**Status:** Proposed.

### Goal

Promote the most proven gameplay primitives out of `examples/hello-cube` into `@arcane-engine/gameplay` so every Arcane Engine game starts with health, damage, and game state instead of copy-pasting from the example.

### Why

`Health`, `Damage`, and `GameState` have been stable and unchanged across V2 and V3. They are generic enough for any action game. Keeping them example-local forces every new project to copy boilerplate.

### Deliverables

**New package:** `packages/gameplay`

**Promoted components:**

```ts
// Health pool for any damageable entity
const Health = defineComponent('Health', () => ({
  current: number,
  max: number,
}));

// Event-style damage — added to entity, consumed same tick
const Damage = defineComponent('Damage', () => ({
  amount: number,
  source: Entity | null,  // optional: who dealt the damage
}));

// Singleton game state tracking
const GameState = defineComponent('GameState', () => ({
  phase: 'playing' | 'paused' | 'dead' | 'win' | 'custom',
  customPhase: string,     // for game-specific states
  kills: number,
  score: number,
  elapsedTime: number,     // seconds since mission start
}));

// Tag for entities that should count toward kill tracking
const Hostile = defineComponent('Hostile', () => ({
  scoreValue: number,
}));
```

**Promoted systems:**

```ts
// Processes Damage components, updates Health, destroys at 0 hp
healthSystem(world: World, dt: number): void

// Updates GameState.elapsedTime, checks phase transitions
gameStateSystem(world: World, dt: number): void
```

**New primitives:**

```ts
// Tag for player entity (singleton query helper)
const Player = defineComponent('Player', () => ({}));

// Generic "is dead" marker, added by healthSystem at 0 hp
const Dead = defineComponent('Dead', () => ({
  killedBy: Entity | null,
}));

// Spawn point definition
const SpawnPoint = defineComponent('SpawnPoint', () => ({
  id: string,
  x: number,
  y: number,
  z: number,
  yaw: number,
}));
```

**Utility functions:**

```ts
// Apply damage to an entity (adds Damage component)
dealDamage(world: World, target: Entity, amount: number, source?: Entity): void

// Respawn entity at a named spawn point, reset health
respawn(world: World, entity: Entity, spawnId?: string): void

// Query helper: get the singleton GameState
getGameState(world: World): GameState | null

// Query helper: get the Player entity
getPlayer(world: World): Entity | null
```

### Migration Path

- `hello-cube` should import from `@arcane-engine/gameplay` instead of local component files
- existing example-local `Health`, `Damage`, `GameState`, `ShootableTarget` files become thin re-exports or are removed
- the example's `healthSystem` and `gameStateSystem` are replaced by the package versions

### Acceptance Criteria

- `@arcane-engine/gameplay` is a working package with its own `package.json`, `tsconfig.json`, and README
- all promoted components and systems have Vitest coverage
- `hello-cube` imports from the package instead of local copies
- `pnpm test`, `pnpm typecheck`, and `pnpm build` pass from repo root
- package README explains each primitive with a concrete example

### Agent Notes

- read `examples/hello-cube/src/components/` and `examples/hello-cube/src/healthSystem.ts` and `examples/hello-cube/src/gameStateSystem.ts` before writing
- do not invent new gameplay patterns — only promote what already works
- keep `hello-cube`-specific behavior (muzzle flash, HUD DOM updates, multiplayer sync) in the example
- `ShootableTarget` becomes `Hostile` with a `scoreValue` field for generality

---

## 5. Stage 25 — Trigger Volume System

**Status:** Proposed.

### Goal

Give the engine a standard way to detect when entities enter, stay in, or leave spatial regions. This replaces ad hoc distance checks and provides the foundation for interactions, damage zones, objectives, and AI alert ranges.

### Why

Nearly every game needs proximity detection: damage zones, pickup ranges, objective areas, door triggers, NPC interaction ranges, alert radii. Without a standard system, every game reinvents these with scattered `Math.hypot` checks.

### Reference Design Need

Shardline needs: reactor activation zones, extraction zones, hazard damage fields, sentry alert radii.

### Deliverables

**Lives in:** `@arcane-engine/physics` (trigger volumes are Rapier sensors)

**Components:**

```ts
// Marks a collider as a sensor (non-blocking trigger)
const TriggerVolume = defineComponent('TriggerVolume', () => ({
  shape: 'box' | 'sphere',
  // box half-extents or sphere radius
  halfExtents: { x: number, y: number, z: number },
  radius: number,
  // event tracking
  entities: Set<Entity>,        // currently inside
  entered: Set<Entity>,         // entered this tick
  exited: Set<Entity>,          // exited this tick
}));

// Optional: filter which entities can trigger this volume
const TriggerFilter = defineComponent('TriggerFilter', () => ({
  requireTags: string[],        // entity must have all of these components
  ignoreTags: string[],         // entity must not have any of these
}));
```

**System:**

```ts
// Reads Rapier sensor events, updates TriggerVolume enter/stay/exit sets
// Must run after physicsSystem
triggerVolumeSystem(physCtx: PhysicsContext): SystemFn
```

**Utility functions:**

```ts
// Create a trigger volume entity at a position
spawnTriggerVolume(world: World, physCtx: PhysicsContext, options: {
  position: { x: number, y: number, z: number },
  shape: 'box' | 'sphere',
  halfExtents?: { x: number, y: number, z: number },
  radius?: number,
}): Entity

// Check if a specific entity is inside a trigger
isInsideTrigger(world: World, triggerEntity: Entity, testEntity: Entity): boolean

// Get all entities currently inside a trigger
getEntitiesInTrigger(world: World, triggerEntity: Entity): Entity[]
```

### Acceptance Criteria

- trigger volumes detect entry, presence, and exit of entities with Position + collider
- triggers do not block movement (Rapier sensor colliders)
- enter/exit events are accurate for one tick (not sticky or duplicated)
- works with both dynamic and kinematic bodies
- all new APIs have Vitest coverage and JSDoc
- `pnpm test`, `pnpm typecheck`, and `pnpm build` pass
- package README documents the trigger workflow with a concrete example

### Agent Notes

- Rapier supports sensor colliders natively — use `ColliderDesc.sensor(true)` rather than inventing overlap tests
- read `packages/physics/src/` to understand the existing Rapier integration before adding
- `triggerVolumeSystem` should consume Rapier's intersection events, not poll distances
- clear `entered` and `exited` sets at the start of each tick

---

## 6. Stage 26 — Interaction System

**Status:** Proposed. Depends on Stage 25 (trigger volumes).

### Goal

Give the engine a standard "press E to interact" pattern for activatable objects — doors, switches, terminals, objectives, pickups.

### Why

Activation prompts are needed in virtually every first-person or third-person game. Without an engine-level pattern, every game builds its own prompt overlay and key binding.

### Reference Design Need

Shardline needs: reactor activation, extraction door interaction, potential pickup items.

### Deliverables

**Lives in:** `@arcane-engine/gameplay`

**Components:**

```ts
// Marks an entity as interactable
const Interactable = defineComponent('Interactable', () => ({
  promptText: string,           // "Press E to activate"
  interactionRange: number,     // meters (used if no TriggerVolume)
  enabled: boolean,             // can be disabled after use
  requiresFacing: boolean,      // must be looking at it
  cooldown: number,             // seconds between activations (0 = one-shot)
  lastActivatedAt: number,      // timestamp of last activation
}));

// Event-style: added to interactable entity when activated, consumed same tick
const Activated = defineComponent('Activated', () => ({
  activatedBy: Entity,
}));

// Tag: marks entity as within interaction range and facing (if required)
const InInteractionRange = defineComponent('InInteractionRange', () => ({
  interactableEntity: Entity,
  distance: number,
}));
```

**System:**

```ts
// Checks player proximity to Interactable entities, manages InInteractionRange,
// listens for interaction input, adds Activated component on activation
interactionSystem(world: World, dt: number): void
```

**Utility functions:**

```ts
// Create an interactable entity (or add interactable to existing entity)
makeInteractable(world: World, entity: Entity, options: {
  promptText: string,
  range?: number,
  requiresFacing?: boolean,
  cooldown?: number,
}): void

// Check if an entity was activated this tick
wasActivated(world: World, entity: Entity): { activatedBy: Entity } | null

// Disable/enable an interactable
setInteractableEnabled(world: World, entity: Entity, enabled: boolean): void
```

### Input Binding

- default interaction key: `E`
- `interactionSystem` reads from `InputState` — no new input manager needed
- the system should expose which interactable is currently "focused" (closest valid target) so the HUD can show the prompt

### Acceptance Criteria

- player can approach an interactable entity and see a prompt
- pressing E triggers the `Activated` component on the focused entity
- cooldown and one-shot interactions work correctly
- `requiresFacing` filters out entities behind the player
- disabled interactables do not show prompts or respond to input
- all new APIs have Vitest coverage and JSDoc
- package README includes a "make a door switch" example

### Agent Notes

- this system reads trigger volumes from Stage 25 when available, but should also support a simpler distance-check fallback for games without physics
- `Activated` is an event component — it must be removed at the end of the tick by `interactionSystem` or a cleanup pass
- do not build a full UI prompt here — just expose the data; `packages/ui` (Stage 32) will handle rendering

---

## 7. Stage 27 — Damage Zone System

**Status:** Proposed. Depends on Stages 24 (gameplay) and 25 (triggers).

### Goal

Formalize damage zones as an engine-level primitive so environmental hazards are not ad hoc per-game code.

### Why

`hello-cube` already has a `damageZoneSystem` but it is example-local and hardcoded. Environmental damage (lava, electricity, gas, collapse debris) is common across genres.

### Reference Design Need

Shardline needs: pulse fields, energy beams, collapse damage, hazard floors.

### Deliverables

**Lives in:** `@arcane-engine/gameplay`

**Components:**

```ts
const DamageZone = defineComponent('DamageZone', () => ({
  damagePerSecond: number,      // continuous damage rate
  burstDamage: number,          // one-time damage on entry (0 = none)
  damageInterval: number,       // seconds between ticks (0 = every frame)
  lastDamageAt: number,         // internal timer
  enabled: boolean,
  // optional: who "owns" this damage (for kill credit)
  sourceTag: string,            // e.g. "environment", "trap", "hazard"
}));
```

**System:**

```ts
// Reads TriggerVolume enter/stay events for DamageZone entities,
// applies Damage to entities with Health inside the zone
damageZoneSystem(world: World, dt: number): void
```

**Utility functions:**

```ts
// Spawn a damage zone with a trigger volume
spawnDamageZone(world: World, physCtx: PhysicsContext, options: {
  position: { x: number, y: number, z: number },
  shape: 'box' | 'sphere',
  halfExtents?: { x: number, y: number, z: number },
  radius?: number,
  damagePerSecond?: number,
  burstDamage?: number,
  damageInterval?: number,
}): Entity

// Enable/disable a damage zone at runtime
setDamageZoneEnabled(world: World, entity: Entity, enabled: boolean): void
```

### Acceptance Criteria

- entities with `Health` take damage when inside a `DamageZone` trigger volume
- burst damage fires once on entry, not repeatedly
- `damageInterval` throttles continuous damage correctly
- disabled zones deal no damage
- damage source attribution works through `Damage.source`
- all new APIs have Vitest coverage and JSDoc
- `hello-cube` migrates from its local `damageZoneSystem` to the package version

### Agent Notes

- read `examples/hello-cube/src/damageZoneSystem.ts` before writing — understand what exists
- this system depends on `triggerVolumeSystem` running first in the frame
- `DamageZone` pairs a `TriggerVolume` with damage rules — they are separate components on the same entity

---

## 8. Stage 28 — Audio Package: Foundation

**Status:** Proposed.

### Goal

Give Arcane Engine its first audio capability: loading sounds, playing SFX, and controlling volume. This is the foundation layer — spatial audio and music come in Stage 29.

### Why

Audio has been explicitly excluded from every prior PRD. Games without sound feel incomplete. The Web Audio API is well-supported in browsers and maps well to the engine's "thin wrapper" philosophy.

### Reference Design Need

Shardline needs: weapon fire SFX, hit confirmation, reactor hum, sentry alert sounds, hazard warnings, ambient atmosphere, UI feedback sounds.

### Deliverables

**New package:** `packages/audio`

**Core types:**

```ts
interface AudioContext {
  ctx: globalThis.AudioContext,  // Web Audio context
  masterGain: GainNode,
  sfxGain: GainNode,
  musicGain: GainNode,
  loaded: Map<string, AudioBuffer>,
}

interface AudioOptions {
  masterVolume?: number,     // 0–1, default 1
  sfxVolume?: number,        // 0–1, default 1
  musicVolume?: number,      // 0–1, default 0.5
}

interface PlaySFXOptions {
  volume?: number,           // 0–1 relative to channel
  pitch?: number,            // playback rate multiplier (1 = normal)
  loop?: boolean,
}
```

**Functions:**

```ts
// Initialize the audio system (call once, typically in scene setup)
createAudioContext(options?: AudioOptions): AudioContext

// Load a sound file into the cache (supports mp3, ogg, wav, webm)
loadSound(audioCtx: AudioContext, id: string, source: string): Promise<AudioBuffer>

// Play a one-shot sound effect
playSFX(audioCtx: AudioContext, id: string, options?: PlaySFXOptions): AudioSourceHandle

// Stop a playing sound
stopSound(handle: AudioSourceHandle): void

// Volume controls
setMasterVolume(audioCtx: AudioContext, volume: number): void
setSFXVolume(audioCtx: AudioContext, volume: number): void
setMusicVolume(audioCtx: AudioContext, volume: number): void

// Cleanup
disposeAudioContext(audioCtx: AudioContext): void
```

**Preload integration:**

```ts
// Batch-load sounds as part of scene preload
// Compatible with the existing preloadSceneAssets pattern
loadSounds(audioCtx: AudioContext, manifest: Record<string, string>): Promise<void>
```

**Browser autoplay handling:**

```ts
// Resume audio context after user gesture (required by browsers)
// Returns a promise that resolves when context is running
resumeAudioOnInteraction(audioCtx: AudioContext): Promise<void>
```

### Acceptance Criteria

- sounds can be loaded from common formats (mp3, ogg, wav)
- SFX play immediately with no perceptible delay
- volume controls work independently for master, SFX, and music channels
- browser autoplay restrictions are handled gracefully
- audio context is disposed cleanly on scene teardown
- all new APIs have Vitest coverage and JSDoc
- package README includes a "load and play a sound" quick start

### Agent Notes

- use the Web Audio API directly — do not introduce Howler.js or other audio libraries
- the autoplay policy requires a user gesture before `AudioContext` can play; `resumeAudioOnInteraction` should listen for click/keydown and resume
- keep this stage focused on non-spatial SFX — spatial and music are Stage 29
- audio loading should support Vite's asset import pattern (URL strings from `import sfx from './bang.mp3'`)

---

## 9. Stage 29 — Audio Package: Spatial Sound and Music

**Status:** Proposed. Depends on Stage 28.

### Goal

Add 3D positional audio and background music playback to the audio package.

### Why

Spatial audio is essential for first-person games — directional gunshots, ambient reactor hum, and proximity alert sounds create immersion. Background music sets mood and signals game state.

### Reference Design Need

Shardline needs: positional reactor hum, directional sentry sounds, proximity hazard warnings, ambient music that shifts with game state.

### Deliverables

**Spatial audio components and functions (in `@arcane-engine/audio`):**

```ts
// Attach spatial sound to an entity
const SpatialAudio = defineComponent('SpatialAudio', () => ({
  soundId: string,
  volume: number,
  loop: boolean,
  maxDistance: number,        // meters — beyond this, inaudible
  refDistance: number,        // meters — distance at full volume
  rolloffFactor: number,     // how quickly volume drops (default 1)
  playing: boolean,
}));

// System: updates Web Audio PannerNodes from entity positions and
// updates the listener position from the camera/player
spatialAudioSystem(audioCtx: AudioContext): SystemFn

// Play a sound at a world position (one-shot, not entity-attached)
playSFXAtPosition(audioCtx: AudioContext, id: string, position: {
  x: number, y: number, z: number
}, options?: PlaySFXOptions): AudioSourceHandle
```

**Music functions:**

```ts
// Start background music (crossfades if music is already playing)
playMusic(audioCtx: AudioContext, id: string, options?: {
  volume?: number,
  loop?: boolean,             // default true
  fadeInDuration?: number,    // seconds
}): MusicHandle

// Stop current music with optional fade
stopMusic(audioCtx: AudioContext, options?: {
  fadeOutDuration?: number,
}): void

// Crossfade to a new track
crossfadeMusic(audioCtx: AudioContext, id: string, duration?: number): void
```

**Listener integration:**

```ts
// Sync Web Audio listener to camera position and orientation
// Called by spatialAudioSystem, but also available standalone
updateAudioListener(audioCtx: AudioContext, camera: THREE.Camera): void
```

### Acceptance Criteria

- sounds attached to entities pan correctly as the player moves and looks
- volume attenuates with distance using the configured rolloff model
- music plays, loops, and crossfades without pops or glitches
- the audio listener tracks the camera position and orientation
- spatial audio and music work together without channel conflicts
- all new APIs have Vitest coverage and JSDoc
- package README documents "attach a sound to an entity" and "play background music" workflows

### Agent Notes

- use Web Audio API `PannerNode` for spatial positioning — Three.js has its own audio system but wrapping Web Audio directly gives more control and avoids Three.js coupling
- `spatialAudioSystem` must run after the camera system so it gets the current listener position
- music crossfade should use gain node ramps, not abrupt switches
- test spatial audio with mocked PannerNode behavior (Vitest can't test actual 3D sound)

---

## 10. Stage 30 — AI Behavior Primitives

**Status:** Proposed.

### Goal

Give the engine lightweight AI building blocks for NPC and enemy behavior. Not a full behavior tree framework — just the primitives that cover 80% of simple game AI needs.

### Why

Every action game needs enemies or NPCs that do something. Without engine support, every game hand-codes state machines with ad hoc flags. A thin behavior layer makes enemy authoring fast and predictable.

### Reference Design Need

Shardline needs: sentry constructs with idle → alert → attack → destroyed states, patrol paths, detection ranges.

### Deliverables

**New package area in:** `@arcane-engine/gameplay` (AI is gameplay, not a separate package)

**Components:**

```ts
// Finite state machine for any entity
const BehaviorState = defineComponent('BehaviorState', () => ({
  current: string,              // e.g. "idle", "patrol", "alert", "attack", "dead"
  previous: string,
  timeInState: number,          // seconds since last transition
  data: Record<string, unknown>, // per-state scratch data
}));

// Patrol path definition
const PatrolPath = defineComponent('PatrolPath', () => ({
  waypoints: { x: number, y: number, z: number }[],
  currentIndex: number,
  speed: number,                // m/s
  waitAtWaypoint: number,       // seconds to pause at each point
  loop: boolean,
  waitTimer: number,            // internal countdown
}));

// Detection/awareness
const Detection = defineComponent('Detection', () => ({
  range: number,                // meters
  fov: number,                  // degrees (360 = omnidirectional)
  alertRange: number,           // closer range that triggers immediate alert
  target: Entity | null,        // currently detected entity
  hasLineOfSight: boolean,
  lastSeenPosition: { x: number, y: number, z: number } | null,
  lastSeenAt: number,           // timestamp
  forgetAfter: number,          // seconds without LOS before forgetting
}));
```

**Systems:**

```ts
// Updates BehaviorState.timeInState, runs registered behavior functions
behaviorSystem(world: World, dt: number): void

// Moves entities along PatrolPath waypoints
patrolSystem(world: World, dt: number): void

// Checks line of sight and range from Detection entities to target entities
// Updates Detection.target, .hasLineOfSight, .lastSeenPosition
detectionSystem(physCtx: PhysicsContext): SystemFn
```

**Behavior registration (function-based, not class-based):**

```ts
// Register a behavior function for a state name
// The function runs every tick for entities in that state
type BehaviorFn = (world: World, entity: Entity, dt: number) => string | void
// Return a string to transition to that state, or void to stay

registerBehavior(name: string, fn: BehaviorFn): void

// Transition an entity to a new state
transitionTo(world: World, entity: Entity, newState: string): void
```

**Utility functions:**

```ts
// Check if entity can see target (uses raycast)
hasLineOfSight(physCtx: PhysicsContext, from: Entity, to: Entity, maxDistance: number): boolean

// Get distance between two entities
getEntityDistance(world: World, a: Entity, b: Entity): number

// Move entity toward a position at speed (does not use physics — direct position update)
moveToward(world: World, entity: Entity, target: { x: number, y: number, z: number }, speed: number, dt: number): boolean // true when arrived

// Face entity toward a position
faceToward(world: World, entity: Entity, target: { x: number, y: number, z: number }): void
```

### Example: Sentry Behavior

```ts
registerBehavior('idle', (world, entity, dt) => {
  const detection = getComponent(world, entity, Detection);
  if (detection?.target) return 'alert';
});

registerBehavior('alert', (world, entity, dt) => {
  const detection = getComponent(world, entity, Detection);
  if (!detection?.target) return 'idle';
  faceToward(world, entity, detection.lastSeenPosition!);
  if (detection.hasLineOfSight) return 'attack';
});

registerBehavior('attack', (world, entity, dt) => {
  const detection = getComponent(world, entity, Detection);
  if (!detection?.hasLineOfSight) return 'alert';
  faceToward(world, entity, detection.lastSeenPosition!);
  // fire weapon logic here
});
```

### Acceptance Criteria

- entities can be assigned a behavior state and transition between states
- patrol system moves entities along waypoint paths with correct timing
- detection system correctly calculates range and line of sight using raycasts
- behavior functions are registered globally and dispatched by `behaviorSystem`
- state transitions fire cleanly (no double-transitions, `previous` is correct)
- all new APIs have Vitest coverage and JSDoc
- package README includes a "create a patrolling enemy" walkthrough

### Agent Notes

- `detectionSystem` uses `raycast` from `@arcane-engine/physics` for LOS checks — make this an optional dependency
- behavior functions must be pure-ish: they read world state and return a transition or void, they should not have side effects beyond ECS operations
- do not build a visual behavior editor, behavior tree DSL, or GOAP planner
- keep the patrol system simple: linear waypoint traversal, no pathfinding (A* or navmesh is out of V4 scope)
- `moveToward` is for non-physics AI movement; physics-based AI movement should use the character controller

---

## 11. Stage 31 — Particle and VFX System

**Status:** Proposed.

### Goal

Give the engine a lightweight particle system for visual effects: muzzle flashes, sparks, explosions, ambient particles, energy effects.

### Why

Currently, visual feedback is limited to mesh material swaps and DOM overlays (muzzle flash is a `<div>`). A proper particle system enables rich feedback without heavyweight solutions.

### Reference Design Need

Shardline needs: weapon muzzle flash, hit sparks, shard reactor energy particles, sentry destruction effects, hazard field visuals, ambient floating particles.

### Deliverables

**New package:** `packages/vfx`

**Core types:**

```ts
interface ParticleEmitterConfig {
  // Emission
  maxParticles: number,
  emitRate: number,             // particles per second (0 = burst mode)
  burstCount: number,           // particles per burst (for burst mode)
  duration: number,             // seconds (0 = infinite)
  loop: boolean,

  // Particle properties
  lifetime: { min: number, max: number },     // seconds
  speed: { min: number, max: number },
  direction: { x: number, y: number, z: number },
  spread: number,               // cone angle in degrees
  gravity: number,              // downward acceleration

  // Appearance
  size: { start: number, end: number },
  color: { start: string, end: string },       // hex colors
  opacity: { start: number, end: number },
  texture?: string,             // optional sprite texture URL
  blending: 'normal' | 'additive',
}
```

**Components:**

```ts
// Attach a particle emitter to an entity
const ParticleEmitter = defineComponent('ParticleEmitter', () => ({
  config: ParticleEmitterConfig,
  active: boolean,
  elapsed: number,
}));
```

**System:**

```ts
// Updates all particle emitters: spawns, ages, moves, and culls particles
// Manages Three.js Points or InstancedMesh for rendering
particleSystem(ctx: RendererContext): SystemFn
```

**Functions:**

```ts
// Spawn a standalone particle burst at a position (not attached to an entity)
emitBurst(ctx: RendererContext, position: { x: number, y: number, z: number },
  config: Partial<ParticleEmitterConfig>): void

// Common presets
const VFXPresets: {
  muzzleFlash: Partial<ParticleEmitterConfig>,
  sparks: Partial<ParticleEmitterConfig>,
  explosion: Partial<ParticleEmitterConfig>,
  ambientDust: Partial<ParticleEmitterConfig>,
  energyField: Partial<ParticleEmitterConfig>,
}
```

**Screen effects (non-particle VFX):**

```ts
// Brief screen flash (damage, activation, etc.)
screenFlash(options: {
  color: string,
  duration: number,          // seconds
  opacity: number,
}): void

// Screen shake
screenShake(camera: THREE.Camera, options: {
  intensity: number,
  duration: number,
  decay: boolean,
}): void
```

### Implementation Strategy

- use Three.js `Points` with `BufferGeometry` for most particles (GPU-friendly)
- particle state lives in typed arrays (position, velocity, age, etc.) for performance
- use object pooling — never allocate/GC particles at runtime
- `additive` blending for energy and fire effects, `normal` for dust and debris

### Acceptance Criteria

- particle emitters can be attached to entities and follow their position
- burst and continuous emission modes both work
- particles age, move, shrink/fade, and are culled at end of lifetime
- screen flash and screen shake work independently of the particle system
- presets produce visually useful defaults for common game effects
- performance: 500+ simultaneous particles at 60fps on a modest laptop
- all new APIs have Vitest coverage and JSDoc
- package README includes visual examples of each preset

### Agent Notes

- do not introduce a third-party particle library — build on Three.js primitives
- particle rendering should use a single draw call per emitter (instanced or Points)
- screen effects (flash, shake) are DOM/camera operations, not particle effects — keep them in `vfx` but as separate modules
- keep the config interface flat — no nested builder patterns or fluent APIs

---

## 12. Stage 32 — Post-Processing Pipeline

**Status:** Proposed.

### Goal

Wrap Three.js `EffectComposer` into a clean engine-level API for bloom, vignette, and screen-space effects that games can enable with one call.

### Why

Emissive materials (reactor glow, energy effects, sentry eyes) look flat without bloom. Damage vignette and color grading add atmosphere cheaply. Three.js has all the building blocks, but wiring `EffectComposer` requires boilerplate that every game would duplicate.

### Reference Design Need

Shardline needs: bloom for emissive shard materials, vignette for damage feedback, possible color grading for atmosphere.

### Deliverables

**New package:** `packages/postprocessing`

**Core API:**

```ts
interface PostProcessingOptions {
  bloom?: {
    enabled: boolean,
    strength: number,           // default 0.5
    radius: number,             // default 0.4
    threshold: number,          // luminance threshold, default 0.8
  },
  vignette?: {
    enabled: boolean,
    darkness: number,           // default 0.5
    offset: number,             // default 1.0
  },
  chromaticAberration?: {
    enabled: boolean,
    offset: number,             // default 0.002
  },
  colorGrading?: {
    enabled: boolean,
    brightness: number,
    contrast: number,
    saturation: number,
  },
}

// Create the post-processing pipeline (replaces direct renderer.render())
createPostProcessing(
  rendererCtx: RendererContext,
  options?: PostProcessingOptions,
): PostProcessingContext

// Update options at runtime (e.g., increase vignette when damaged)
updatePostProcessing(ppCtx: PostProcessingContext, options: Partial<PostProcessingOptions>): void

// Must be called instead of the default render — integrates with renderSystem
// or replaces it
postProcessingRenderSystem(ppCtx: PostProcessingContext): SystemFn

// Cleanup
disposePostProcessing(ppCtx: PostProcessingContext): void
```

**Convenience functions:**

```ts
// Temporarily intensify an effect (e.g., damage vignette pulse)
pulseEffect(ppCtx: PostProcessingContext, effect: 'vignette' | 'chromaticAberration', options: {
  intensity: number,
  duration: number,            // seconds
  easeOut: boolean,
}): void
```

### Integration

- `postProcessingRenderSystem` replaces `renderSystem` when post-processing is active
- it calls `EffectComposer.render()` instead of `renderer.render()`
- the render system should be swappable with no other changes to the game loop

### Acceptance Criteria

- bloom makes emissive materials glow visibly
- vignette effect renders correctly at canvas edges
- effects can be enabled/disabled and adjusted at runtime
- `pulseEffect` creates smooth temporary intensity spikes
- post-processing does not break standard rendering when disabled
- performance: effects run at 60fps on a modest laptop at 1080p
- all new APIs have Vitest coverage and JSDoc
- package README includes "enable bloom for your scene" quick start

### Agent Notes

- use Three.js `EffectComposer`, `RenderPass`, `UnrealBloomPass`, and `ShaderPass`
- do not write custom GLSL unless Three.js does not provide a built-in pass
- chromatic aberration and color grading may need simple custom shader passes — keep them small
- `pulseEffect` should use requestAnimationFrame-aligned tweening, not setTimeout
- test with mocked renderer context (Vitest cannot render WebGL)

---

## 13. Stage 33 — Timer and Countdown System

**Status:** Proposed.

### Goal

Give the engine reusable timer primitives for countdowns, cooldowns, delays, and periodic events.

### Why

Timers are ubiquitous: mission countdowns, ability cooldowns, spawn delays, invulnerability windows, wave timers. Without a standard system, every game scatters `elapsed += dt` logic across systems.

### Reference Design Need

Shardline needs: collapse countdown, weapon cooldowns, sentry alert delay, reactor activation sequence timer, invulnerability after respawn.

### Deliverables

**Lives in:** `@arcane-engine/gameplay`

**Components:**

```ts
const Timer = defineComponent('Timer', () => ({
  id: string,                   // named identifier
  duration: number,             // total seconds
  remaining: number,            // seconds left
  loop: boolean,                // restart when finished
  paused: boolean,
  finished: boolean,            // true for one tick when timer expires
  onFinishEvent: string,        // optional: event name to emit
}));

// Convenience: attach multiple timers to one entity
const Timers = defineComponent('Timers', () => ({
  active: Timer[],
}));
```

**System:**

```ts
// Ticks all Timer components, sets finished flag, handles looping
timerSystem(world: World, dt: number): void
```

**Functions:**

```ts
// Start a timer on an entity
startTimer(world: World, entity: Entity, options: {
  id: string,
  duration: number,
  loop?: boolean,
}): void

// Check if a named timer just finished this tick
timerJustFinished(world: World, entity: Entity, id: string): boolean

// Get remaining time
getTimerRemaining(world: World, entity: Entity, id: string): number | null

// Pause / resume / cancel
pauseTimer(world: World, entity: Entity, id: string): void
resumeTimer(world: World, entity: Entity, id: string): void
cancelTimer(world: World, entity: Entity, id: string): void

// Global mission timer (convenience wrapper using GameState.elapsedTime)
getMissionTime(world: World): number
```

### Acceptance Criteria

- timers count down accurately using `dt`
- `finished` flag is true for exactly one tick
- looping timers restart immediately after finishing
- paused timers do not tick
- multiple named timers can coexist on one entity
- all new APIs have Vitest coverage and JSDoc
- package README includes a "mission countdown" example

### Agent Notes

- timers are data (components), not callbacks — game systems query `timerJustFinished()` rather than registering callbacks
- this avoids the callback lifetime / cleanup problems that plague timer systems
- the `Timer` component uses `defineComponent` like everything else — no special runtime

---

## 14. Stage 34 — Scoring and Local Persistence

**Status:** Proposed. Depends on Stage 33 (timers for mission time).

### Goal

Give the engine a scoring framework and a thin localStorage wrapper for persisting scores, settings, and progress across page refreshes.

### Why

Replayable games need scores, ranks, and best-run tracking. Without engine support, every game invents its own localStorage schema and scoring math.

### Reference Design Need

Shardline needs: mission time, accuracy stat, damage taken stat, rank calculation, best-run tracking, results screen data.

### Deliverables

**Lives in:** `@arcane-engine/gameplay`

**Scoring components:**

```ts
const ScoreTracker = defineComponent('ScoreTracker', () => ({
  stats: Record<string, number>,     // flexible named stats
  // Common built-in stat keys:
  // 'kills', 'shotsFired', 'shotsHit', 'damageTaken', 'damageDealt',
  // 'objectivesCompleted', 'deaths'
}));

const MissionResult = defineComponent('MissionResult', () => ({
  completed: boolean,
  missionTime: number,               // seconds
  stats: Record<string, number>,
  rank: string,                      // e.g. "S", "A", "B", "C", "D"
  score: number,                     // computed total
}));
```

**Functions:**

```ts
// Increment a stat
trackStat(world: World, entity: Entity, stat: string, amount?: number): void

// Get current stat value
getStat(world: World, entity: Entity, stat: string): number

// Calculate rank from stats using a configurable rule set
type RankRule = {
  rank: string,
  minScore: number,
}

calculateRank(score: number, rules: RankRule[]): string

// Build a MissionResult from current GameState + ScoreTracker
buildMissionResult(world: World, rules?: RankRule[]): MissionResult
```

**Local persistence:**

```ts
// Thin localStorage wrapper with namespacing and JSON serialization
interface StorageOptions {
  namespace: string,             // e.g. "shardline" — prefixes all keys
}

createStorage(options: StorageOptions): GameStorage

interface GameStorage {
  save<T>(key: string, value: T): void,
  load<T>(key: string, fallback: T): T,
  remove(key: string): void,
  clear(): void,
  has(key: string): boolean,
}

// Convenience: save and load best run
saveBestRun(storage: GameStorage, result: MissionResult): void
loadBestRun(storage: GameStorage): MissionResult | null
isBestRun(storage: GameStorage, result: MissionResult): boolean

// Convenience: save and load player settings
saveSettings(storage: GameStorage, settings: Record<string, unknown>): void
loadSettings(storage: GameStorage): Record<string, unknown>
```

### Acceptance Criteria

- stats accumulate correctly across a play session
- `buildMissionResult` produces a complete result from current world state
- rank calculation works with configurable thresholds
- `GameStorage` correctly namespaces, saves, and loads JSON data from localStorage
- best run comparison works (lower time is better when completed, higher score is better)
- all new APIs have Vitest coverage and JSDoc
- package README includes a "track stats and save best run" walkthrough

### Agent Notes

- `ScoreTracker` uses a flexible `Record<string, number>` so games define their own stat names
- localStorage may be unavailable (private browsing, storage full) — `GameStorage` should handle errors gracefully with fallbacks
- do not build a leaderboard backend — local persistence only
- rank rules are game-defined, not engine-defined — provide sensible defaults in docs but do not hardcode Shardline's ranks

---

## 15. Stage 35 — UI System: HUD and Overlays

**Status:** Proposed.

### Goal

Replace the current raw-DOM HUD approach with a structured UI system for game HUD elements, prompts, overlays, and screen transitions.

### Why

The current approach in `hello-cube` is direct `document.createElement` and `textContent` writes scattered across systems. This works for a demo but does not scale to a real game with multiple HUD elements, modal overlays, result screens, and animated transitions.

### Reference Design Need

Shardline needs: health bar, crosshair, reactor progress indicators, interaction prompts ("Press E"), timer display, objective status, result summary screen, death overlay, loading screen, screen transitions between scenes.

### Deliverables

**New package:** `packages/ui`

**Core architecture:**

The UI package should be **DOM-based** (not Three.js/Canvas HUD), using a thin reactive layer over plain HTML elements. No React, no virtual DOM — just structured DOM management.

```ts
interface UIContext {
  root: HTMLElement,             // mounted over the canvas
  layers: Map<string, HTMLElement>,
}

// Initialize the UI system
createUIContext(container?: HTMLElement): UIContext

// Cleanup
disposeUIContext(ctx: UIContext): void
```

**Layer system:**

```ts
// UI is organized in z-ordered layers
createUILayer(ctx: UIContext, name: string, options?: {
  zIndex?: number,
  pointerEvents?: boolean,     // default false (click-through for HUD)
}): HTMLElement

removeUILayer(ctx: UIContext, name: string): void
```

**HUD elements:**

```ts
// Declarative HUD element creation
createHUDElement(layer: HTMLElement, config: {
  id: string,
  type: 'bar' | 'text' | 'icon' | 'crosshair' | 'custom',
  position: 'top-left' | 'top-center' | 'top-right' |
            'center-left' | 'center' | 'center-right' |
            'bottom-left' | 'bottom-center' | 'bottom-right',
  // Type-specific options
  bar?: { maxValue: number, color: string, backgroundColor: string, width: string },
  text?: { fontSize: string, color: string },
  crosshair?: { size: number, color: string, thickness: number, gap: number },
}): HUDElement

interface HUDElement {
  element: HTMLElement,
  update(value: number | string): void,
  show(): void,
  hide(): void,
  destroy(): void,
}
```

**Prompt system:**

```ts
// Show a contextual prompt (e.g., "Press E to activate")
showPrompt(ctx: UIContext, options: {
  text: string,
  key?: string,                  // renders a key icon
  position?: 'center' | 'bottom',
  duration?: number,             // auto-dismiss in seconds (0 = manual)
}): PromptHandle

interface PromptHandle {
  update(text: string): void,
  dismiss(): void,
}
```

**Overlay screens:**

```ts
// Full-screen overlays (results, death, pause, loading)
showOverlay(ctx: UIContext, options: {
  id: string,
  content: HTMLElement | string,   // HTML string or element
  background?: string,
  fadeIn?: number,                 // seconds
  dismissOnKey?: string,           // e.g., 'Enter', 'Escape'
  onDismiss?: () => void,
}): OverlayHandle

interface OverlayHandle {
  update(content: HTMLElement | string): void,
  dismiss(): void,
}
```

**Screen transitions:**

```ts
// Transition effects between scenes
screenTransition(ctx: UIContext, options: {
  type: 'fade' | 'wipe' | 'none',
  color?: string,
  duration?: number,              // seconds
}): Promise<void>                  // resolves when transition completes
```

**System:**

```ts
// Syncs HUD elements to world state each tick
// Reads GameState, Health, ScoreTracker, Timer and updates corresponding HUD elements
hudSyncSystem(uiCtx: UIContext, bindings: HUDBinding[]): SystemFn

interface HUDBinding {
  hudElementId: string,
  source: 'gameState' | 'playerHealth' | 'timer' | 'stat' | 'custom',
  key?: string,                    // stat name or timer id
  format?: (value: number) => string,
}
```

### Acceptance Criteria

- HUD elements render correctly at all specified positions
- bar elements animate smoothly when value changes
- prompts appear and dismiss correctly (both timed and manual)
- overlays render over the game with proper z-ordering
- screen transitions work between scene changes
- `hudSyncSystem` updates HUD elements from world state without manual DOM writes
- all new APIs have Vitest coverage and JSDoc
- package README includes "build a game HUD" and "show a results screen" walkthroughs

### Agent Notes

- use CSS for layout, animation, and transitions — not JavaScript animation loops
- HUD elements should use CSS positioning (flexbox/grid) not absolute pixel placement
- keep the DOM structure flat and inspectable — no shadow DOM or component framework
- the crosshair element replaces the current `hello-cube` CSS-based crosshair
- do not build a menu system, settings screen, or dialogue UI — those are game-level

---

## 16. Stage 36 — Weapon System Upgrade

**Status:** Proposed.

### Goal

Promote and extend the hitscan weapon system from example-local to an engine-level weapon framework that supports multiple weapon types.

### Why

The current weapon system in `hello-cube` is a single hitscan function. Real games need weapon switching, cooldowns, different fire modes, and projectile weapons.

### Reference Design Need

Shardline needs: primary hitscan weapon with cooldown. Future games may need: projectile weapons, melee, multiple weapon slots.

### Deliverables

**Lives in:** `@arcane-engine/gameplay`

**Components:**

```ts
const Weapon = defineComponent('Weapon', () => ({
  type: 'hitscan' | 'projectile' | 'melee',
  damage: number,
  fireRate: number,              // shots per second
  cooldownRemaining: number,     // seconds until next shot
  range: number,                 // meters
  automatic: boolean,            // hold to fire vs click to fire
  ammo: number,                  // -1 = infinite
  maxAmmo: number,
  // Projectile-specific
  projectileSpeed: number,       // m/s (ignored for hitscan)
  // Melee-specific
  arc: number,                   // degrees (ignored for non-melee)
}));

const WeaponInventory = defineComponent('WeaponInventory', () => ({
  weapons: Entity[],             // weapon entities
  activeIndex: number,
  switchCooldown: number,
}));

// Event: fired this tick (consumed by VFX, audio, etc.)
const WeaponFired = defineComponent('WeaponFired', () => ({
  weaponEntity: Entity,
  origin: { x: number, y: number, z: number },
  direction: { x: number, y: number, z: number },
}));

// Event: weapon hit something this tick
const WeaponHit = defineComponent('WeaponHit', () => ({
  weaponEntity: Entity,
  hitEntity: Entity | null,
  hitPoint: { x: number, y: number, z: number },
  hitNormal: { x: number, y: number, z: number },
}));
```

**Systems:**

```ts
// Processes fire input, manages cooldowns, performs raycasts/projectile spawns
weaponSystem(physCtx: PhysicsContext): SystemFn

// Optional: projectile movement and collision
projectileSystem(physCtx: PhysicsContext): SystemFn
```

**Functions:**

```ts
// Create a weapon entity with preset
createWeapon(world: World, preset: 'hitscan' | 'projectile' | 'melee' | Partial<Weapon>): Entity

// Give a weapon to an entity
equipWeapon(world: World, entity: Entity, weaponEntity: Entity): void

// Switch active weapon
switchWeapon(world: World, entity: Entity, index: number): void

// Weapon presets
const WeaponPresets: {
  pistol: Partial<Weapon>,
  rifle: Partial<Weapon>,
  shotgun: Partial<Weapon>,
  energyBolt: Partial<Weapon>,
}
```

### Acceptance Criteria

- hitscan weapons fire correctly with cooldown enforcement
- automatic weapons fire continuously while held
- ammo tracking works (fires denied at 0 ammo)
- `WeaponFired` and `WeaponHit` event components are produced for other systems (VFX, audio) to consume
- projectile weapons spawn entities that move and collide
- weapon switching works with configurable cooldown
- `hello-cube` migrates from its local `weaponSystem` to the package version
- all new APIs have Vitest coverage and JSDoc

### Agent Notes

- the current `hello-cube` weapon system should be the starting point — read it first
- `WeaponFired` and `WeaponHit` are event components consumed by VFX (Stage 31) and audio (Stage 28) systems
- projectile physics should use Rapier dynamic bodies with high velocity — do not invent custom physics
- melee weapons use a short-range arc overlap test, not a raycast

---

## 17. Stage 37 — Template: Gameplay-Ready

**Status:** Proposed. Depends on Stages 24–36.

### Goal

Add a third scaffold template that starts a new project with the full V4 engine surface wired up and ready.

### Why

V3 added `asset-ready`. V4's new packages (audio, gameplay, VFX, post-processing, UI) need a template that demonstrates them together so new projects do not have to wire up 8 packages manually.

### Deliverables

**New template:** `templates/gameplay-ready`

The template should include:

- renderer with post-processing enabled (bloom)
- audio context initialized with example SFX
- one gameplay scene with:
  - a player entity with `Health`, `Weapon`, `Player`
  - one interactive object (`Interactable`)
  - one damage zone
  - one enemy entity with `BehaviorState` and `Detection`
  - a particle emitter on the enemy
  - HUD with health bar, crosshair, and prompt
  - mission timer
  - result screen on completion
- preload flow with loading overlay
- local storage for best run
- clean teardown

The template should be **small** (under 400 lines of game code total) and **readable**. It is a starting point, not a finished game.

**CLI update:**

```sh
npx @arcane-engine/create-arcane my-game --template gameplay-ready
```

### Acceptance Criteria

- `npx @arcane-engine/create-arcane my-game --template gameplay-ready` scaffolds and runs
- the template demonstrates every V4 package in a minimal way
- a new developer can read the template in one sitting
- the template README explains what each system does and where to extend it
- `pnpm test`, `pnpm typecheck`, and `pnpm build` pass from repo root

### Agent Notes

- read the existing `templates/asset-ready` structure before writing
- do not make this a copy of `hello-cube` — it should be smaller and more focused
- use inline comments to explain "why" for each system registration

---

## 18. Stage 38 — Hello Cube V4 Upgrade

**Status:** Proposed. Depends on Stages 24–36.

### Goal

Upgrade `examples/hello-cube` to demonstrate V4 engine features: audio, VFX, post-processing, AI behaviors, the promoted gameplay package, the UI system, and scoring.

### Why

`hello-cube` is the primary teaching example. It should showcase the current engine surface so developers know what is available.

### Deliverables

- migrate all example-local gameplay code to `@arcane-engine/gameplay` imports
- add audio: SFX for weapon fire, hit confirmation, ambient sounds
- add VFX: particle muzzle flash (replace DOM overlay), hit sparks, ambient particles
- add post-processing: bloom on emissive materials, damage vignette pulse
- add AI: sentry targets with `BehaviorState`, `Detection`, `PatrolPath`
- add UI: replace raw DOM HUD with `@arcane-engine/ui` elements
- add scoring: `ScoreTracker`, mission result, rank display
- add timers: weapon cooldown, mission timer in HUD
- retain multiplayer mode with all new features where applicable

### Acceptance Criteria

- `hello-cube` demonstrates every V4 package
- the example still builds and runs without errors
- audio, VFX, and post-processing are visible and functional
- enemy sentries exhibit patrol/alert/attack behavior
- HUD uses the UI package, not raw DOM
- results screen shows stats and rank
- no single file grows unreasonably large (aim for < 200 lines per module)
- `pnpm test`, `pnpm typecheck`, and `pnpm build` pass

### Agent Notes

- this is a migration and enhancement, not a rewrite — preserve the scene structure
- read the full `examples/hello-cube/src/` tree before making changes
- break changes into logical commits: gameplay migration, audio, VFX, post-processing, AI, UI, scoring

---

## 19. Stage 39 — Docs, Agent Workflow, and V4 Release

**Status:** Proposed. Depends on all prior V4 stages.

### Goal

Align all documentation with V4, finalize the release, and ensure the repo is ready for Shardline or any other game project to build on.

### Deliverables

**Root docs update:**

- `README.md`: update package table, capabilities matrix, quick start
- `CONTRIBUTING.md`: add new package boundaries, update conventions
- `AGENTS.md` / `CLAUDE.md`: add V4 packages to entry points, update scope defaults
- `CHANGELOG.md`: V4 release notes

**Package docs:**

- each new package (`audio`, `gameplay`, `vfx`, `postprocessing`, `ui`) gets a comprehensive README
- existing package READMEs updated where V4 changes touch them

**Workflow docs:**

- "How to add audio to a scene"
- "How to create an enemy with AI behavior"
- "How to add particle effects"
- "How to enable post-processing"
- "How to build a game HUD"
- "How to track scores and save best runs"
- "How to add an interaction prompt"
- "How to create a damage zone"

**Agent workflow docs:**

- updated stage template for future PRDs
- V4 system registration order guidance
- per-frame data flow diagram (updated with audio, VFX, AI, UI systems)

**Release prep:**

- version bump
- `pnpm test`, `pnpm typecheck`, and `pnpm build` pass
- all template scaffolds build and run
- `hello-cube` runs cleanly with all features

### Acceptance Criteria

- a developer reading only the docs can understand what Arcane Engine offers and how to use it
- a coding agent can build a new game using only the docs, templates, and examples as reference
- no doc references stale APIs or missing stages
- all verification passes from repo root

### Agent Notes

- read every doc file in the repo before editing
- use the V3 docs as style reference — simple language, concrete examples, beginner-friendly
- do not add roadmap language to product docs — only describe what is shipped
- update the per-frame data flow in the PRD or a new architecture doc

---

## 20. Revised Full Stage List

| Stage | Name | Status | Key Addition |
|-------|------|--------|-------------|
| 1–12 | V1 + V2 track | ✅ complete | ECS through multiplayer FPS prototype |
| 13–23 | V3 track | ✅ complete | Asset pipeline, animation, preload, polish |
| **24** | **Gameplay Package: Core Primitives** | proposed | Health, Damage, GameState, Player, SpawnPoint promoted |
| **25** | **Trigger Volume System** | proposed | Rapier sensor triggers with enter/stay/exit |
| **26** | **Interaction System** | proposed | "Press E to interact", Activated events |
| **27** | **Damage Zone System** | proposed | Environmental hazard zones using triggers |
| **28** | **Audio: Foundation** | proposed | Web Audio API, SFX loading and playback |
| **29** | **Audio: Spatial Sound and Music** | proposed | 3D positional audio, music crossfade |
| **30** | **AI Behavior Primitives** | proposed | FSM, patrol, detection, line of sight |
| **31** | **Particle and VFX System** | proposed | Emitters, particles, screen flash, screen shake |
| **32** | **Post-Processing Pipeline** | proposed | Bloom, vignette, chromatic aberration |
| **33** | **Timer and Countdown System** | proposed | Reusable timers, cooldowns, countdowns |
| **34** | **Scoring and Local Persistence** | proposed | Stats, ranks, localStorage wrapper |
| **35** | **UI System: HUD and Overlays** | proposed | Structured HUD, prompts, overlays, transitions |
| **36** | **Weapon System Upgrade** | proposed | Multi-weapon, projectiles, melee, events |
| **37** | **Template: Gameplay-Ready** | proposed | Third scaffold template with all V4 packages |
| **38** | **Hello Cube V4 Upgrade** | proposed | Example migration to V4 surface |
| **39** | **Docs, Agent Workflow, and V4 Release** | proposed | Full docs alignment and release |

---

## 21. Recommended Execution Order

V4 should be built in four arcs:

### Arc A — Gameplay Foundation (Stages 24–27)

Build the core gameplay infrastructure that everything else depends on.

```text
Stage 24: Gameplay Package (core primitives)
Stage 25: Trigger Volumes (spatial detection)
Stage 26: Interaction System (activation pattern)
Stage 27: Damage Zones (environmental hazards)
```

These are tightly coupled and should be built in order. Each stage validates the previous one.

### Arc B — Sensory Layer (Stages 28–32)

Add the systems that make games feel alive. These are mostly independent of each other and can be built in parallel by different agents.

```text
Stage 28: Audio Foundation        ← independent
Stage 29: Audio Spatial + Music   ← depends on 28
Stage 30: AI Behaviors            ← independent (uses physics raycast)
Stage 31: Particle/VFX            ← independent
Stage 32: Post-Processing         ← independent
```

**Parallelization opportunity:** Stages 28, 30, 31, and 32 can be developed simultaneously by separate agents since they touch different packages with no shared dependencies.

### Arc C — Game Systems (Stages 33–36)

Add the higher-level game systems that build on Arc A and B.

```text
Stage 33: Timers/Countdowns       ← depends on 24
Stage 34: Scoring/Persistence     ← depends on 24, 33
Stage 35: UI System               ← depends on 24
Stage 36: Weapon Upgrade          ← depends on 24, 25
```

**Parallelization opportunity:** Stages 33, 35 can be developed simultaneously. Stage 36 can overlap with 34.

### Arc D — Integration and Ship (Stages 37–39)

Wire everything together and ship.

```text
Stage 37: Gameplay-Ready Template ← depends on all of 24–36
Stage 38: Hello Cube V4 Upgrade   ← depends on all of 24–36
Stage 39: Docs and V4 Release     ← depends on 37, 38
```

---

## 22. Parallelization Map for Agent Teams

For multi-agent development (Claude Code + Codex + Cursor):

| Phase | Agent 1 | Agent 2 | Agent 3 |
|-------|---------|---------|---------|
| 1 | Stage 24 (gameplay pkg) | — | — |
| 2 | Stage 25 (triggers) | — | — |
| 3 | Stage 26 (interaction) | — | — |
| 4 | Stage 27 (damage zones) | — | — |
| 5 | Stage 28 (audio foundation) | Stage 30 (AI behaviors) | Stage 31 (VFX/particles) |
| 6 | Stage 29 (audio spatial) | Stage 32 (post-processing) | Stage 33 (timers) |
| 7 | Stage 35 (UI system) | Stage 34 (scoring) | Stage 36 (weapons) |
| 8 | Stage 37 (template) | Stage 38 (hello-cube upgrade) | — |
| 9 | Stage 39 (docs + release) | — | — |

This minimizes idle time and keeps agents working on independent packages.

---

## 23. Per-Frame Data Flow (V4 Target)

```text
 1. Input system           → reads keyboard, mouse, touch into InputState
 2. Timer system           → ticks all Timer components
 3. Interaction system     → checks proximity, manages prompts, fires Activated
 4. AI detection system    → updates Detection (range, LOS) for AI entities
 5. AI behavior system     → runs behavior functions, transitions states
 6. AI patrol system       → moves patrolling entities along waypoints
 7. Physics system         → steps Rapier, syncs transforms
 8. Trigger volume system  → reads Rapier sensor events, updates enter/stay/exit
 9. Damage zone system     → applies Damage to entities in hazard triggers
10. Character controller   → applies WASD + gravity via Rapier kinematic body
11. FPS camera system      → positions camera, applies yaw/pitch
12. Weapon system          → fires weapons, raycasts/projectiles, WeaponFired/Hit events
13. Health system          → processes Damage, destroys at 0 hp, Dead marker
14. Game state system      → updates phase, elapsed time, checks win/lose
15. Scoring system         → updates ScoreTracker from game events
16. Spatial audio system   → updates listener + positional sounds from positions
17. Particle system        → spawns, ages, moves, culls particles
18. Network sync system    → sends/receives positions (multiplayer only)
19. HUD sync system        → writes world state to UI elements
20. Render system          → syncs transforms to Three.js, submits draw
    (or post-processing)   → EffectComposer.render() if PP is enabled
```

---

## 24. Definition of Done (V4)

V4 is complete when:

- `@arcane-engine/gameplay` ships with Health, Damage, GameState, triggers, interaction, damage zones, timers, scoring, persistence, weapons, and AI primitives
- `@arcane-engine/audio` ships with SFX, spatial audio, and music
- `@arcane-engine/vfx` ships with particle emitters, screen flash, and screen shake
- `@arcane-engine/postprocessing` ships with bloom, vignette, and runtime control
- `@arcane-engine/ui` ships with HUD elements, prompts, overlays, and screen transitions
- `templates/gameplay-ready` scaffolds and runs with all V4 packages
- `examples/hello-cube` demonstrates every V4 feature
- all root docs, package READMEs, and agent docs match the shipped code
- `pnpm test`, `pnpm typecheck`, and `pnpm build` pass from repo root
- a coding agent can build a game like Shardline using only the engine docs, templates, and examples as reference

---

## 25. Notes for Future PRDs

If V4 succeeds, the engine is gameplay-ready and the next phase is building games on it. Likely V5 conversations:

- **Shardline: Sanctum Breach** — the reference game becomes a real project
- navmesh / pathfinding for smarter AI
- networked gameplay (authoritative server, lag compensation)
- save/load game state (beyond local best-run)
- visual scene editor / inspector
- WebGPU renderer option
- mobile-first input and UI
- accessibility features

Those should only come after V4 proves Arcane Engine can be **gameplay-capable** without losing its small-framework identity.

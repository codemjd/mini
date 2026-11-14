# Spark Engine — extraction phase 1

## Scope

This branch starts the transition from a single Phaser scene that edits and plays a game into separate engine subsystems. The existing editor remains on Phaser in this phase to protect editing, saving, undo/redo, and the published preview while the new runtime is tested.

The new play-preview runtime is Spark-owned code and is separated into:

- Model — versioned scene/object data and behavior definitions.
- Project adapter — converts the editor's legacy object records into the new runtime schema.
- World — owns runtime actors, deterministic state, fixed-step simulation, and lifecycle.
- Systems — player movement, follow-target enemy behavior, combat, and collectibles.
- Time manager — frame timing, time scaling, and timers.
- Renderer — PixiJS scene graph, HUD, procedural environment, actor views, and simple impact particles.
- Runtime host — keyboard/touch input, frame pump, callbacks, and disposal.

This separation follows the documented distinction in GDevelop between project structure, game runtime, rendering, and reusable behavior/extensions. Spark does not attempt to import GDevelop's C++ Core, generated code, editor, cloud services, or complete RuntimeScene/RuntimeGame dependency graph.

## What was reused and what was rebuilt

1. The time-management implementation is adapted from the GDJS Runtime TimeManager. The original MIT notice is kept in the source header and in licenses/GDevelop-GDJS-MIT.txt.
2. PixiJS 7.4.2 is used as a separately installed MIT-licensed rendering library. GDevelop's GDJS also uses PixiJS; Spark does not copy GDevelop's renderer implementation.
3. The scene model, behavior systems, renderer, game loop, input bridge, and editor adapter in this branch are Spark implementations. Their organization is informed by the public GDevelop architecture overview, not copied from the GDevelop editor.
4. GDevelop's name and logo are not used as product branding. Spark is independent and does not claim affiliation.

## Why not import all of GDJS now?

The official architecture has dependencies across the Core, GDJS, GDevelop.js, newIDE, and Extensions areas. RuntimeScene and RuntimeGame expect the wider runtime object container, layers, resource management, variables, renderer interfaces, code-generated events, and extension declarations. The C++ Core-to-JavaScript bindings are built with Emscripten and CMake. Copying only a few of those large classes would leave an incomplete, fragile engine.

The current extraction therefore takes a useful, independently testable vertical slice instead of importing thousands of files. The next decision gate is to prove this runtime through the same editing workflow before moving scene editing away from Phaser.

## Runtime guarantees in this phase

- A fixed 60 Hz simulation step with bounded frame catch-up.
- Explicit scene/object schema versioning.
- Separate behavior systems with deterministic update order.
- Keyboard and touch movement, attack input, enemy pursuit, hit points, and collectible scoring.
- Explicit disposal of ticker and keyboard listeners when preview ends.
- Runtime data is copied from the editor adapter; play actions do not mutate the editable project.

## Known limits

- This is a 2D runtime foundation, not full GDevelop compatibility.
- The editor still uses Phaser. This is intentional and temporary.
- The first renderer uses procedural vector art; it does not yet load commercial or third-party sprite packs.
- Physics bodies, event-sheet visual editor, tilemaps, skeletal animation, audio mixer, asset pipeline, scene transitions, and export targets are later subsystems.
- PixiJS requires WebGL support in the browser used for preview. A fallback renderer is a later hardening task if target-device tests expose a need.

## Verification gates before switching the editor

1. Build and type-check in CI.
2. Browser test for preview creation and cleanup.
3. Verify score, attack, keyboard, and touch pathways.
4. Test on low-memory Android browsers and measure frame time.
5. Only then move editor rendering and manipulation to the new renderer.

## Upstream references

- GDevelop repository: https://github.com/4ian/GDevelop
- Architecture overview: https://github.com/4ian/GDevelop/blob/master/Core/GDevelop-Architecture-Overview.md
- GDJS TimeManager source: https://github.com/4ian/GDevelop/blob/master/GDJS/Runtime/timemanager.ts
- GDevelop license summary: https://github.com/4ian/GDevelop/blob/master/LICENSE.md
- GDJS license: https://github.com/4ian/GDevelop/blob/master/GDJS/LICENSE.md

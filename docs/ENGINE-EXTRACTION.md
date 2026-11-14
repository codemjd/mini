# Spark Engine — extraction phase 1

## Scope

This branch separates the visual editor from game preview. The editor uses Spark-owned Canvas 2D rendering and pointer manipulation; melonJS owns the playable preview, and the versioned Spark project model connects the two.

The new play-preview runtime is Spark-owned code and is separated into:

- Model — versioned scene/object data and behavior definitions.
- Project adapter — converts the editor's legacy object records into the new runtime schema.
- World — owns runtime actors, deterministic state, fixed-step simulation, and lifecycle.
- Systems — player movement, follow-target enemy behavior, combat, and collectibles.
- Time manager — frame timing, time scaling, and timers.
- Renderer — melonJS Application, scene graph, renderer, text HUD, and procedural actor views.
- Runtime host — keyboard/touch input, frame pump, callbacks, and disposal.

This separation follows the documented distinction in GDevelop between project structure, game runtime, rendering, and reusable behavior/extensions. Spark does not attempt to import GDevelop's C++ Core, generated code, editor, cloud services, or complete RuntimeScene/RuntimeGame dependency graph.

## What was reused and what was rebuilt

1. The time-management implementation is adapted from the GDJS Runtime TimeManager. The original MIT notice is kept in the source header and in licenses/GDevelop-GDJS-MIT.txt.
2. melonJS 20.15.1 is the preview runtime and rendering engine. Its Application owns the canvas, game loop, scene graph, and renderer; Spark does not copy melonJS source.
3. The scene model, behavior systems, renderer, game loop, input bridge, and editor adapter in this branch are Spark implementations. Their organization is informed by the public GDevelop architecture overview, not copied from the GDevelop editor.
4. GDevelop's name and logo are not used as product branding. Spark is independent and does not claim affiliation.

## Why not import all of GDJS now?

The official architecture has dependencies across the Core, GDJS, GDevelop.js, newIDE, and Extensions areas. RuntimeScene and RuntimeGame expect the wider runtime object container, layers, resource management, variables, renderer interfaces, code-generated events, and extension declarations. The C++ Core-to-JavaScript bindings are built with Emscripten and CMake. Copying only a few of those large classes would leave an incomplete, fragile engine.

The current extraction takes a useful, independently testable vertical slice instead of importing thousands of files. The first editor migration is now in place; the next decision gate is to validate full edit/save/reopen/preview flows on desktop and Android.

## Runtime guarantees in this phase

- A fixed 60 Hz simulation step with bounded frame catch-up.
- Explicit scene/object schema versioning.
- Separate behavior systems with deterministic update order.
- Keyboard and touch movement, attack input, enemy pursuit, hit points, and collectible scoring.
- Explicit disposal of ticker and keyboard listeners when preview ends.
- Runtime data is copied from the editor adapter; play actions do not mutate the editable project.

## Known limits

- This is a 2D runtime foundation, not full GDevelop compatibility.
- The editor now uses Spark-owned Canvas 2D rendering. Phaser has been removed from active dependencies.
- The first renderer uses procedural vector art; it does not yet load commercial or third-party sprite packs.
- Physics bodies, event-sheet visual editor, tilemaps, skeletal animation, audio mixer, asset pipeline, scene transitions, and export targets are later subsystems.
- melonJS AUTO renderer selection can fall back between WebGPU, WebGL 2, and Canvas 2D according to device support. Actual compatibility and performance still require browser and Android device tests.

## Verification gates for the migrated editor

1. Build and type-check in CI.
2. Browser test for preview creation and cleanup.
3. Verify score, attack, keyboard, and touch pathways.
4. Test on low-memory Android browsers and measure frame time.
5. Verify pointer/touch selection, dragging, layer order, undo/redo, persistence, and preview lifecycle on desktop and Android.

## Upstream references

- GDevelop repository: https://github.com/4ian/GDevelop
- Architecture overview: https://github.com/4ian/GDevelop/blob/master/Core/GDevelop-Architecture-Overview.md
- GDJS TimeManager source: https://github.com/4ian/GDevelop/blob/master/GDJS/Runtime/timemanager.ts
- GDevelop license summary: https://github.com/4ian/GDevelop/blob/master/LICENSE.md
- GDJS license: https://github.com/4ian/GDevelop/blob/master/GDJS/LICENSE.md


## melonJS migration — phase 2

The preview runs through melonJS 20.15.1. The scene editor uses a Spark-owned Canvas 2D renderer; the two renderers have separate responsibilities.

- Application initialization is asynchronous and owns the preview canvas lifecycle.
- Spark's versioned scene model and deterministic behavior systems remain engine-independent.
- A melonJS Renderable scene graph draws the procedural environment, actors, health bars, and HUD.
- The melonJS update loop drives Spark's bounded fixed-step simulation.
- The official Tiled Inflate plugin is registered once for future compressed Tiled-map loading.
- PixiJS is removed from the active runtime dependencies.

The built-in melonJS SAT physics is the default candidate for simple 2D collisions. Matter, Planck, or Rapier adapters are not bundled yet: select one only after a real project requirement and a device-size/performance comparison. Spine integration is deferred until its package peer compatibility with melonJS 20.x is verified.

This is a runtime and initial editor-renderer migration milestone, not a finished editor product. The project still requires full device interaction testing and verification of the Android package after these latest changes.


## Phase 3 — official melonJS systems

- Built-in SAT sensor bodies are attached declaratively to Spark runtime actors. melonJS owns the broadphase and collision lifecycle; Spark receives contact state without letting the physics solver overwrite the authoritative Spark positions.
- Combat and collectible systems consult melonJS contact state and retain bounded distance checks as a deterministic fallback during initial integration.
- Touch controls use the official GamepadPlugin. Keyboard, virtual touch controls and physical gamepads feed the same melonJS input bindings.
- DebugPanelPlugin loads only when ?debug=1 is present; F1 toggles it.
- Tiled Inflate is registered once per page for compressed Tiled maps.
- The asset pipeline exposes melonJS loader + TextureAtlas + Sprite helpers for TexturePacker/Aseprite exports.
- Capacitor 8 and the official melonJS Capacitor lifecycle plugin are loaded only in native runtime contexts. A separate Android CI workflow scaffolds a native project and creates a debug APK artifact.

Physics choice: keep melonJS built-in SAT for the current top-down arcade runtime. Planck/Box2D or Matter remain optional adapters only if a future game needs joints, stacking, continuous collision detection or more elaborate rigid-body dynamics.

Spine is deliberately not installed: its plugin package has MIT terms, but the underlying Spine runtime has separate licensing conditions. Native Sprite/TextureAtlas animation remains the default.

The editor now uses Spark-owned Canvas 2D. The migration is complete at the renderer layer, but feature parity and physical-device validation remain outstanding.


## Editor independence — first vertical slice

The project document model is isolated in \`src/editor/project-document.ts\`. It migrates legacy v1/v2 JSON into schema v3, validates object records, preserves the optional Spark Script source, and has no Phaser or melonJS dependency. The visual editor uses `SparkEditorCanvas` for display and pointer/touch manipulation, independent of both game runtimes.

The optional Spark Script subsystem is kept in \`src/scripting/spark-script.ts\`. It parses a four-command allowlist into validated operations and commits scene changes as one undoable edit. It is deliberately not arbitrary JavaScript and does not run per-frame gameplay logic.


## Editor renderer migration — first batch

- The editor now renders with \`SparkEditorCanvas\`, a Spark-owned Canvas 2D renderer for the scene background, actors, selection outlines, grid, and pointer/touch dragging.
- Scene editing no longer creates a Phaser game or imports Phaser APIs. The project model and editor renderer do not depend on melonJS.
- melonJS remains responsible for the playable preview and runtime.
- Phaser was removed from active dependencies after the editor renderer migration.
- Current scope remains a single-scene editor with object list, inspector, locking, layers, undo/redo, JSON import/export, and local persistence. Multi-scene project navigation, multi-select, clipboard workflow, and a richer property/asset system remain later work.


## Stage 1 closure work — controller, persistence, and input safety

The editor controller is now isolated in `src/editor/editor-controller.ts`. `src/main.ts` owns the static RTL application shell, binds the controller, renders the object list/inspector, and connects user controls. The controller exposes explicit `canUndo` / `canRedo` queries instead of requiring the UI to inspect private stacks.

Persistence now writes `spark-workshop-mini-project-v3`. Existing v2 local saves are read and migrated without discarding the project or its Spark Script source. A successful manual save removes the obsolete key. Imported object identifiers are normalized and de-duplicated before they reach HTML attributes. Status messages are appended as text nodes to avoid treating project/script-derived text as HTML.

The browser regression suite covers legacy save migration, script edits with undo/redo, and malicious-looking script error text. These checks complement the existing scene creation, editing, preview lifecycle, and mobile viewport tests.

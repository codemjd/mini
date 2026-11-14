# Stage 1 — Acceptance boundary

This document defines what the first engineering stage of Spark Workshop Mini delivers. It distinguishes an implemented foundation from later product features and physical-device release gates.

## Included in Stage 1

- [x] A Spark-owned Canvas 2D scene editor, independent of Phaser and melonJS.
- [x] A separate `SparkEditorController` for scene editing state, history, save/load, and preview lifecycle.
- [x] A renderer-independent project document schema (v3), with validation and migration from local v2 saves.
- [x] Starter scene creation and object add/select/drag/duplicate/delete/edit/lock/layer operations.
- [x] Undo/redo for scene changes, including script-generated object changes.
- [x] Local autosave, explicit save, JSON export, and validated JSON import.
- [x] Optional Spark Script for constrained scene edits (`set`, `spawn`, `remove`, `note`); no arbitrary JavaScript execution.
- [x] melonJS 20.15.1 preview runtime, with Spark-owned model/world/systems and keyboard/gamepad-plugin touch input.
- [x] Asset-loader/atlas foundation and compressed Tiled-map plugin registration.
- [x] Optional debug panel integration and Capacitor 8 Android project scaffolding.
- [x] GitHub Actions workflow that creates and uploads a debug APK artifact.

## Release and acceptance gates

These are deliberately separate from implementation checkboxes:

- [ ] CI checks pass on the final reviewed PR head, including desktop and mobile-browser regression tests and Android debug APK build.
- [ ] Install and test the generated APK on a physical Android device (editor touch input, preview controls, persistence, and app resume/exit).
- [ ] Produce a separately signed release APK before calling the Android build distributable.

A successful CI debug APK build is evidence that the web bundle can be wrapped and compiled. It is not evidence of installation/runtime behavior on every physical device and is not a release-signed package.

## Explicitly deferred beyond Stage 1

- Multi-scene project navigation and scene transitions.
- Multi-select, clipboard copy/paste, grouping, and advanced selection tools.
- A browsable professional art/sound library and full asset-import UI.
- Visual event/behavior graph editor and general gameplay scripting runtime.
- Advanced platform physics, joints, and rigid-body simulation.
- Online multiplayer, accounts, cloud saves, and publishing services.
- Final release signing, store packaging, and distribution pipeline.

## Verification commands

```bash
npm install
npm run typecheck
npm run build
npm run test:e2e
```

The Android debug APK workflow is available in GitHub Actions under **Android debug APK**. The workflow creates a clean Capacitor Android project, syncs the web output, runs `assembleDebug`, and uploads `app-debug.apk` as an artifact.

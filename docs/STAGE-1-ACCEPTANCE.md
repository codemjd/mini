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

- [x] CI checks passed on the validated implementation commit `0ce3839`: TypeScript check, production build, 32 desktop/mobile Chromium test cases, Android debug APK build, and artifact upload. Later branch commits after this implementation commit are documentation/PR metadata only.
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


## Latest CI evidence

- Implementation commit: `0ce3839a8f88f506c5bc08bbf5f432ca21658ab8`
- Browser quality workflow: [run 56](https://github.com/codemjd/mini/actions/runs/43609839722) — 32 tests passed across desktop and mobile Chromium.
- Build-and-check workflow: [run 128](https://github.com/codemjd/mini/actions/runs/43609839719) — TypeScript check, production build, and 32 browser tests passed.
- Android workflow: [run 31](https://github.com/codemjd/mini/actions/runs/43609839636) — debug APK built and uploaded.
- Artifact: `spark-workshop-debug-apk`, containing `app-debug.apk` (4,593,146 bytes). The artifact expires on 2026-11-28.

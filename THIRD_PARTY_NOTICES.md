# Third-party notices

## GDevelop GDJS Runtime — adapted time-management implementation

The time-management implementation in src/engine/time-manager.ts is an adaptation of the design and behavior of GDevelop's GDJS Runtime TimeManager.

- Upstream project: https://github.com/4ian/GDevelop
- Upstream source: https://github.com/4ian/GDevelop/blob/master/GDJS/Runtime/timemanager.ts
- Copyright: Copyright (c) 2013–2016 Florian Rival
- License: MIT
- Full notice: licenses/GDevelop-GDJS-MIT.txt

No GDevelop name, logo, visual identity, proprietary service, or cloud API is included in Spark. Spark is an independent project and is not endorsed by or affiliated with GDevelop.

## PixiJS 7.4.2

Spark depends on PixiJS as its rendering library. No PixiJS source files are copied into this repository; the package is installed as a dependency.

- Project: https://github.com/pixijs/pixijs
- Package: https://www.npmjs.com/package/pixi.js
- Version: 7.4.2
- License: MIT
- Full notice: licenses/PixiJS-MIT.txt

The remaining editor dependency on Phaser predates this extraction and is unchanged. A complete dependency-by-dependency license inventory is required before commercial distribution or binary packaging.

## melonJS 20.15.1

Spark uses the published melonJS engine package for its preview runtime, scene graph, renderer, application loop, and text rendering.

- Project: https://github.com/melonjs/melonJS
- Package: https://www.npmjs.com/package/melonjs
- Version: 20.15.1
- License: MIT
- Full notice: licenses/melonJS-MIT.txt

## melonJS Tiled Inflate Plugin 1.2.1

Spark registers the official Tiled Inflate plugin for compressed Tiled map support (gzip, zlib, and zstd).

- Project: https://github.com/melonjs/melonJS/tree/master/packages/tiled-inflate-plugin
- Package: https://www.npmjs.com/package/@melonjs/tiled-inflate-plugin
- Version: 1.2.1
- License: MIT
- Full notice: licenses/Tiled-Inflate-MIT.txt

Phaser remains the temporary editor renderer during this migration. PixiJS has been removed from the active dependency graph and is no longer used by the Spark preview runtime.

A complete dependency-by-dependency license inventory is required before commercial distribution or binary packaging.

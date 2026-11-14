# Third-party notices

## GDevelop GDJS Runtime — adapted time-management implementation

The time-management implementation in src/engine/time-manager.ts is an adaptation of the design and behavior of GDevelop's GDJS Runtime TimeManager.

- Upstream project: https://github.com/4ian/GDevelop
- Upstream source: https://github.com/4ian/GDevelop/blob/master/GDJS/Runtime/timemanager.ts
- Copyright: Copyright (c) 2013–2016 Florian Rival
- License: MIT
- Full notice: licenses/GDevelop-GDJS-MIT.txt

No GDevelop name, logo, visual identity, proprietary service, or cloud API is included in Spark. Spark is an independent project and is not endorsed by or affiliated with GDevelop.

## melonJS 20.15.1

Spark uses the published melonJS engine package for its preview runtime, scene graph, renderer, application loop, and text rendering.

- Project: https://github.com/melonjs/melonJS
- Package: https://www.npmjs.com/package/melonjs
- Version: 20.15.1
- License: MIT
- Full notice: licenses/melonJS-MIT.txt

## melonJS Tiled Inflate Plugin 1.2.2

Spark registers the official Tiled Inflate plugin for compressed Tiled map support (gzip, zlib, and zstd).

- Project: https://github.com/melonjs/melonJS/tree/master/packages/tiled-inflate-plugin
- Package: https://www.npmjs.com/package/@melonjs/tiled-inflate-plugin
- Version: 1.2.2
- License: MIT
- Full notice: licenses/Tiled-Inflate-MIT.txt

Phaser remains the temporary editor renderer during this migration. PixiJS has been removed from the active dependency graph and is no longer used by the Spark preview runtime.

A complete dependency-by-dependency license inventory is required before commercial distribution or binary packaging.


## melonJS Gamepad Plugin 1.2.2
- Package: @melonjs/gamepad-plugin
- Project: https://github.com/melonjs/melonJS/tree/master/packages/gamepad-plugin
- License: MIT
- Full notice: licenses/melonJS-Gamepad-MIT.txt

## melonJS Debug Plugin 16.2.1
- Package: @melonjs/debug-plugin
- Project: https://github.com/melonjs/melonJS/tree/master/packages/debug-plugin
- License: MIT
- Full notice: licenses/melonJS-Debug-MIT.txt

## melonJS Capacitor Plugin 1.0.2
- Package: @melonjs/capacitor-plugin
- Project: https://github.com/melonjs/melonJS/tree/master/packages/capacitor-plugin
- License: MIT
- Full notice: licenses/melonJS-Capacitor-MIT.txt

## Capacitor 8.6.2 / App Plugin 8.1.2
- Packages: @capacitor/core, @capacitor/android, @capacitor/cli, @capacitor/app
- Project: https://github.com/ionic-team/capacitor
- License: MIT
- Full notice: licenses/Capacitor-MIT.txt

## Animation licensing note
Spark currently uses melonJS native Sprite/TextureAtlas animation and accepts TexturePacker/Aseprite atlas exports. The optional Spine plugin is not bundled: the Spine runtime has separate licensing terms and should only be added after the project owner confirms the required Spine license and distribution rights.

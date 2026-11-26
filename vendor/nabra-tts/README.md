# Vendored Nabra TTS

This directory contains a reproducible source snapshot of
[Oddadmix/nabra-tts](https://github.com/Oddadmix/nabra-tts), upstream commit
`16b5281ce61993df3526740990cf845a3f3036f4` (2026-10-02).

The upstream repository declares package version 0.1.0, but that version is not
available from the public npm registry. Explainer Studio therefore builds this
vendored source directly instead of depending on a non-installable npm package.

## Build

The root project provides `tsup`, `esbuild`, and `onnxruntime-web`.
Run `npm run build:nabra`; the generated ESM and declaration files are written
to the ignored `vendor/nabra-tts/dist` directory. The app imports that local
build. Model weights are not included here: on the user's explicit first
generation request Nabra downloads its FP16 model and voice pack from its
upstream Hugging Face repository and caches them in the browser.

## Licensing and source notices

- Nabra source and model: Apache-2.0; see `LICENSE`.
- ONNX Runtime Web: MIT; see `THIRD_PARTY_NOTICES.md`.
- The bundled eSpeak NG WebAssembly module and Arabic/English phoneme data are
  GPL-3.0-or-later. The full license is in `licenses/GPL-3.0-or-later.txt`.
  Its Nabra wrapper and reproducible build script are in `espeak/wrapper.c`
  and `espeak/build.sh`. The script pins eSpeak NG 1.52.0 and documents the
  eSpeak data source.
- The compiled file is `src/vendor/espeak-ng-ar.mjs`; its declaration is next
  to it. Preserve these notices and the corresponding source references when
  redistributing the app.

The vendored engine is experimental. Its single MSA voice, device performance,
pronunciation, and Android browser compatibility must be validated on target
hardware before production use.

# Third-party notices

## eSpeak NG (bundled)

`dist/espeak-ng-ar-*.js` and the inline worker contain eSpeak NG 1.52.0 compiled to WebAssembly,
together with its Arabic and English phoneme data (`phondata`, `phonindex`, `phontab`,
`intonations`, `ar_dict`, `en_dict`, `lang/sem/ar`, `lang/gmw/en`).

- Project: https://github.com/espeak-ng/espeak-ng
- License: GNU General Public License v3.0 or later
- Build script: `espeak/build.sh` (unmodified upstream sources at tag 1.52.0, plus `espeak/wrapper.c`)

## Nabra-7M-Distill model (downloaded at runtime, not bundled)

- https://huggingface.co/oddadmix/Nabra-7M-Distill, Apache-2.0
- Kokoro / StyleTTS2 architecture: https://huggingface.co/hexgrad/Kokoro-82M (Apache-2.0)

## ONNX Runtime Web (dependency; bundled into the worker)

- https://github.com/microsoft/onnxruntime, MIT License

## Ported logic

`src/g2p/punctuation.ts` and `src/g2p/espeak.ts` port behaviour from
[phonemizer](https://github.com/bootphon/phonemizer) (GPL-3.0) and
[misaki](https://github.com/hexgrad/misaki) (Apache-2.0) so the output matches the Python
training pipeline exactly. `src/g2p/arabic.ts` ports `arabic_g2p.py` from the model repository.

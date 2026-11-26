#!/usr/bin/env bash
# Build an Arabic (+ English fallback) espeak-ng 1.52.0 WASM module -> src/vendor/espeak-ng-ar.mjs
#
# Uses the exact compiled espeak-ng-data that ships with the Python `espeakng_loader`
# wheel (also 1.52.0), which is what misaki / the Nabra training pipeline used, so the
# browser G2P is byte-for-byte identical to Python.
#
# Requires: emscripten (brew install emscripten), git, and export/.venv set up
# (pip install espeakng-loader).
set -euo pipefail
cd "$(dirname "$0")"

VERSION=1.52.0
EMSYSROOT="$(em-config CACHE)/sysroot/include"
DATA="$(../export/.venv/bin/python -c 'import espeakng_loader as e; print(e.get_data_path())')"

[ -d src ] || git clone -q --depth 1 --branch "$VERSION" https://github.com/espeak-ng/espeak-ng.git src

# espeak's compat wctype shim #defines iswalnum & co, which then clash with emscripten's
# wchar.h prototypes; force-including the system headers first avoids that.
emcmake cmake -S src -B build -DCMAKE_BUILD_TYPE=Release \
  -DUSE_ASYNC=OFF -DUSE_MBROLA=OFF -DUSE_LIBSONIC=OFF -DUSE_LIBPCAUDIO=OFF \
  -DUSE_KLATT=OFF -DUSE_SPEECHPLAYER=OFF \
  -DCMAKE_C_FLAGS="-include $EMSYSROOT/wchar.h -include $EMSYSROOT/wctype.h"
cmake --build build --target espeak-ng -j8

rm -rf data && mkdir -p data/espeak-ng-data/lang/sem data/espeak-ng-data/lang/gmw data/espeak-ng-data/voices
# en_dict: espeak switches to English for Latin-script words inside Arabic text.
cp "$DATA"/{phondata,phonindex,phontab,intonations,ar_dict,en_dict} data/espeak-ng-data/
cp "$DATA"/lang/sem/ar data/espeak-ng-data/lang/sem/
cp "$DATA"/lang/gmw/en data/espeak-ng-data/lang/gmw/

# SINGLE_FILE_BINARY_ENCODE=0: embed as base64 (pure ASCII) so downstream bundlers do not
# escape the binary-as-UTF-8 string into \\uXXXX sequences (+45% size).
mkdir -p ../src/vendor
emcc -O3 wrapper.c build/src/libespeak-ng/libespeak-ng.a build/src/ucd-tools/libucd.a \
  -Isrc/src/include -o ../src/vendor/espeak-ng-ar.mjs \
  --embed-file data/espeak-ng-data@/espeak-ng-data \
  -sMODULARIZE=1 -sEXPORT_ES6=1 -sEXPORT_NAME=createEspeak -sSINGLE_FILE=1 -sSINGLE_FILE_BINARY_ENCODE=0 \
  -sALLOW_MEMORY_GROWTH=1 -sENVIRONMENT=web,worker,node -sFILESYSTEM=1 \
  -sEXPORTED_FUNCTIONS=_nabra_init,_nabra_text_to_phonemes,_malloc,_free \
  -sEXPORTED_RUNTIME_METHODS=ccall
ls -la ../src/vendor/espeak-ng-ar.mjs

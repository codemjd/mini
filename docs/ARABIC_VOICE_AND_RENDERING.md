# Arabic voice and rendering decision record

Last reviewed: 2026-11-26

## Goal

Add Arabic narration to Explainer Studio without introducing a mandatory paid API, while keeping project text private by default and preserving the no-music policy.

## Findings

### 1. Browser-local Arabic TTS candidate: Nabra-7M-Distill

The `nabra-tts` project provides a browser-side Arabic TTS adapter around the Nabra-7M-Distill ONNX model.

- Modern Standard Arabic (MSA), 24 kHz mono output.
- Apache-2.0 code/model; bundled espeak-ng component is GPL-3.0-or-later and must remain attributed.
- Browser execution uses WebGPU when available and falls back to WASM.
- First load is approximately 30 MB (or 16 MB with fp16) plus an approximately 7 MB gzipped ONNX Runtime Web WASM payload; model/voice assets are cached.
- The documented API exposes `NabraTTS.load()`, `generate()`, `stream()`, `toWav()`, progress callbacks, and a revision pin.
- The project currently documents one voice and MSA only. It explicitly notes that diacritics improve pronunciation and that chunks are limited to 510 phonemes.
- Its published performance figures are measured on an Apple M-series laptop, not on low-end Android phones; they must not be treated as an Android performance guarantee.
- The repository is very new and has almost no community adoption at this review date. Treat it as a promising candidate, not a production-proven dependency.

References:
- https://github.com/Oddadmix/nabra-tts
- https://huggingface.co/oddadmix/Nabra-7M-Distill
- https://huggingface.co/oddadmix/Nabra-7M-Distill-ONNX

### 2. Video rendering and audio

Remotion's `@remotion/web-renderer` can encode audio and video in the browser. The renderer supports audio codecs including AAC for MP4 and exposes capability checks before rendering. The current Explainer Studio local renderer explicitly sets `muted: true`, so it intentionally creates silent video.

Client-side rendering depends on WebCodecs and a limited subset of DOM/CSS rendering behavior. Browser/device codec support must be checked at runtime with `canRenderMediaOnWeb()`. This is especially important for Android devices and long projects.

References:
- https://www.remotion.dev/docs/web-renderer/render-media-on-web
- https://www.remotion.dev/docs/web-renderer/can-render-media-on-web
- https://www.remotion.dev/docs/client-side-rendering
- https://www.remotion.dev/docs/client-side-rendering/limitations

## Decision

Use Nabra as the first no-key, local-only Arabic TTS proof-of-concept, behind a replaceable voice-engine interface. Do not make it a required first-load dependency until the Android browser test confirms:
1. Model download and caching work on the target browser.
2. WebGPU or WASM synthesis completes without freezing the editor.
3. Arabic pronunciation is acceptable on undiacritized and diacritized samples.
4. The resulting WAV can be attached to a scene and included in an MP4 render.
5. Memory usage and export time are acceptable on a modest Android phone.

Keep a manual audio-file import path as a fallback. Do not silently upload narration text to a third-party service.

## Planned integration contract

A voice engine should:
- Accept one scene's narration text.
- Return a WAV Blob, sample rate, and measured duration.
- Report loading/synthesis progress.
- Support cancellation where possible.
- Never add music.
- Store generated audio as a project asset (not only an ephemeral object URL).
- Keep text and audio local unless the user explicitly chooses an external provider.

## Important current limitations

- TTS is researched but not integrated yet.
- Current local MP4 renderer remains silent and capped at 90 seconds and 1280x720.
- The 1080p render in GitHub Actions is a separate server/CI render path, not proof that the phone can render 1080p locally.
- No Android device test has been performed.

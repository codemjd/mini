# Arabic Voice Pipeline — Implementation Specification

Status: partially implemented on `feature/narration-audio-pipeline`; awaiting CI verification, licensing review, and real Android acceptance tests.

## Product decision

Explainer Studio must support narration without adding music. Narration is attached to a scene and stored as a durable project asset. A generated audio file must survive reload, project export/import, and browser restarts. Temporary object URLs must never be written into project JSON.

The first candidate engine is Nabra TTS, loaded lazily and only after the user explicitly requests speech generation. It is an experimental local engine, not a production guarantee.

## Candidate engine: Nabra TTS

Repository: https://github.com/Oddadmix/nabra-tts

Documented characteristics observed on 2026-11-26:
- Browser-side synthesis through ONNX Runtime Web.
- Modern Standard Arabic, one voice, 24 kHz mono output.
- FP16 model download is documented at approximately 16 MB; runtime WASM adds further download.
- WebGPU is preferred when available; WASM is the fallback.
- Model files are cached by the browser after first download.
- The API exposes `NabraTTS.load()`, `generate(text)`, `stream(text)`, `toWav(audio)`, and `dispose()`.
- Text chunking is limited; long passages must be segmented.
- Diacritics materially affect pronunciation. The engine does not itself guarantee high-quality automatic diacritization.
- Published speed figures are from Apple M-series hardware and must not be treated as Android performance claims.

Licensing:
- Repository and model are described as Apache-2.0.
- Bundled espeak-ng is GPL-3.0-or-later. Preserve notices and review distribution implications before bundling or self-hosting any runtime files.

## Proposed architecture

### 1. Provider boundary

Define a provider-neutral interface:

```ts
export interface SpeechProgress {
  phase: "downloading" | "initializing" | "synthesizing";
  progress?: number;
  detail?: string;
}

export interface SpeechEngine {
  readonly id: string;
  generate(
    text: string,
    options?: { onProgress?: (progress: SpeechProgress) => void }
  ): Promise<{ audio: Blob; mimeType: "audio/wav"; sampleRate: number }>;
  dispose?(): Promise<void>;
}
```

Nabra should be one implementation behind this interface. Future cloud or alternate local engines must not change the project schema.

### 2. Lazy loading and privacy

- Do not download model weights at application startup.
- Load the engine only after an explicit Generate narration action.
- Show the model download size and progress before first use.
- Prefer FP16 and automatic device selection initially.
- Never upload narration text to a remote service without a separate, explicit consent step.
- Provide a clear cancel path and dispose of worker/model resources when appropriate.
- Handle unsupported WebGPU, WASM initialization failures, low-memory devices, and interrupted downloads gracefully.

### 3. Durable audio assets

Persist audio Blobs in a dedicated IndexedDB object store, not inside project JSON and not as object URLs.

Suggested record:

```ts
export interface AudioAssetRecord {
  id: string;
  projectId: string;
  sceneId: string;
  blob: Blob;
  mimeType: "audio/wav";
  sampleRate: number;
  durationSeconds: number;
  source: "nabra" | "uploaded";
  createdAt: string;
  textHash: string;
}
```

The scene references an optional `narrationAudioAssetId`. Asset IDs are stable; object URLs are created only at runtime and revoked when no longer needed.

Database migration must be additive and must preserve existing projects. The project store and audio asset store must share one database version and upgrade path.

### 4. Scene timeline and render

- Narration starts at the scene's timeline start by default.
- The UI must show whether narration is absent, generating, ready, or out of date relative to the narration text.
- If narration text changes, mark the existing audio as stale; never silently present it as synchronized.
- Support preview playback, regeneration, deletion, and WAV import.
- The composition must resolve stored Blobs to renderable URLs before rendering and release those URLs afterward.
- Use `Audio` from `@remotion/media`, not `Html5Audio`, because Html5Audio is unsupported by the browser renderer.
- Check browser render capability for an audio codec before enabling audio export. MP4 output needs a compatible audio encoding path (typically AAC).
- Add an automated render fixture containing a short generated or deterministic WAV, then use ffprobe to verify both video and audio streams and their durations.
- The demo's current silent render remains a separate visual regression test until narration integration is complete.

## Android acceptance tests

Do not claim Android support until tested on representative mid-range Android hardware:
1. First model download completes and reports progress.
2. Reload uses cached model data rather than downloading it all again.
3. Short MSA sentence generates valid WAV.
4. Longer text is segmented without truncation or sentence reordering.
5. UI remains responsive during generation.
6. Memory use remains acceptable; cancellation and tab reload do not corrupt the project.
7. Generated WAV survives reload and project export/import.
8. Preview playback and final MP4 audio are synchronized.
9. The final MP4 contains an audio stream and no music.
10. Fallback upload works if the local engine is unsupported.

## Known limitations and release gates

- Nabra currently documents one MSA voice; no dialect or voice-selection promise.
- Pronunciation quality needs Arabic editorial review, especially names, numbers, abbreviations, and unvowelled text.
- Automatic diacritization is a separate capability and must not be implied by the base model.
- Performance on the user's Android device is unknown until tested.
- The browser integration and a deterministic AAC smoke-test workflow have been added on the feature branch, but the workflow has not yet passed for this revision. Do not claim audio MP4 export is verified until CI inspects the resulting file.

## References

- https://github.com/Oddadmix/nabra-tts
- https://huggingface.co/oddadmix/Nabra-7M-Distill-ONNX
- https://www.remotion.dev/docs/media/audio
- https://www.remotion.dev/docs/web-renderer/can-render-media-on-web
- https://www.remotion.dev/docs/web-renderer/render-media-on-web


## Newer model candidate reviewed on 2026-11-26: Nabra-82M / sherpa-onnx

A second candidate appeared in the Arabic TTS ecosystem review:
https://huggingface.co/marwanelamami/nabra-82m-sherpa-onnx

Grounded model-card facts:
- Arabic MSA, one voice (`af_msa`, speaker ID 0), 24 kHz output.
- Apache-2.0 model card.
- INT4 model is 57 MB; INT8 is 83 MB; FP16 is 163 MB.
- The model card documents sherpa-onnx support across Android/iOS and WebAssembly-capable targets.
- INT4 has a faint noise floor; INT8 is recommended by the card when cleaner audio is required.
- The model has a 510-token sequence cap and uses espeak-ng Arabic G2P data.

Decision:
- Keep Nabra-7M Distill as the first browser prototype because it has a directly documented browser package and much smaller download.
- Keep Nabra-82M INT4/INT8 as a quality candidate for a future native Android render worker or a WASM experiment, not as a drop-in browser dependency.
- Do not claim it is faster, more natural, or compatible with this app until we benchmark it on Android and compare the same Arabic test script by human listening.
- The model card is a community packaging of Nabra-82M; independently verify upstream model provenance and license notices before distribution.

This gives the product a quality path without forcing a 57–163 MB download on every browser user.


## Experimental implementation on `feature/narration-audio-pipeline`

The following code has been added on the feature branch. It is not yet deployed to the production Pages URL.

### Durable audio and project transport

- IndexedDB database version 2 creates an `audio-assets` object store additively alongside the existing `projects` store.
- Each scene may reference `narrationAudioAssetId` and stores a `narrationAudioText` snapshot. A mismatch marks the clip stale.
- Audio uploads accept MP3, WAV, M4A, AAC, and WebM, currently limited to 25 MiB per file. The browser reads duration metadata; the scene duration is extended to contain the clip.
- Audio Blobs remain in IndexedDB. Object URLs are created only for preview/render and revoked after use.
- Project export produces a versioned JSON bundle with Base64 audio payloads; current export/import caps aggregate audio payload size at 25 MiB. Older JSON files remain importable only when they do not reference audio.
- Unreferenced audio assets are cleaned only after the project save succeeds, avoiding deletion before the project metadata is durable.

### Timeline and MP4

- `@remotion/media` `Audio` is placed inside each scene's Remotion `Sequence`, which aligns clip start with the scene's timeline start.
- The scene Player preview receives a local object URL only when its saved narration snapshot matches the current script.
- MP4 rendering resolves every referenced asset from IndexedDB, checks that its text snapshot is still current, checks `canRenderMediaOnWeb()` for H.264 + AAC, embeds AAC when audio exists, and revokes every temporary object URL in a `finally` block.
- The audio smoke fixture is a deterministic 5-second, 48 kHz silent PCM WAV. It validates decoding and AAC muxing, not narration quality or intelligibility.
- CI's FFprobe gate now requires both H.264 video and AAC audio streams, 1920×1080 video, and the expected 21–22.2 second total duration.

### Nabra local TTS prototype

- The speech module imports `nabra-tts` lazily only when the user presses the generation button.
- The integration requests FP16 weights, automatic WebGPU/WASM selection, Web Worker execution, and model caching.
- Text is split at word boundaries into at most 280-character requests. Generated PCM is concatenated into WAV and saved as a scene asset.
- The UI exposes download/synthesis progress. The engine is disposed on `pagehide`.
- This path does not send the narration text to a speech API. The browser does fetch model/runtime files from Hugging Face and jsDelivr on first use unless those resources are self-hosted.
- Nabra does not provide automatic high-quality tashkeel. Unvowelled names, numbers, foreign terms, and long Arabic passages require listening and editorial review.

### Release gates and open risks

1. CI build/type-check and regression tests must pass on the feature pull request.
2. The AAC smoke render must pass and FFprobe must report an AAC stream. The test fixture is intentionally silent.
3. A real Arabic TTS sample must be generated, listened to, and judged for pronunciation, pacing, clipping, and scene synchronization.
4. Android performance, memory, WebGPU/WASM selection, and WebCodecs H.264/AAC support remain unknown until tested on real devices. The app must surface unsupported codec errors rather than silently exporting a silent MP4.
5. The Nabra npm package declares Apache-2.0, but its bundled third-party notice lists eSpeak NG 1.52 under GPL-3.0-or-later and ports logic from GPL-3.0 phonemizer. Preserve the notices and complete a distribution-license review before publishing a build containing this worker. No legal conclusion is made here.
6. This branch is not merged into `main`, and the live Pages application has not been changed by this prototype.

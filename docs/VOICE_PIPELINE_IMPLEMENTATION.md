# Arabic Voice Pipeline — Implementation Specification

Status: engineering specification; not yet integrated into the application.

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
- This specification is not evidence that TTS has been integrated or that audio MP4 export works.

## References

- https://github.com/Oddadmix/nabra-tts
- https://huggingface.co/oddadmix/Nabra-7M-Distill-ONNX
- https://www.remotion.dev/docs/media/audio
- https://www.remotion.dev/docs/web-renderer/can-render-media-on-web
- https://www.remotion.dev/docs/web-renderer/render-media-on-web

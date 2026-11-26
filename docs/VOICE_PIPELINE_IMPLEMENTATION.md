# Arabic Voice Pipeline — Implementation Specification

Status: scene-audio import, durable persistence, preview, project bundling, AAC render wiring, and an opt-in Nabra-based Arabic TTS prototype are implemented in application code. A silent-WAV CI fixture checks the AAC muxing path; spoken output quality and Android performance remain unverified.

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

## Implemented in the application (2026-11-26)

- Each scene may hold an optional narrationAudioAssetId.
- The shared IndexedDB database is version 2 and creates an audio-assets object store alongside the existing project store.
- The scene inspector accepts MP3 and WAV files, up to 30 MB per asset.
- Audio Blobs are stored in IndexedDB; only durable asset IDs are written into project JSON.
- The preview resolves the scene asset to a temporary object URL and passes it into the Remotion Player. The URL is revoked when the selected asset changes or the component is disposed.
- Project export creates a versioned JSON bundle with embedded audio data; import validates scene-to-asset references, remaps IDs, and rejects oversized or incomplete bundles.
- Deleting a scene or project attempts to delete its attached audio assets.
- SceneComposition uses Audio from @remotion/media, nested under the scene Sequence, so the clip begins at that scene timeline start.
- The local MP4 renderer loads durable Blobs, creates temporary URLs, requests AAC capability when audio exists, and releases the URLs after rendering.
- The CI render fixture contains a one-second silent WAV. The updated FFprobe check is intended to verify that the output has an AAC stream. It is a muxing test, not a speech-quality or sync test.

## Implemented local TTS prototype

The editor now exposes **توليد صوت عربي محليًا** for the selected scene:
- The app dynamically imports Nabra TTS only after the user presses the generate button.
- It requests the FP16 model and lets the runtime choose WebGPU or WASM.
- Each scene is limited to 2,400 Unicode characters and is segmented into chunks of at most 160 characters before synthesis to reduce model context truncation.
- The tool concatenates synthesized segments with short silent pauses and writes a WAV Blob.
- The generated WAV is stored through the same IndexedDB asset API as uploaded narration, attached to the exact scene through the typed command boundary, and therefore participates in project bundle export/import and Remotion audio rendering.
- Cancel requests are checked between generated segments; an in-progress model inference call itself is not forcibly interrupted.
- No narration is automatically generated at app startup, and no narration text is sent to a remote TTS inference API.

**Limitations and release gates:**
- One Modern Standard Arabic voice only; no Syrian or other dialect selection.
- No automatic tashkeel/diacritization provider is connected. Pronunciation of unvowelled Arabic may be inconsistent; a manually diacritized script can help.
- The upstream performance table was measured on Apple M-series hardware, not Android. The Xiaomi Mi A3 target has not been tested.
- The 16 MB FP16 figure describes the model weight file, not the total first-run download; ONNX Runtime Web and its WASM runtime add size.
- Nabra's repository identifies its code/model as Apache-2.0 but bundles eSpeak NG under GPL-3.0-or-later. The app repository currently has no top-level LICENSE. Resolve the app's distribution license before treating this integration as a production release.
- The current CI WAV is silent. It checks that an AAC stream is muxed into MP4; it does not prove speech is audible, intelligible, or synchronized against the script. The scene composition now offsets later narration by 22 frames and automatically pads the scene to fit the clip.

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

The UI implementation currently uses MP3 and WAV uploads (not generated WAV) and has no source metadata, sample-rate field, audio-duration field, or stale-voice status yet. Those remain follow-up hardening items.


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

- Narration starts at frame zero in the first scene; later clips wait until the incoming visual entrance completes.
- The UI must show whether narration is absent, generating, ready, or out of date relative to the narration text.
- If narration text changes, the UI hides the stale preview and the export guard refuses to use the old audio.
- Implemented: preview playback, deletion, MP3/WAV import, opt-in local Nabra generation, and a narration-text snapshot that marks an attached clip stale when the script changes.
- The composition must resolve stored Blobs to renderable URLs before rendering and release those URLs afterward.
- Use `Audio` from `@remotion/media`, not `Html5Audio`, because Html5Audio is unsupported by the browser renderer.
- Check browser render capability for an audio codec before enabling audio export. MP4 output needs a compatible audio encoding path (typically AAC).
- Add an automated render fixture containing a short generated or deterministic WAV, then use ffprobe to verify both video and audio streams and their durations.
- The demo uses a silent WAV fixture only to confirm AAC muxing; spoken narration remains a separate acceptance test.

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
- This specification is not evidence that Arabic TTS has been integrated, that the local Android renderer works on a physical device, or that spoken narration is synchronized in a released MP4.

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


## Timeline and license delivery hardening — 26 November 2026

- Later scene narration begins after the incoming visual reveal (22 frames); the first scene begins at frame zero.
- Uploaded and generated narration use the same frame-based duration helper. Scenes expand when needed to fit the voice clip, its incoming delay, and six trailing frames; existing longer scene durations are preserved.
- Regression tests cover the narration offset and duration padding.
- The build now copies Nabra's Apache-2.0 license, upstream third-party notices, and eSpeak NG's GPL-3.0-or-later license text into the public site under `/vendor/nabra-tts/`.
- This makes the component notices reachable from the editor. It does not choose a license for Explainer Studio as a whole; that decision remains a distribution gate.


## Reorder-safe narration duration — 26 November 2026

- Each attached voice clip stores its decoded duration in `narrationAudioDurationSeconds`, independently of the scene duration.
- The composition recalculates required duration from the clip length and the scene's current order. Moving a voice-bearing scene to a later position automatically adds the incoming narration delay.
- Sequence durations, scene start frames, and total project duration all use the same index-aware frame calculation.
- The upload path, local TTS path, and agent automation bridge persist the same duration metadata.
- Regression coverage checks that moving a narration-bearing scene from first to second position extends it and leaves a gap before the next clip.


## Confirmed end-to-end speech smoke test — 26 November 2026

A CI run generated non-silent Arabic speech with Nabra FP16/WASM, then a separate Remotion CLI run rendered real Nabra narration into MP4.

- Nabra WAV: mono PCM, 24 kHz, 4.9 seconds, peak 0.4661, RMS 0.09668.
- MP4: 24.619 seconds, H.264 1920×1080 at 30fps, AAC-LC 48 kHz stereo.
- FFmpeg measured max_volume near -6.6 dB after AAC muxing.
- The MP4 was downloaded and representative visual frames were reviewed.
- This is evidence of speech synthesis and audio muxing in CI, not a human listening assessment or Android-device acceptance test.
- A later smoke run exposed a regular-expression escaping bug in the max_volume parser. The underlying diagnostic file already contained a valid measurement; the matcher was fixed in commit `fc4243080b6f92f17d76af5e0610566885224e82`, and the follow-up run `45808668420` completed successfully, including its AAC signal check.

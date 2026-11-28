# Build configuration notes

The Android editor build now:
- Uses the current Android setup action without requesting the removed legacy `tools` package.
- Installs the Godot-pinned Android NDK and platform/build-tools versions.
- Installs Godot's Swappy frame-pacing libraries using the upstream helper script.
- Applies the Arabic Android resources and the Android-only Arabic language and RTL defaults.
- Builds the ARM64 editor with `swappy=yes`.

See `.github/workflows/build-android-editor.yml`. A successful APK build and physical-device verification are still required before describing this artifact as ready to install.

- Packages the 20-lesson Godot project separately from the editor APK. The APK is the Android editor; the ZIP is the project opened inside it.

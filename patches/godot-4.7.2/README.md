# Native Android resource patch — Godot 4.7.2

This patch adds Android-native Arabic translations for the editor's Android-specific permission messages, game-run menu, embedded game hints, and camera controls.

Source file in the pinned upstream tree:
`platform/android/java/editor/src/main/res/values/strings.xml`

Overlay supplied by this repository:
`patches/godot-4.7.2/platform/android/java/editor/src/main/res/values-ar/strings.xml`

The Android resource is copied into the pinned Godot source tree before SCons starts. Android selects the `values-ar` resources when the device locale is Arabic. The original default English resources remain unchanged.

This is the first native Android editor modification. It does **not** translate the entire Godot C++ editor UI; that requires a separate localization and editor-UX effort. The current patch only translates the Android-hosted strings enumerated in the resource file.

Validation currently checks XML well-formedness and duplicate resource names. APK packaging and on-device locale behavior still require the Android Editor build workflow and physical-device verification.

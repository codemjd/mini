# Arabic localization in the upstream Godot editor

Godot 4.7.2 already ships an Arabic editor translation at:

`editor/translations/editor/ar.po`

The editor language preference is declared in `editor/settings/editor_settings.cpp` as `interface/editor/localization/editor_language`. Its standard default is `auto`, which compares the host locale against the editor locales. The editor also exposes `interface/editor/localization/ui_layout_direction`, whose default is based on the application locale.

The Arabic translation is substantial, but not every source string is translated. We must not claim a complete translation without auditing the PO catalog and testing the actual interface.

## Godot Mentor policy

For the Android Mentor build only, we patch the default language value from `auto` to `ar`. This is a default only; the user can still select another editor language in Editor Settings. The standard desktop Godot build remains unchanged.

The Android-specific text resources are separately localized under `platform/android/java/editor/src/main/res/values-ar/strings.xml`.

## Native patch

`native/0001-android-default-arabic-language.patch` modifies the setting default behind `ANDROID_ENABLED`. The Android build workflow applies it to the pinned 4.7.2 source before SCons compilation.

## Remaining verification

- Confirm the patch applies cleanly to the selected upstream tag.
- Build the ARM64 editor APK.
- Install it on an Android device with Arabic and non-Arabic system locales.
- Verify Arabic labels, text shaping, mixed Arabic/English terms, and right-to-left layout throughout the C++ editor.
- Verify the user can change the language and that the preference persists after restart.

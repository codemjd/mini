#!/usr/bin/env python3
"""Brand the Android editor APK while keeping it installable beside official Godot."""
from pathlib import Path
import re
import sys

APP_ID_PATTERN = re.compile(r'(?m)^([ \t]*)applicationId "org\.godotengine\.editor\.v4"$')
APP_NAME_PATTERN = re.compile(r'(?m)^([ \t]*)editorAppName: "Godot Engine 4",$')

def apply(target: Path) -> None:
    source = target.read_text(encoding="utf-8")
    new_id = 'applicationId "org.godotmentor.editor"'
    new_name = 'editorAppName: "مرشد Godot",'

    if new_id in source and new_name in source:
        print("Godot Mentor Android application branding already applied:", target)
        return
    if new_id in source or new_name in source:
        raise SystemExit("Found a partial application branding patch; refusing to continue.")

    id_matches = list(APP_ID_PATTERN.finditer(source))
    name_matches = list(APP_NAME_PATTERN.finditer(source))
    if len(id_matches) != 1 or len(name_matches) != 1:
        raise SystemExit(
            "Expected exactly one official Android editor applicationId and app name; "
            f"found applicationId={len(id_matches)}, appName={len(name_matches)}. "
            "Inspect the pinned Gradle source before modifying."
        )

    source = APP_ID_PATTERN.sub(lambda m: m.group(1) + new_id, source, count=1)
    source = APP_NAME_PATTERN.sub(lambda m: m.group(1) + new_name, source, count=1)
    target.write_text(source, encoding="utf-8")
    print("Applied Godot Mentor Android application branding:", target)

if __name__ == "__main__":
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(
        "godot-source/platform/android/java/editor/build.gradle"
    )
    apply(path)

#!/usr/bin/env python3
"""Safely set Godot's editor-language default to Arabic in Android builds only."""
from pathlib import Path
import re
import sys

pattern = re.compile(
    r'(?m)^([ \t]*)EDITOR_SETTING_USAGE\(Variant::STRING, PROPERTY_HINT_ENUM, '
    r'"interface/editor/localization/editor_language", "auto", lang_hint, '
    r'PROPERTY_USAGE_DEFAULT \| PROPERTY_USAGE_RESTART_IF_CHANGED \| '
    r'PROPERTY_USAGE_EDITOR_BASIC_SETTING\);[ \t]*$'
)

def apply(target: Path) -> None:
    source = target.read_text(encoding="utf-8")
    if 'String default_editor_language = "auto";' in source and 'default_editor_language = "ar";' in source:
        print("Already applied:", target)
        return
    matches = list(pattern.finditer(source))
    if len(matches) != 1:
        raise SystemExit(
            f"Expected exactly one known editor-language default in {target}; found {len(matches)}. "
            "Stop and inspect the new Godot source instead of guessing."
        )
    indent = matches[0].group(1)
    replacement = "\n".join([
        indent + "// Godot Mentor: Arabic is the first-launch default on Android; users can change it.",
        indent + 'String default_editor_language = "auto";',
        indent + "#ifdef ANDROID_ENABLED",
        indent + 'default_editor_language = "ar";',
        indent + "#endif",
        indent + 'EDITOR_SETTING_USAGE(Variant::STRING, PROPERTY_HINT_ENUM, "interface/editor/localization/editor_language", default_editor_language, lang_hint, PROPERTY_USAGE_DEFAULT | PROPERTY_USAGE_RESTART_IF_CHANGED | PROPERTY_USAGE_EDITOR_BASIC_SETTING);',
    ])
    target.write_text(pattern.sub(lambda _m: replacement, source, count=1), encoding="utf-8")
    print("Applied Android Arabic-first editor setting:", target)

if __name__ == "__main__":
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("godot-source/editor/settings/editor_settings.cpp")
    apply(path)

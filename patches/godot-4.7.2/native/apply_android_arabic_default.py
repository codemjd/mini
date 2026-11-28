#!/usr/bin/env python3
"""Set Arabic + right-to-left defaults in Godot Mentor Android editor builds only."""
from pathlib import Path
import re
import sys

LANGUAGE_PATTERN = re.compile(
    r'(?m)^([ \t]*)EDITOR_SETTING_USAGE\(Variant::STRING, PROPERTY_HINT_ENUM, '
    r'"interface/editor/localization/editor_language", "auto", lang_hint, '
    r'PROPERTY_USAGE_DEFAULT \| PROPERTY_USAGE_RESTART_IF_CHANGED \| '
    r'PROPERTY_USAGE_EDITOR_BASIC_SETTING\);[ \t]*$'
)
DIRECTION_PATTERN = re.compile(
    r'(?m)^([ \t]*)EDITOR_SETTING_USAGE\(Variant::INT, PROPERTY_HINT_ENUM, '
    r'"interface/editor/localization/ui_layout_direction", 0, '
    r'"Based on Application Locale,Left-to-Right,Right-to-Left,Based on System Locale", '
    r'PROPERTY_USAGE_DEFAULT \| PROPERTY_USAGE_RESTART_IF_CHANGED\)[ \t]*$'
)

def apply(target: Path) -> None:
    source = target.read_text(encoding="utf-8")
    language_marker = 'String default_editor_language = "auto";'
    direction_marker = "int default_ui_layout_direction = 0;"
    if language_marker in source and direction_marker in source:
        if 'default_editor_language = "ar";' in source and "default_ui_layout_direction = 2;" in source:
            print("Arabic + RTL defaults already applied:", target)
            return
        raise SystemExit("Found a partial Godot Mentor patch. Refusing to modify uncertain source.")

    language_matches = list(LANGUAGE_PATTERN.finditer(source))
    direction_matches = list(DIRECTION_PATTERN.finditer(source))
    if len(language_matches) != 1 or len(direction_matches) != 1:
        raise SystemExit(
            "Expected one known editor-language line and one known layout-direction line; "
            f"found language={len(language_matches)}, direction={len(direction_matches)}. "
            "The pinned Godot source may have changed; inspect it before patching."
        )

    language_indent = language_matches[0].group(1)
    language_replacement = "\n".join([
        language_indent + "// Godot Mentor: Arabic is the first-launch default on Android; users can change it.",
        language_indent + 'String default_editor_language = "auto";',
        language_indent + "#ifdef ANDROID_ENABLED",
        language_indent + 'default_editor_language = "ar";',
        language_indent + "#endif",
        language_indent + 'EDITOR_SETTING_USAGE(Variant::STRING, PROPERTY_HINT_ENUM, "interface/editor/localization/editor_language", default_editor_language, lang_hint, PROPERTY_USAGE_DEFAULT | PROPERTY_USAGE_RESTART_IF_CHANGED | PROPERTY_USAGE_EDITOR_BASIC_SETTING);',
    ])
    source = LANGUAGE_PATTERN.sub(lambda _m: language_replacement, source, count=1)

    direction_indent = direction_matches[0].group(1)
    direction_replacement = "\n".join([
        direction_indent + "// Godot Mentor: use right-to-left layout with the Arabic Android editor.",
        direction_indent + "int default_ui_layout_direction = 0;",
        direction_indent + "#ifdef ANDROID_ENABLED",
        direction_indent + "default_ui_layout_direction = 2;",
        direction_indent + "#endif",
        direction_indent + 'EDITOR_SETTING_USAGE(Variant::INT, PROPERTY_HINT_ENUM, "interface/editor/localization/ui_layout_direction", default_ui_layout_direction, "Based on Application Locale,Left-to-Right,Right-to-Left,Based on System Locale", PROPERTY_USAGE_DEFAULT | PROPERTY_USAGE_RESTART_IF_CHANGED)',
    ])
    source = DIRECTION_PATTERN.sub(lambda _m: direction_replacement, source, count=1)

    if language_marker not in source or direction_marker not in source:
        raise SystemExit("Patch output did not contain both expected guarded defaults.")
    if 'default_editor_language = "ar";' not in source or "default_ui_layout_direction = 2;" not in source:
        raise SystemExit("Patch output is missing Arabic or RTL value.")

    target.write_text(source, encoding="utf-8")
    print("Applied Android Arabic + RTL defaults:", target)


if __name__ == "__main__":
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("godot-source/editor/settings/editor_settings.cpp")
    apply(path)

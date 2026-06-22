#!/usr/bin/env python3
"""Chrome MV3 i18n messages.json validator.

Chrome refuses to load a locale file if any key uses a different JSON shape than
the rest of the file (Chrome treats "all-object" and "all-flat-string" as the two
valid shapes, but mixing them fails with:
    "Not a valid tree for key <name>"
https://developer.chrome.com/docs/extensions/reference/api/i18n#locales

Usage:
    python3 validate_locales.py <locales_dir>
    # default: /root/bookmarkhub-workspace/bookmarkhub/src/public/_locales

Exit codes:
    0 = all locale files pass
    1 = at least one file has mixed/invalid shape
"""
import json
import sys
from pathlib import Path

LOCALES_DIR_DEFAULT = Path("/root/bookmarkhub-workspace/bookmarkhub/src/public/_locales")


def validate_locale(path: Path) -> tuple[bool, list[str]]:
    """Return (ok, errors). ok=True means the file is loadable by Chrome."""
    errors: list[str] = []
    try:
        text = path.read_text(encoding="utf-8")
        data = json.loads(text)
    except json.JSONDecodeError as e:
        return False, [f"JSON parse error: {e}"]

    if not isinstance(data, dict):
        return False, ["root must be a JSON object"]

    flat_keys: list[str] = []
    obj_keys: list[str] = []
    for k, v in data.items():
        if isinstance(v, str):
            flat_keys.append(k)
        elif isinstance(v, dict):
            obj_keys.append(k)
            # Validate inner object
            if "message" not in v:
                errors.append(f"key {k!r} is missing required 'message' field")
            elif not isinstance(v["message"], str):
                errors.append(f"key {k!r}.message is not a string")
            if "description" in v and not isinstance(v["description"], str):
                errors.append(f"key {k!r}.description is not a string")
            if "placeholders" in v:
                ph = v["placeholders"]
                if not isinstance(ph, dict):
                    errors.append(f"key {k!r}.placeholders is not an object")
                else:
                    for phk, phv in ph.items():
                        if not isinstance(phv, dict) or "content" not in phv:
                            errors.append(
                                f"key {k!r}.placeholders.{phk} missing required 'content'"
                            )
        else:
            errors.append(f"key {k!r} has invalid type {type(v).__name__}")

    if flat_keys and obj_keys:
        errors.append(
            f"MIXED FORMAT: {len(flat_keys)} flat-string keys + {len(obj_keys)} object keys. "
            f"Chrome refuses mixed format. Offending flat keys: {flat_keys[:5]}"
        )

    return not errors, errors


def main():
    locales_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else LOCALES_DIR_DEFAULT
    if not locales_dir.is_dir():
        print(f"ERROR: {locales_dir} is not a directory", file=sys.stderr)
        return 2

    any_fail = False
    print(f"Validating {locales_dir}")
    print("-" * 70)
    for p in sorted(locales_dir.glob("*/messages.json")):
        ok, errors = validate_locale(p)
        flag = "✅" if ok else "❌"
        print(f"{flag} {p.parent.name}: {len(errors)} errors")
        for e in errors:
            print(f"    - {e}")
        if not ok:
            any_fail = True
    print("-" * 70)
    if any_fail:
        print("RESULT: ❌ FAIL — Chrome will refuse to load at least one locale file")
        return 1
    print("RESULT: ✅ ALL PASS — every locale file is loadable by Chrome")
    return 0


if __name__ == "__main__":
    sys.exit(main())

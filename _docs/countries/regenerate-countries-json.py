#!/usr/bin/env python3
"""Rebuild countries.json from theme inc/countries.php and languages/ui-de.php."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
ROOT = BUNDLE.parent.parent
COUNTRIES_PHP = ROOT / "inc/countries.php"
UI_DE = ROOT / "languages/ui-de.php"
OUT_JSON = BUNDLE / "countries.json"
FLAGS_DIR = BUNDLE / "flags"


def label(ui_text: str, prefix: str, code: str) -> str:
    pattern = rf"'{re.escape(prefix)}:{re.escape(code)}'\s*=>\s*'((?:\\'|[^'])*)'"
    match = re.search(pattern, ui_text)
    if not match:
        return ""
    return match.group(1).replace("\\'", "'")


def main() -> int:
    if not COUNTRIES_PHP.is_file() or not UI_DE.is_file():
        print("Theme source files missing.", file=sys.stderr)
        return 1

    php = COUNTRIES_PHP.read_text(encoding="utf-8")
    ui = UI_DE.read_text(encoding="utf-8")
    codes = re.findall(r"^\s*'([a-z]{2})',\s*$", php, re.M)

    items = []
    for code in codes:
        flag_file = f"{code}.svg"
        flag_path = FLAGS_DIR / flag_file
        items.append(
            {
                "iso": code,
                "name_de": label(ui, "country", code),
                "name_en": label(ui, "country-en", code),
                "flag_svg": flag_file if flag_path.is_file() else None,
            }
        )

    OUT_JSON.write_text(
        json.dumps({"countries": items}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    with_flags = sum(1 for row in items if row["flag_svg"])
    print(f"Wrote {OUT_JSON.name}: {len(items)} codes, {with_flags} with flags.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

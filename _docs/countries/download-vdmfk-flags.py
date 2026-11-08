#!/usr/bin/env python3
"""Download VDMFK country flag SVGs from saved HTML export."""

from __future__ import annotations

import json
import re
import sys
import time
import urllib.error
import urllib.request
from html import unescape
from pathlib import Path

DOCS = Path(__file__).resolve().parent.parent
HTML_FILE = DOCS / "Current-Datas" / "flags-svgs-vdmfk.html"
OUT_DIR = DOCS / "Flags"
LINKS_JSON = OUT_DIR / "flag-links.json"

ITEM_PATTERN = re.compile(
    r'<a class="vdmfk-land" href="([^"]+)"[^>]*>'
    r'<img[^>]+src="([^"]+vdmfk-flags/([^"]+\.svg))"[^>]*>'
    r'<span class="vdmfk-land__name">([^<]+)</span></a>',
    re.DOTALL,
)


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", unescape(value)).strip()


def download(url: str, dest: Path, retries: int = 3) -> None:
    if dest.exists() and dest.stat().st_size > 0:
        return

    request = urllib.request.Request(
        url,
        headers={"User-Agent": "MFKA-Theme-Dev/1.0 (local asset migration)"},
    )

    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                dest.write_bytes(response.read())
            return
        except (urllib.error.URLError, TimeoutError) as error:
            if attempt == retries:
                raise
            time.sleep(attempt * 2)
            print(f"  retry {attempt}/{retries - 1}: {error}", file=sys.stderr)


def main() -> int:
    if not HTML_FILE.exists():
        print(f"Missing HTML file: {HTML_FILE}", file=sys.stderr)
        return 1

    html = HTML_FILE.read_text(encoding="utf-8", errors="replace")
    matches = list(ITEM_PATTERN.finditer(html))

    if not matches:
        print("No flag items found in HTML.", file=sys.stderr)
        return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    items: list[dict[str, str]] = []

    for index, match in enumerate(matches, start=1):
        link_url = clean_text(match.group(1))
        svg_url = clean_text(match.group(2))
        filename = clean_text(match.group(3))
        name = clean_text(match.group(4))
        iso = Path(filename).stem.lower()
        dest = OUT_DIR / filename

        print(f"[{index}/{len(matches)}] {filename} — {name} → {link_url}")

        try:
            download(svg_url, dest)
        except Exception as error:  # noqa: BLE001 - script should continue on single failures
            print(f"  FAILED: {error}", file=sys.stderr)
            continue

        items.append(
            {
                "iso": iso,
                "name": name,
                "url": link_url,
                "flag_svg": filename,
                "source_url": svg_url,
            }
        )

        time.sleep(0.1)

    LINKS_JSON.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\nDone: {len(items)} flags in {OUT_DIR}")
    print(f"Links: {LINKS_JSON.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

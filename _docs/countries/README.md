# Countries export bundle

Portable copy of MFKA country data (flags, ISO codes, DE/EN names) for use in **other** projects. Not wired into this theme.

## Contents

| File / folder | Description |
|---------------|-------------|
| `flags/` | VDMFK flag SVGs (`{iso}.svg`). 42 files; 40 match the ISO list below, plus `ch.svg`, `ie.svg` (VDMFK page only). |
| `countries.json` | All 71 ISO codes with `name_de`, `name_en`, `flag_svg` (or `null` if no file). |
| `labels-de.php` / `labels-en.php` | Standalone PHP arrays: code → label. |
| `countries.php` | Theme helper copy (`mfka_country_*` functions) for reference. |
| `acf-country-choices.txt` | ACF Select choices: `code : DE / EN` |
| `flag-links-vdmfk.json` | VDMFK member links + flag URLs (subset of countries). |
| `info-country-select.md` | Original field documentation. |
| `download-vdmfk-flags.py` | Script used to fetch SVGs from VDMFK HTML export. |

## Missing flags (31)

These codes are in `countries.json` but have no SVG in `flags/` yet (not on the VDMFK flags page export):  
`af`, `eg`, `dz`, `by`, `ba`, `cl`, `ec`, `sv`, `er`, `gh`, `gt`, `ht`, `hk`, `in`, `id`, `ir`, `is`, `xk`, `cu`, `mg`, `mt`, `mu`, `mk`, `np`, `ru`, `rs`, `tn`, `ug`, `ua`, `ve`, `cn`.

Source for existing flags: `_docs/Current-Datas/flags-svgs-vdmfk.html` → `python3 download-vdmfk-flags.py` (paths in script point at `Current-Datas`; adjust `OUT_DIR` if re-downloading).

## Regenerate `countries.json`

From theme root, after editing `inc/countries.php` or `languages/ui-de.php`:

```bash
python3 _docs/countries/regenerate-countries-json.py
```

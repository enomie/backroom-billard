# Country Select (ACF)

ACF-Feld `country_select` — Select mit ISO-3166-1-alpha-2-Code als Value.

## ACF-Einstellungen

| Setting | Wert |
|---------|------|
| Field Label | Country Select |
| Field Name | `country_select` |
| Field Type | Select |
| Default Value | `at` |

## Choices (für ACF eingeben)

Format: `code : Deutsch / Englisch`

```
af : Afghanistan / Afghanistan
eg : Ägypten / Egypt
dz : Algerien / Algeria
ar : Argentinien / Argentina
au : Australien / Australia
by : Belarus / Belarus
be : Belgien / Belgium
ba : Bosnien und Herzegowina / Bosnia and Herzegovina
br : Brasilien / Brazil
cl : Chile / Chile
dk : Dänemark / Denmark
de : Deutschland / Germany
ec : Ecuador / Ecuador
sv : El Salvador / El Salvador
er : Eritrea / Eritrea
ee : Estland / Estonia
fi : Finnland / Finland
fr : Frankreich / France
gh : Ghana / Ghana
gr : Griechenland / Greece
gb : Grossbritannien / United Kingdom
gt : Guatemala / Guatemala
ht : Haiti / Haiti
hk : Hongkong / Hong Kong
in : Indien / India
id : Indonesien / Indonesia
ir : Iran / Iran
is : Island / Iceland
il : Israel / Israel
it : Italien / Italy
jp : Japan / Japan
ca : Kanada / Canada
co : Kolumbien / Colombia
xk : Kosovo / Kosovo
hr : Kroatien / Croatia
cu : Kuba / Cuba
mg : Madagaskar / Madagascar
my : Malaysia / Malaysia
mt : Malta / Malta
mu : Mauritius / Mauritius
mk : Mazedonien / North Macedonia
mx : Mexiko / Mexico
np : Nepal / Nepal
nz : Neuseeland / New Zealand
nl : Niederlande / Netherlands
no : Norwegen / Norway
at : Österreich / Austria
pe : Peru / Peru
ph : Philippinen / Philippines
pl : Polen / Poland
pt : Portugal / Portugal
ro : Rumänien / Romania
ru : Russland / Russia
se : Schweden / Sweden
rs : Serbien / Serbia
sg : Singapur / Singapore
sk : Slowakei / Slovakia
si : Slowenien / Slovenia
es : Spanien / Spain
za : Südafrika / South Africa
kr : Südkorea / South Korea
tw : Taiwan / Taiwan
th : Thailand / Thailand
cz : Tschechien / Czech Republic
tn : Tunesien / Tunisia
ug : Uganda / Uganda
ua : Ukraine / Ukraine
hu : Ungarn / Hungary
us : USA / United States
ve : Venezuela / Venezuela
cn : Volksrepublik China / China
```

## Was in der DB landet

Nur der **Code** (z. B. `at`) — das Label ist nur für die Backend-Auswahl.

## Frontend

Labels in `languages/ui-de.php` (`country:{code}` → DE, `country-en:{code}` → EN).

Helper in `inc/countries.php`:

| Funktion | Zweck |
|----------|--------|
| `mfka_country_codes()` | Alle gültigen ISO-Codes |
| `mfka_country_label( $code )` | Deutscher Name (Frontend) |
| `mfka_country_label_en( $code )` | Englischer Name (für spätere EN-Version) |
| `mfka_normalize_country_code( $code )` | Validieren + normalisieren |

Künstler-spezifisch in `inc/artists.php`: `mfka_get_artist_country_code()`, `mfka_get_artist_country_label()`.

Filter-URL: `/kuenstler/?land=at` (statt altem Slug `oesterreich`).

## Hinweise

- Kosovo: `xk` (inoffiziell, aber weit verbreitet — kein offizieller ISO-Code)
- UK: `gb` (ISO-Standard)
- Mexiko war in der alten Quelle doppelt — hier nur einmal
- Ersetzt die bisherigen Freitext-Felder `country_de` / `country_en`

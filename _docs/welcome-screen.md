# Welcome-Screen (Namen und erster Einkauf)

> **Status: Konzept, noch nicht umgesetzt.** Dieser Screen kommt **nach dem Startscreen** (Alterbestätigung, siehe README) und **vor dem Spiel**. Er erscheint **bei jedem Besuch**.

Hier gibt der Spieler seinen Namen ein und kauft gleich die ersten Dinge. Alles bleibt **nur im Browser** (keine Datenbank, nichts wird gesendet).

## Ablauf

1. Startscreen: Bad Habits Games, PRESENT, Titel, **Confirm Age 18+** (wird bei jedem Besuch gefragt).
2. **Dieser Screen** (**jedes Mal**, mit den gespeicherten Angaben vorausgefüllt): Name, Getränk, Zigaretten, **Continue**.
3. Das Spiel (die Auswahl ist schon im Glas und in der Packung).

Das Spiel lädt wie beim Startscreen im Hintergrund weiter; der Screen blendet aus, wenn **Continue** gedrückt ist und das Spiel bereit ist.

## Titel des Screens

**Welcome** (deutsch **Willkommen**). Er läuft wie alle Texte durch `src/i18n` (Englisch und Deutsch).

## Aussehen

Minimalistisch wie der Startscreen: Hintergrund `#1c1c1a`, zentriert, Roboto (Breite 75 %), gelb als Akzent, **keine Kästen**: Die Eingabefelder sind nur eine dünne Linie unten mit einer kleinen Beschriftung darüber (Floating Label). Der Titel des Spiels (Limelight) steht nicht noch einmal da.

## Name: drei Felder

| Feld | Pflicht | Beschriftung (en / de) |
|------|---------|------------------------|
| Vorname | ja | First name / Vorname |
| Zweiter Name | **nein** (darf leer bleiben) | Middle name / Zweiter Name |
| Nachname | ja | Last name / Nachname |

- **Am PC nebeneinander** (drei Spalten), **am Handy untereinander**.
- **Erlaubt:** nur **Buchstaben** (alle Schriften und Akzente: ä ö ü ß é ñ …, nicht nur A–Z), der **Punkt `.`** und der **Bindestrich `-`**. Alles andere (Ziffern, Leerzeichen, Sonderzeichen) wird beim Tippen gar nicht angenommen (kein Fehlertext nötig). Doppelnamen gehen also mit Bindestrich: „Anna-Lena“.
- **Form:** Ein Bindestrich nicht am Anfang oder Ende und nicht doppelt (`--`), ein Punkt nur nach einem Buchstaben und nicht doppelt (`..`); mindestens ein Buchstabe pro ausgefülltem Feld; höchstens 24 Zeichen je Feld (Vorschlag).
- **Groß- und Kleinschreibung:** Der erste Buchstabe jedes Namensteils (und nach einem Bindestrich) wird automatisch groß (aus „mario“ wird „Mario“), der Rest bleibt, wie getippt (damit „McDonald“ oder „de la Cruz“ nicht zerstört wird). Vorschlag, noch zu bestätigen.
- **Enter** springt zum nächsten Feld, im letzten löst es **Continue** aus (wenn alles gültig ist).

## Zweiter Name: voll oder nur als Initiale

Der zweite Name kann **als Initiale** (`T.`) oder **ausgeschrieben** (`Theodor`) eingegeben werden. Wir speichern beides:

- `middleName`: so, wie er eingegeben wurde (`T.` oder `Theodor`).
- `middleInitial`: **immer** die Kurzform, daraus abgeleitet (`T.`).

Die Kurzform entsteht so: erster Buchstabe, groß, plus Punkt (`Theodor` → `T.`); bei Doppelnamen je Teil (`Jean-Luc` → `J.-L.`); ist es schon eine Initiale (`T.`, `t`), bleibt `T.`.

Wo der Name vorkommt, wird die passende Form genommen:

| Wo | Form | Beispiel |
|----|------|----------|
| Wo viel Platz ist (Profil, später Ranglisten) | voll | Anna Theodor Meier |
| Wo wenig Platz ist (HUD, Tischliste, Wette) | mit Initiale | Anna T. Meier |
| Ganz knapp | nur Initialen | A. T. M. |

Ohne zweiten Namen entfällt der mittlere Teil.

## Einkauf

Am Anfang, **beim allerersten Besuch**, bekommt der Spieler `START_MONEY` (**15.000 $**). Der Screen zeigt den Stand oben; er sinkt **sofort** beim Auswählen (wie im Spiel: bezahlt wird bei der Wahl, nicht erst bei **Continue**; wer zurückwählt, bekommt es zurück). Beides ist **Pflicht**:

- **Ein Getränk aus allen fünf** (`DRINK_MENU`, `shop-constants.js`): Bier 8 $, Rotwein 14 $, Weißwein 14 $, White Russian 16 $, Whiskey 18 $. Es ist das erste volle Glas.
- **Eine Zigarettenpackung, entweder oder:** **Premium Blend** (schwarz/rot/gold) oder **Light Blend** (weiß/blau) (`PACK_DESIGNS`), je `PACK_PRICE` (75 $). Man muss eine nehmen, weil man ja rauchen muss; es gibt kein „keine“. Das Entweder-oder gilt nur für die Zigaretten, beim Getränk wählt man eines von allen.

Die Wahl ersetzt das Glas und die Packung, die der Spieler sonst zu Beginn bekäme. Nicht bezahlbare Einträge sind grau.

## Geld bleibt

Das Geld wird **gespeichert**: jede Ausgabe (hier und im Spiel: Getränke an der Karte, neue Packungen) schreibt den neuen Stand sofort in den Browser. Wer etwas ausgibt und die Seite neu lädt, hat danach **weniger** Geld, nicht wieder 15.000 $. Nur ohne gespeichertes Profil (erster Besuch) gibt es die 15.000 $.

Bei jedem weiteren Besuch kauft der Spieler auf diesem Screen **wieder** sein erstes Getränk und seine erste Packung (jeder Besuch beginnt mit einem vollen Glas und einer Packung), und das kostet erneut. Das Spiel verliert damit nichts, das Geld sinkt aber mit jedem Besuch (siehe Offene Fragen: Pleite).

## Continue

Der Knopf **Continue** ist **aktiv**, wenn Vorname und Nachname gültig sind und ein Getränk und eine Packung gewählt sind. Er ist im Stil des Startscreens: dünner gelber Rahmen. Ein Klick speichert das Profil und öffnet das Spiel.

## Speichern (nur im Browser)

Ein Eintrag in `localStorage` unter `backroom-billard.profile` (JSON):

```json
{
  "version": 1,
  "firstName": "Anna",
  "middleName": "Theodor",
  "middleInitial": "T.",
  "lastName": "Meier",
  "firstDrink": "whiskey",
  "firstPack": 0,
  "money": 14907,
  "createdAt": "2026-11-08T20:00:00.000Z"
}
```

- Beim nächsten Besuch sind die Felder und die Auswahl **vorausgefüllt** (man kann sie ändern); die Altersfrage kommt trotzdem jedes Mal.
- `money` ist der Stand nach jeder Ausgabe (siehe „Geld bleibt“); fehlt das Profil, startet er bei `START_MONEY`.
- Ist `localStorage` nicht nutzbar (privater Modus, gesperrt), läuft das Spiel trotzdem; der Name wird dann nur für diese Sitzung gehalten.
- Es wird **nichts gesendet**. Der Name verlässt den Browser nicht.
- `version` erlaubt, das Format später zu ändern.

## Umsetzung (geplant)

| Datei | Inhalt |
|-------|--------|
| `src/name-rules.js` | Reine Funktionen: Filtern beim Tippen, Prüfen, Großschreibung, `middleInitial` ableiten, Anzeige-Formen (voll, mit Initiale, nur Initialen) |
| `src/profile-store.js` | Lesen und Schreiben des Profils in `localStorage` (mit Schutz gegen Fehler), auch das Geld |
| `src/welcome-screen.js` | Der Screen: Felder, Auswahl, Geld, Continue |
| `index.html`, `style.css` | Markup und Stil (wie der Startscreen) |
| `src/entry.js` | Ablauf: Startscreen → dieser Screen → Spiel |

Dazu Texte in `en.js` und `de.js`, Kauf über dieselbe Preisliste wie im Spiel (`shop-constants.js`), das Geld über `wallet.js`, das den Stand beim Start aus dem Profil liest und bei jeder Änderung speichert. Die Namensregeln werden als reine Funktionen mit einer Reihe von Beispielen getestet.

## Entschieden

- Titel: **Welcome** (de: Willkommen).
- Der Screen kommt **bei jedem Besuch**.
- Zigaretten: **entweder oder** zwischen den zwei Packungen, Pflicht. Getränk: **eines von allen fünf**, Pflicht.
- Das Geld bleibt gespeichert, inklusive aller Ausgaben; die 15.000 $ gibt es nur beim ersten Mal.

## Offene Fragen

- **Pleite:** Reicht das Geld nicht mehr für ein Getränk (ab 8 $) **und** eine Packung (75 $), also unter 83 $, kann man nicht weiter. Was dann? Vorschlag: ein Knopf „Neu anfangen“ (löscht das Profil, neue 15.000 $), mit Bestätigung.
- **Wiederkehrer:** Soll bei jedem Besuch wirklich wieder gekauft werden (Geld sinkt), oder nur beim ersten Besuch und danach bleibt das Inventar (Glas und Packung) erhalten? Oben steht der erste Fall; der zweite bräuchte das Speichern von Füllstand und Packung.
- **Wo erscheint der Name im Spiel?** HUD, später Mehrspieler, Wette, Rangliste: wird mit dem Spielkonzept (`game-concept.md`, Ideen) entschieden.

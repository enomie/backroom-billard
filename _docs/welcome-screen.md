# Namens-Screen (Arbeitstitel)

> **Status: Konzept, noch nicht umgesetzt.** Dieser Screen kommt **nach dem Startscreen** (Alterbestätigung, siehe README) und **vor dem Spiel**. Titel offen.

Hier gibt der Spieler seinen Namen ein und kauft gleich die ersten Dinge. Alles bleibt **nur im Browser** (keine Datenbank, nichts wird gesendet).

## Ablauf

1. Startscreen: Bad Habits Games, PRESENT, Titel, **Confirm Age 18+** (wird bei jedem Besuch gefragt).
2. **Dieser Screen:** Name, erstes Getränk, erste Zigaretten, **Continue**.
3. Das Spiel (die Auswahl ist schon im Glas und in der Packung).

Das Spiel lädt wie beim Startscreen im Hintergrund weiter; der Screen blendet aus, wenn **Continue** gedrückt ist und das Spiel bereit ist.

## Titel des Screens

Offen. Vorschläge: „Wer bist du?“, „Willkommen im Backroom“, „Name, bitte“. Der Titel läuft wie alle Texte durch `src/i18n` (Englisch und Deutsch).

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

## Erster Einkauf

Das Startgeld ist `START_MONEY` (15.000 $). Der Screen zeigt es oben, es sinkt **sofort** beim Auswählen (wie im Spiel: Getränk und Packung werden bei der Wahl bezahlt, nicht erst bei **Continue**; wer zurückwählt, bekommt es zurück).

- **Erstes Getränk:** aus der Getränkekarte (`DRINK_MENU`, `shop-constants.js`): Bier 8 $, Rotwein 14 $, Weißwein 14 $, White Russian 16 $, Whiskey 18 $. Es ist das erste volle Glas des Spielers.
- **Erste Zigaretten:** ein **Entweder-oder-Feld** (Auswahl ohne „keine“), weil man ja rauchen muss: eine der zwei Packungen (`PACK_DESIGNS`): **Premium Blend** (schwarz/rot/gold) oder **Light Blend** (weiß/blau), je `PACK_PRICE` (75 $). Eine Wahl ist **Pflicht**.

Die Auswahl ersetzt das Glas und die Packung, die der Spieler sonst zu Beginn bekäme.

## Continue

Der Knopf **Continue** ist **aktiv**, wenn Vorname und Nachname gültig sind und die Zigaretten gewählt sind (und, falls das Getränk Pflicht ist, auch das Getränk, siehe Offene Fragen). Er ist im Stil des Startscreens: dünner gelber Rahmen. Ein Klick speichert das Profil und öffnet das Spiel.

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
  "createdAt": "2026-11-08T20:00:00.000Z"
}
```

- Beim nächsten Besuch sind die Felder **vorausgefüllt** (man kann sie ändern); die Altersfrage kommt trotzdem jedes Mal.
- Ist `localStorage` nicht nutzbar (privater Modus, gesperrt), läuft das Spiel trotzdem; der Name wird dann nur für diese Sitzung gehalten.
- Es wird **nichts gesendet**. Der Name verlässt den Browser nicht.
- `version` erlaubt, das Format später zu ändern.

## Umsetzung (geplant)

| Datei | Inhalt |
|-------|--------|
| `src/name-rules.js` | Reine Funktionen: Filtern beim Tippen, Prüfen, Großschreibung, `middleInitial` ableiten, Anzeige-Formen (voll, mit Initiale, nur Initialen) |
| `src/profile-store.js` | Lesen und Schreiben des Profils in `localStorage` (mit Schutz gegen Fehler) |
| `src/welcome-screen.js` | Der Screen: Felder, Auswahl, Geld, Continue |
| `index.html`, `style.css` | Markup und Stil (wie der Startscreen) |
| `src/entry.js` | Ablauf: Startscreen → dieser Screen → Spiel |

Dazu Texte in `en.js` und `de.js`, Kauf über dieselbe Preisliste wie im Spiel (`shop-constants.js`), das Geld über `wallet.js`. Die Namensregeln werden als reine Funktionen mit einer Reihe von Beispielen getestet.

## Offene Fragen

- **Titel** des Screens (siehe oben).
- **Entweder-oder bei den Zigaretten:** Ich lese es als Wahl zwischen den zwei Packungen (Pflicht). Oder soll man **Getränk oder Zigaretten** wählen, nicht beides?
- **Getränk Pflicht?** Darf man ohne Getränk weiter, oder muss auch eines gewählt werden?
- **Jedes Mal oder nur einmal?** Soll der Screen bei jedem Besuch kommen (vorausgefüllt) oder nur beim ersten Mal?
- **Geld speichern?** Das Geld wird heute nicht gespeichert (es startet bei jedem Laden mit 15.000 $). Soll der Stand nach dem Einkauf bleiben?
- **Wo erscheint der Name im Spiel?** HUD, später Mehrspieler, Wette, Rangliste: wird mit dem Spielkonzept (`game-concept.md`, Ideen) entschieden.

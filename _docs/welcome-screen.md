# Welcome-Screen (Namen und erster Einkauf)

> **Status: umgesetzt.** Dieser Screen kommt **nach dem Startscreen** (Alterbestätigung, siehe README) und **vor dem Spiel**. Er erscheint **bei jedem Besuch**.

Hier gibt der Spieler seinen Namen ein und kauft gleich die ersten Dinge. Alles bleibt **nur im Browser** (keine Datenbank, nichts wird gesendet).

## Ablauf

1. Startscreen: Bad Habits Games, PRESENT, Titel, **Confirm Age 18+** (wird bei jedem Besuch gefragt).
2. **Dieser Screen** (**jedes Mal**, mit den gespeicherten Angaben vorausgefüllt): Name, Land, Gesicht, Getränk, Zigaretten, **Singleplayer** oder **Multiplayer**.
3. Das Spiel (die Auswahl ist schon im Glas und in der Packung).

Das Spiel lädt wie beim Startscreen im Hintergrund weiter; der Screen blendet aus, wenn **Singleplayer** oder **Multiplayer** gedrückt ist und das Spiel bereit ist (bei Multiplayer erst, wenn der Raum eingerichtet ist).

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
- **Erlaubt:** nur **Buchstaben** (alle Schriften und Akzente: ä ö ü ß é ñ …, nicht nur A–Z), der **Punkt `.`** und der **Bindestrich `-`**. Alles andere (Ziffern, Leerzeichen, Sonderzeichen) wird beim Tippen gar nicht angenommen (kein Fehlertext und keine Erklärungszeile). Doppelnamen gehen also mit Bindestrich: „Anna-Lena“.
- **Form:** Ein Bindestrich nicht am Anfang oder Ende und nicht doppelt (`--`), ein Punkt nur nach einem Buchstaben und nicht doppelt (`..`); mindestens ein Buchstabe pro ausgefülltem Feld; höchstens 10 Zeichen je Feld.
- **Groß- und Kleinschreibung:** Der erste Buchstabe jedes Namensteils (und nach einem Bindestrich) wird automatisch groß (aus „mario“ wird „Mario“), der Rest bleibt, wie getippt (damit „McDonald“ oder „de la Cruz“ nicht zerstört wird). Vorschlag, noch zu bestätigen.
- **Enter** springt zum nächsten Feld, im letzten löst es **Singleplayer** aus (wenn alles gültig ist).

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

- **Ein Getränk aus allen fünf** (beim ersten Besuch und nach „Neu anfangen“ ist **Bier** schon gewählt, man kann es ändern oder abwählen) (`DRINK_MENU`, `shop-constants.js`): Bier 8 $, Rotwein 14 $, Weißwein 14 $, White Russian 16 $, Whiskey 18 $. Es ist das erste volle Glas.
- **Eine Zigarettenpackung, entweder oder:** **Premium Blend** (schwarz/rot/gold) oder **Light Blend** (weiß/blau) (`PACK_DESIGNS`), je `PACK_PRICE` (75 $). Man muss eine nehmen, weil man ja rauchen muss; es gibt kein „keine“. Das Entweder-oder gilt nur für die Zigaretten, beim Getränk wählt man eines von allen.

Die Wahl ersetzt das Glas und die Packung, die der Spieler sonst zu Beginn bekäme. Nicht bezahlbare Einträge sind grau.

## Geld bleibt

Das Geld wird **gespeichert**: jede Ausgabe (hier und im Spiel: Getränke an der Karte, neue Packungen) schreibt den neuen Stand sofort in den Browser. Wer etwas ausgibt und die Seite neu lädt, hat danach **weniger** Geld, nicht wieder 15.000 $. Nur ohne gespeichertes Profil (erster Besuch) gibt es die 15.000 $.

Bei jedem weiteren Besuch kauft der Spieler auf diesem Screen **wieder** sein erstes Getränk und seine erste Packung (jeder Besuch beginnt mit einem vollen Glas und einer Packung), und das kostet erneut. Das Spiel verliert damit nichts, das Geld sinkt aber mit jedem Besuch (siehe Offene Fragen: Pleite).

## Einzelspieler oder Mehrspieler

Statt „Continue“ gibt es **zwei Knöpfe**: **Singleplayer** (Einzelspieler) und **Multiplayer** (Mehrspieler). Beide sind **aktiv**, wenn Vorname und Nachname gültig sind und ein Getränk und eine Packung gewählt sind; Stil des Startscreens (dünner gelber Rahmen). Ein Klick speichert das Profil (mit Land und Gesicht) und startet das Spiel in dem Modus.

- **Singleplayer:** **Keine Verbindung** zu SpacetimeDB, nichts wird gesendet. Am Billardtisch steht **nur ein Satz** Getränk, Zigaretten, Feuerzeug und Aschenbecher (der Platz auf der +z-Seite); der zweite Satz fehlt ganz. Die Tasten (R, T) benutzen immer diesen einen Satz, auch wenn die Kamera auf der anderen Seite steht.
- **Multiplayer:** Der Knopf zeigt einen **Spinner**, bis der Raum eingerichtet ist (verbunden, der Gast steht in der Liste); beide Knöpfe sind solange gesperrt. Klappt es nicht (keine Verbindung, nach 15 s Zeitlimit), erscheint eine rote Meldung („Der Raum konnte nicht eingerichtet werden …“), die Knöpfe sind wieder frei, und man kann es noch einmal versuchen oder allein spielen. Beide Sätze am Tisch bleiben (die zwei Plätze, siehe `multiplayer.md`).
- **Enter** im letzten Namensfeld löst **Singleplayer** aus (den harmlosen), wenn alles gültig ist.

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
  "country": "at",
  "face": { "skin": "#e0a77c", "eyes": "#3b78c9", "hair": "#6b4226", "width": 0.95, "hairStyle": 2, "beard": 0, "nose": 1, "brows": 1 },
  "money": 14907,
  "createdAt": "2026-11-08T20:00:00.000Z"
}
```

- Beim nächsten Besuch sind die Felder und die Auswahl **vorausgefüllt** (man kann sie ändern); die Altersfrage kommt trotzdem jedes Mal.
- `money` ist der Stand nach jeder Ausgabe (siehe „Geld bleibt“); fehlt das Profil, startet er bei `START_MONEY`.
- Ist `localStorage` nicht nutzbar (privater Modus, gesperrt), läuft das Spiel trotzdem; der Name wird dann nur für diese Sitzung gehalten.
- Es wird **nichts gesendet**. Der Name verlässt den Browser nicht.
- `version` erlaubt, das Format später zu ändern.

## Umsetzung

| Datei | Inhalt |
|-------|--------|
| `src/name-rules.js` | Reine Funktionen: Filtern beim Tippen (`filterName`), Fertigstellen (`normalizeName`), Prüfen (`isValidName`), `middleInitial`, `displayName` (voll, mit Initiale, nur Initialen); Beispiele in `_Scripts/test-name-rules.mjs` (`npm test`) |
| `src/profile-store.js` | Lesen und Schreiben des Profils in `localStorage` (mit Speicher im Arbeitsspeicher als Ersatz), `saveMoney`, `clearProfile` |
| `src/face.js` | Das Zufallsgesicht: Paletten, `randomFace`, `isFace` (prüft ein gespeichertes Gesicht), `faceSvg` (die Vorschau) |
| `src/country-list.js`, `public/flags/` | Die Länder mit runder Flagge (Kürzel, deutscher und englischer Name), `countryName`, `flagUrl`, Standard Österreich |
| `src/welcome-screen.js` | Der Screen: Felder, Auswahl, Geld, Neu anfangen, die zwei Knöpfe |
| `src/wallet.js` | Liest das Geld beim Start aus dem Profil und speichert jede Änderung; `setBalance` |
| `src/entry.js` | Ablauf: Startscreen, Welcome, Spiel (das Spiel lädt im Hintergrund, danach `applyProfile` in `billard.js`) |
| `src/glasses.js`, `src/cigarette-pack.js` | `setPlayerDrink` (das volle erste Glas auf der Seite des Spielers) und `setPlayerDesign` (die Packung; der andere Platz bekommt die andere Marke) |
| `src/settings.js` | Zeigt im Einstellungs-Panel den Namen (voll) und das Guthaben |

- **Ablauf im Code:** Der Klick auf **Confirm Age 18+** nimmt den Startscreen weg und zeigt Welcome; **Singleplayer** oder **Multiplayer** speichert das Profil und wartet, bis das Spiel geladen (und bei Multiplayer der Raum eingerichtet) ist; dann blendet der Screen aus und die Spieltasten gelten.
- **Neu anfangen:** Ein Link unten links fragt nach (Ja, neu anfangen / Abbrechen), löscht das Profil, setzt das Geld auf 15.000 $ und leert die Felder.
- **Pleite:** Reicht das Geld nicht für ein Getränk und eine Packung (unter 83 $), steht ein roter Hinweis da, beide Knöpfe bleiben aus, und nur „Neu anfangen“ hilft. Auswahlen, die man nicht mehr bezahlen kann, werden nicht übernommen.
- **Einstellungs-Panel:** Es zeigt oben Name und Guthaben, scrollt innen, wenn es länger ist als der Bildschirm (der Kopf mit Titel und Kreuz bleibt stehen).

## Entschieden

- Titel: **Welcome** (de: Willkommen).
- Der Screen kommt **bei jedem Besuch**.
- Zigaretten: **entweder oder** zwischen den zwei Packungen, Pflicht. Getränk: **eines von allen fünf**, Pflicht.
- Das Geld bleibt gespeichert, inklusive aller Ausgaben; die 15.000 $ gibt es nur beim ersten Mal.
- **Jeder Besuch kauft neu:** Erstes Getränk und erste Packung werden bei jedem Besuch wieder gekauft (das Geld sinkt).
- **Pleite:** Unter 83 $ hilft nur „Neu anfangen“ (löscht das Profil, 15.000 $).
- **Name und Guthaben** stehen im Einstellungs-Panel; dieses scrollt innen.

## Gesicht und Land (umgesetzt)

Auf diesem Screen kommen zwei Dinge dazu; beide werden wie der Name im Profil gespeichert.

- **Gesicht (Facegenerator, umgesetzt, bewusst einfach):** Eine Vorschau (kleines flaches SVG, `src/face.js`) mit **einem** Knopf **Zufall**, der ein neues Gesicht würfelt. Es gibt **keinen** Bestätigungsknopf: **Das gezeigte Gesicht gilt**, der Start geht auch ohne zu würfeln. Beim ersten Besuch steht schon ein Zufallsgesicht da. Gewürfelt wird **aus kleinen Paletten**, nicht aus allen Farben: 8 **Hauttöne** (hell bis dunkel), 8 natürliche **Haarfarben** (schwarz, braun, rotbraun, blond, grau, weiß …) und mit 20 % Chance eine **lustige** (blau, grün, orange, pink, lila), 6 **Augenfarben**. Die **Haarfarbe gilt für Haar, Bart und Augenbrauen** zusammen. **Formen:** die **Breite** (schmal bis breit, aber nicht extrem), 6 Frisuren (von kahl bis lang), 3 Nasen, 3 Augenbrauen und der **Bart** (in 55 % der Fälle **keiner**, sonst Stoppeln, Kinnbart oder Vollbart): Die Gesichter sind für alle. Das Gesicht ist **starr** (keine Mimik). Als Kugel mit Nase und Augen schwebt es neben der Bar im Raum (`face-ball.js`, siehe [`multiplayer.md`](multiplayer.md)); die Daten (`face`) bleiben dieselben.
- **Land (umgesetzt):** Man wählt das Land, **für das man spielen will oder dem man sich zugehörig fühlt**, unabhängig von der Sprache, aus einer **Dropdown-Liste mit Suche** (Tippen filtert; Namen in der Sprache der Oberfläche, Deutsch oder Englisch). **Standard: Österreich** (`at`). Die Liste hat **nur die Länder, zu denen es eine (runde) Flagge gibt**: 42 Länder (`src/country-list.js`, Flaggen in `public/flags/{iso}.svg`, kopiert aus [`countries/`](countries/README.md), das nur Info bleibt). Mehr Länder: Flaggendatei und eine Zeile in `country-list.js`. Gesucht wird ohne Akzente und Groß-/Kleinschreibung („osterreich“ findet „Österreich“); Pfeiltasten und Enter wählen, Esc und ein Klick daneben schließen die Liste. Über dem Kopf des Spielers stehen später ein kleines Flaggen-Icon und sein Name, kompakt (siehe `multiplayer.md`).
- Profil: `country` (Länderkürzel) und `face` (Hautfarbe, Augenfarbe, Haarfarbe, Breite, Frisur, Bart, Nase, Augenbrauen), beides umgesetzt. Die `version` bleibt 1 (sonst wären die alten Profile samt Geld weg): fehlende Felder bekommen beim Lesen Österreich beziehungsweise ein Zufallsgesicht.

## Offene Fragen

- **Wo erscheint der Name sonst im Spiel?** Heute nur im Einstellungs-Panel (voll, mit Guthaben). HUD, später Mehrspieler, Wette, Rangliste: wird mit dem Spielkonzept (`game-concept.md`, Ideen) entschieden; die kurzen Formen (`displayName`) liegen bereit.

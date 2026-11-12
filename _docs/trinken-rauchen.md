# Trinken und Rauchen: Befund und Umbau (Plan)

> **Status: Plan, nichts davon ist umgesetzt.** Auslöser: Eine Testerin meldet, man trinke das Getränk des anderen Spielers. Hier stehen die Ursache (Teil 1), was die Prüfung von Trinken und Rauchen sonst noch ergeben hat (Teil 2) und wie das System sauberer wird (Teil 3 und 4). Zu den Regeln siehe [`game-concept.md`](game-concept.md), [`cigarettes.md`](cigarettes.md), [`glass-objects.md`](glass-objects.md) und [`multiplayer.md`](multiplayer.md).

## 1. Die Ursache

**Das eigene Getränk wird nicht über den Platz gefunden, sondern über die Entfernung.** Beim Trinken (`R`) sucht `nearestGlass(camera)` in `drinking.js` unter **allen Gläsern der besetzten Plätze** das, das der Kamera **am nächsten** ist (`glasses.player`, beide Gläser stehen am Tisch auf der linken Längsseite). Das richtige Glas ist nur zufällig das eigene:

- In der **Spielerkamera** kreist die Kamera um die weiße Kugel (Abstand 1 m), und die Kugel liegt irgendwo auf dem Tisch. Je nach Lage und Zielrichtung ist die Kamera dem **Glas des Gegners näher** als dem eigenen.
- In der **freien Kamera** (der Wartende geht herum) gilt dasselbe, und ein **Zuschauer** hat gar keinen Platz: Er trinkt immer aus dem Glas eines Spielers.
- Ist das nächste Glas **leer**, öffnet sich das **Getränkemenü** für **dieses** Glas (`onEmpty(best)`, `orderFor`): Was man wählt, **ersetzt das fremde Glas** (und kostet einen selbst Geld).
- Die Anzeige der Schlucke (`drinking.sipsLeft(camera)`, die Zahl am Knopf) benutzt dieselbe Suche und zeigt dann die Schlucke des **anderen**.

**Das Rauchen ist besser:** `sideOf(camera)` (`smoking.js`) nimmt den **eigenen Platz** (`mySide`), sobald man sitzt (nur für Zuschauer zählt die Kameraseite). Deshalb fällt es nicht auf. Die **fernen** Hände der anderen machen es richtig (`createDrinking` mit einer nach `side` gefilterten Liste, `createSmoking` mit festem `side`): Für dieselbe Sache gibt es **zwei Wege**, einen richtigen (andere) und einen falschen (ich).

## 2. Was die Prüfung sonst ergab

| # | Befund | Folge |
|---|--------|-------|
| a | **Zuschauer trinken und rauchen aus den Sätzen der Spieler**: `sideOf` nimmt für sie die Kameraseite, `nearestGlass` das nächste Glas. | Er verbraucht lokal Glas und Zigaretten eines Spielers (und kauft für ihn eine neue Packung); die anderen sehen es nicht (`onHand` ignoriert Zuschauer). Widerspricht „Sätze nur an besetzten Plätzen“ in `multiplayer.md`. |
| b | **Wieder hinsetzen füllt kostenlos auf:** `applySeats` stellt bei jedem Platzwechsel Glas (`DRINK_SIPS`) und Packung (`PACK_SIZE`) aus `myChoice` neu hin. Seit „Tisch verlassen / Am Tisch sitzen“ geht das beliebig oft. | Ein **Gratis-Nachfüllen** ohne Geld, die Rechnung des Servers (`buy`) wird umgangen. |
| c | **Das Getränkemenü ersetzt das nächste leere Glas**, nicht das des Gastes (siehe Teil 1). | Man kauft und ersetzt ein fremdes Glas (lokal). |
| d | **Der Zustand liegt in den Szenenobjekten**, verstreut auf fünf Module (Glas in `glasses.js`, Packung, Feuerzeug, Aschenbecher, Zigaretten), jedes mit eigener Liste „je Seite“, dazu die globale Variable `mySide` in `smoking.js`. | Jede Änderung (Platz, Kauf, Synchronisation) muss an fünf Stellen richtig sein. |
| e | **Schaum, Rest und Zigaretten im Aschenbecher** werden nicht übertragen (nur Getränk, Schlucke, Packung, Zahl); die ferne Hand spielt sie nach (`hand`-Ereignisse). | Kleine Abweichungen zwischen den Browsern möglich, rein optisch (die Spielwerte stimmen). |
| f | **`set_kit` kennt Preise nicht**: Der Server prüft nur Form und Grenzen, nicht, ob zum Zustand ein Kauf gehört. | Wer das Kit selbst schickt, hat ein volles Glas ohne Kauf (bekannt, „Vertrauen“, aber b macht es ohne Absicht möglich). |
| g | Kleinkram: `drinking.sipsLeft` und der Zähler am Knopf für Zuschauer ohne Platz (zeigt ein fremdes Glas). | folgt aus Teil 1 und a. |

## 3. Soll-Zustand

- **Ein Gast hat eine Hand** (Trinken und Rauchen) **an seinem Platz**: Die Hand bekommt **einen Platz** (0, 1 oder keinen) und eine **Blickpose** (die eigene Kamera, bei den anderen der Kopf aus `presence`). Die **eigene** Hand und die **fernen** Hände sind dieselbe Sache mit anderer Quelle für Platz und Pose, nicht zwei Programme.
- **Der Platz entscheidet, nie die Entfernung.** Wer **keinen Platz** hat (Zuschauer), hat **keine Hand**: `R` und `T` tun nichts und sagen kurz „Setz dich an den Tisch, um zu trinken“ (Vorschlag, siehe Teil 5).
- **Ein Platz hat einen Satz** (Glas, Packung, Feuerzeug, Aschenbecher mit Zigaretten) in **einem Objekt** (`seats[side]`), nicht verteilt; der Zustand daran ist die **Wahrheit** (Getränk, Schlucke, Packung, Zahl).
- **Nachfüllen nur durch Kaufen.** Ein Platzwechsel ändert den **Zustand nicht**: Wer wieder aufsteht und sich setzt, bekommt sein **Kit wie es war** (Glas mit den Schlucken, die noch da waren, Packung mit der Zahl, die noch da war). Gratis-Nachfüllen ist weg.
- **Das Menü gehört zum Glas des Gastes:** leer → Menü → der Kauf (`buy`) ersetzt **sein** Glas.

## 4. Schritte (jeder lauffähig und geprüft)

1. **Sofortige Korrektur (klein):** Die eigene Hand benutzt den **eigenen Platz** (`mySide`): Trinken bekommt eine Liste mit nur dem eigenen Glas (und für Zuschauer eine leere Liste), die Zahl am Knopf und das Menü ebenfalls. Zuschauer: `R` und `T` tun nichts und zeigen die Meldung. *Prüfen:* Einzelspiel (nichts ändert sich); im Mehrspieler: in der Spielerkamera und in der freien Kamera nahe am Glas des anderen trinken: es ist immer das eigene; Zuschauer trinkt nicht; leeres Glas des anderen öffnet kein Menü.
2. **Kit bleibt beim Platzwechsel:** `applySeats` setzt Glas und Packung nur beim **ersten** Sitzen (aus dem Welcome), danach der Stand wie er war (im Browser gehalten; ein Neuladen ist ein neuer Beitritt wie bisher). *Prüfen:* leer trinken, aufstehen, hinsetzen: das Glas bleibt leer; kaufen füllt auf.
3. **Eine Hand für alle:** `createHand({ seat, view })` fasst `createDrinking` und `createSmoking` zusammen; die eigene Hand ist `createHand` mit dem eigenen Platz und der Kamera, die fernen sind `createHand` mit dem Platz des Gastes und der Pose aus `presence`. Die globale Variable `mySide` und `sideOf` in `smoking.js` entfallen. *Prüfen:* Trinken, Rauchen, Feuerzeug, Packung leer und neu kaufen (Einzelspiel und Mehrspieler, eigene und ferne Hand); die anderen sehen alles wie vorher.
4. **`seats.js`:** Ein Objekt je Platz mit Glas, Packung, Feuerzeug, Aschenbecher; `setTaken(side, bool)` ersetzt die fünf Aufrufe in `applySeats`; `seats[side].kit()` und `setKit()` für die Übertragung (`sendMyKit`, `applyKit`). *Prüfen:* wie Schritt 3, dazu Platzwechsel und Aufstehen vom Tisch.
5. **Aufräumen:** tote Reste (`orderFor`, `glasses.player`-Filter, `myChoice` nach dem ersten Sitzen), Docs (`game-concept.md`, `cigarettes.md`, `multiplayer.md`), Browser-Prüfung aller Wege.

## 5. Offene Fragen

- **Zuschauer:** nichts (mit Meldung) oder ein **eigener kleiner Satz** (Glas und Zigaretten in der Hand, nicht am Tisch)? Vorschlag: nichts; bei „Sätze nur an besetzten Plätzen“ in `multiplayer.md` bleibt es dann dabei.
- **Wohin mit dem Kit eines Aufgestandenen?** Vorschlag: es bleibt im Browser des Gastes und kommt beim nächsten Sitzen wieder an den Platz (der Platz ist solange leer); beim **Neuladen** beginnt der Gast wie bisher mit dem Welcome-Kauf.

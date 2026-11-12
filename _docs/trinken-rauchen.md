# Trinken und Rauchen: Befund und Umbau (Plan)

> **Status: Schritt 1 ist gebaut, der Rest ist Plan.** Auslöser: Eine Testerin meldet, man trinke das Getränk des anderen Spielers. Hier stehen die Ursache (Teil 1), was die Prüfung von Trinken und Rauchen sonst noch ergeben hat (Teil 2), das neue Modell (Teil 3) und die Schritte (Teil 4). Zu den Regeln siehe [`game-concept.md`](game-concept.md), [`cigarettes.md`](cigarettes.md), [`glass-objects.md`](glass-objects.md) und [`multiplayer.md`](multiplayer.md).

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
| a | **Zuschauer trinken und rauchen aus den Sätzen der Spieler**: `sideOf` nimmt für sie die Kameraseite, `nearestGlass` das nächste Glas. | Er verbraucht lokal Glas und Zigaretten eines Spielers (und kauft für ihn eine neue Packung); die anderen sehen es nicht (`onHand` ignoriert Zuschauer). Richtig wäre: ein **eigenes Kit**, das man nur beim Benutzen sieht (Teil 3). |
| b | **Wieder hinsetzen füllt kostenlos auf:** `applySeats` stellt bei jedem Platzwechsel Glas (`DRINK_SIPS`) und Packung (`PACK_SIZE`) aus `myChoice` neu hin. Seit „Tisch verlassen / Am Tisch sitzen“ geht das beliebig oft. | Ein **Gratis-Nachfüllen** ohne Geld, die Rechnung des Servers (`buy`) wird umgangen. |
| c | **Das Getränkemenü ersetzt das nächste leere Glas**, nicht das des Gastes (siehe Teil 1). | Man kauft und ersetzt ein fremdes Glas (lokal). |
| d | **Der Zustand liegt in den Szenenobjekten**, verstreut auf fünf Module (Glas in `glasses.js`, Packung, Feuerzeug, Aschenbecher, Zigaretten), jedes mit eigener Liste „je Seite“, dazu die globale Variable `mySide` in `smoking.js`. | Jede Änderung (Platz, Kauf, Synchronisation) muss an fünf Stellen richtig sein. |
| e | **Schaum, Rest und Zigaretten im Aschenbecher** werden nicht übertragen (nur Getränk, Schlucke, Packung, Zahl); die ferne Hand spielt sie nach (`hand`-Ereignisse). | Kleine Abweichungen zwischen den Browsern möglich, rein optisch (die Spielwerte stimmen). |
| f | **`set_kit` kennt Preise nicht**: Der Server prüft nur Form und Grenzen, nicht, ob zum Zustand ein Kauf gehört. | Wer das Kit selbst schickt, hat ein volles Glas ohne Kauf (bekannt, „Vertrauen“, aber b macht es ohne Absicht möglich). |
| g | Kleinkram: `drinking.sipsLeft` und der Zähler am Knopf für Zuschauer ohne Platz (zeigt ein fremdes Glas). | folgt aus Teil 1 und a. |

## 3. Soll-Zustand: ein Kit je Gast

**Entschieden (Johann):** Jeder Gast hat sein **eigenes Kit** (Getränk, Zigaretten, Feuerzeug), auch jeder **Zuschauer**.

- **Spieler am Tisch:** Ihr Kit **steht an ihrem Platz** (Glas, Packung, Feuerzeug, Aschenbecher mit Zigaretten), wie bisher.
- **Zuschauer:** Ihr Kit ist **unsichtbar, bis sie es benutzen.** Trinkt ein Zuschauer (`R`), erscheint sein Glas in der Hand, wird getrunken und verschwindet danach wieder; raucht er (`T`), erscheinen Zigarette und Feuerzeug in der Hand und verschwinden danach. **Die anderen sehen es nur in diesem Moment** (seine Hand-Ereignisse gehen wie die der Spieler an alle). Es steht nirgends herum.
- **Das Kit gehört dem Gast, nicht dem Platz.** Es hat einen Zustand (Getränk, Schlucke, Packung, Zahl der Zigaretten) und ein **Zuhause**: am Platz (wer sitzt) oder in der Hand (wer nicht sitzt). Setzt sich ein Zuschauer oder steht ein Spieler auf, **wandert dasselbe Kit** mit: ein leeres Glas bleibt leer, die Packung hat die Zigaretten, die noch da waren. **Nachfüllen nur durch Kaufen** (`buy`), nie durch Hinsetzen.
- **Jeder benutzt nur sein eigenes Kit.** Es gibt keine Suche nach dem nächsten Glas mehr; damit ist die Ursache aus Teil 1 weg, und die eigene Hand und die fernen Hände sind **dasselbe Programm** (`createHand`) mit anderer Quelle für Kit und Blickpose.
- **Das Getränkemenü** gehört zum Glas **des Gastes**: leer → Menü → der Kauf ersetzt **sein** Glas.

## 4. Schritte (jeder lauffähig und geprüft)

1. **Sofortige Korrektur für die Spieler (gebaut):** Die eigene Hand eines **sitzenden** Gastes benutzt nur das **Glas seines Platzes** (`mySide`): das Trinken, das Getränkemenü und die Schlucke am Knopf. Dazu das **Aussehen**: Glas und Zigarette werden **vor das Gesicht und ins Bild** geführt (vorher lag das Glas unter dem Bild: 0,2 m unter und 0,3 m vor der Kamera sind 34° unter der Mitte, die Kamera sieht nur 25°) und das Glas **kippt beim Austrinken bis über die Waagerechte** (Boden nach oben, bis 109°), so bleibt es im Bild (`DRINK_MOUTH_*`, `DRINK_TILT_*`, `SMOKING_MOUTH_*`). *Prüfen:* in der Spielerkamera und in der freien Kamera nahe am Glas des anderen: es ist immer das eigene; ein leeres Glas des anderen öffnet kein Menü; Einzelspiel unverändert. (Zuschauer bleiben bis Schritt 4 wie heute.)
2. **Kit gehört dem Gast:** Jeder Gast (auch der Zuschauer) hat sein Kit im Browser (`myKit`: Getränk, Schlucke, Packung, Zahl), gesetzt aus dem Welcome-Kauf und danach nur durch Trinken, Rauchen und `buy` verändert. `applySeats` stellt beim **Sitzen** das vorhandene Kit hin (nicht mehr frisch gefüllt); `sendMyKit` schickt es **auch als Zuschauer** (die Datenbank hat `kit` je Gast schon). *Prüfen:* leer trinken, aufstehen, hinsetzen: das Glas bleibt leer; Kaufen füllt auf; die anderen sehen den Stand.
3. **Eine Hand je Gast:** `createHand({ kit, view, home })` fasst `createDrinking` und `createSmoking` zusammen, ohne Suche nach dem nächsten Glas; die eigene Hand und die fernen (nach Gast, nicht mehr nach Platz geführt) sind `createHand`. Die globale Variable `mySide` und `sideOf` in `smoking.js` entfallen. Spieler wie bisher am Platz. *Prüfen:* Trinken, Rauchen, Feuerzeug, Packung leer und neu kaufen für beide Spieler (eigene und ferne Hand); wie vorher, nur ohne die Verwechslung.
4. **Das Kit eines Zuschauers in der Hand:** Für Gäste ohne Platz erscheinen Glas, Packung, Feuerzeug und Zigarette **nur beim Benutzen** an der Hand (Start unter und neben dem Mund, Flug zum Mund und zurück, danach unsichtbar); `onHand` hört auch auf Zuschauer. Die Zigarette (`cigarettes.js`) und das Feuerzeug (`lighter.js`) müssen dafür **frei beweglich** sein, nicht nur in den Kerben des Aschenbechers. *Prüfen:* ein Zuschauer trinkt und raucht, die anderen sehen genau das, und nur dann; sein Kit verschwindet danach wieder; ein Zuschauer, der sich setzt, hat sein Kit (mit Stand) am Platz.
5. **`seats.js` und Aufräumen:** Ein Objekt je Platz (Glas, Packung, Feuerzeug, Aschenbecher) mit `setTaken` statt der fünf Aufrufe in `applySeats`; tote Reste (`orderFor`, der Filter `glasses.player`, `myChoice` nach dem ersten Sitzen); Docs (`game-concept.md`, `cigarettes.md`, `multiplayer.md`). *Prüfen:* alle Wege in beiden Spielarten.

## 5. Offene Punkte

- **Die Zigarette des Zuschauers nach dem Loslassen von `T`:** Vorschlag: sie wird **ausgedrückt** und ist weg (jede neue kommt aus der Packung); ein Spieler am Tisch lässt sie dagegen im Aschenbecher weiterglimmen, wie bisher. Alternative: Der Zuschauer behält sie (dann glimmt sie in der Hand weiter und ist nur beim Rauchen zu sehen).
- **Wo startet das Glas eines Zuschauers?** Vorschlag: Es erscheint unter und neben dem Mund (wie aus dem Ärmel) und fliegt zum Mund, ohne Einblendung am Tisch.

# Glas und Tischdeko

> **Status: umgesetzt** (alle Objekte dieser Seite). Zigaretten, Schachteln und Rauch stehen in [`cigarettes.md`](cigarettes.md).

Auf den Tischen im Raum und am Billardtisch stehen Gläser, Flaschen und Kleinteile. Sie müssen **wie Glas aussehen** und in der **Größe stimmen**; die Form darf einfach sein und wird **per Formel berechnet**, ohne externe Modelle.

## Kerzenhalter (umgesetzt)

- **Code:** `src/candle.js`, Werte in `src/candle-constants.js`. Die Plätze folgen `FURNITURE_TABLES`.
- **Form:** Schale und Röhre sind ein Drehkörper, dazu Kugel, Kerze (Zylinder), Docht und Flamme (Tropfenform, zwei Schichten). Die Glasur spiegelt den Raum (die Aufnahme der Kugel-Spiegelung, `ball-reflection.js`).
- **Flackern:** Die Flamme streckt sich und wiegt sich, der Schein (weicher Lichtfleck) und das Licht schwanken unregelmäßig (überlagerte Sinus-Wellen).
- **Licht:** Alle Flammen leuchten. **Echtes Licht** (Punktlicht, schwach, 2,5 m Reichweite, ohne Schatten) bekommen nur die **3 Kerzen, die der Kamera am nächsten sind**; beim Wechsel blendet das Licht aus und an der neuen Kerze wieder ein (`CANDLE_REAL_LIGHTS`, `CANDLE_LIGHT_*`). So bleibt die Zahl der Lichter im Raum klein.

## Aschenbecher (umgesetzt)

- **Code:** `src/ashtray.js`, Werte in `src/ashtray-constants.js`.
- **Form:** Ein dickes Glasschälchen als Drehkörper mit breitem, flachem Rand. Der Rand ist an 5 gleich verteilten Stellen ausgerundet abgesenkt (Kerben, 8 mm tief).
- **Glas:** leicht grünlich, größtenteils durchsichtig, mit Klarlack-Glanz und Spiegelung des Raums (Aufnahme aus `ball-reflection.js`). Es wirft keinen Schatten.
- **Tische:** Etwa zwei Drittel der runden Tische haben einen (zufällig, fester Startwert), 25 cm von der Mitte entfernt, damit er neben der Kerze steht.
- **Billardtisch:** Zwei Aschenbecher (je Spieler einer) auf dem Holzrahmen der linken Längsseite, zwischen der letzten Raute und der Ecktasche. Sie sind auf 65 % verkleinert (Ø 9 cm), weil der Rahmen nur 11 cm breit ist.

## Weinglas, Bierglas und Whiskeyglas (umgesetzt)

- **Code:** `src/glasses.js`, Werte in `src/glasses-constants.js`.
- **Form:** Beide sind Drehkörper aus Formeln. Das Weinglas hat einen tulpenförmigen Kelch (Radius per Sinus-Kurve), dünnen Stiel und flachen Fuß; Bierglas und Whiskeyglas sind leicht kegelförmig mit dickem Boden (dieselbe Formel, nur andere Maße). Wein und Bier sind eigene, etwas kleinere Körper in der Innenform; der Schaum ist ein Körper darüber.
- **Glas:** fast durchsichtig mit Spiegelung des Raums (Aufnahme aus `ball-reflection.js`), ohne Schatten. Damit es glänzt, behalten Glanzlichter und Spiegelung ihre volle Stärke, auch wenn das Material durchsichtig ist (`clearGlass` in `applyBallReflection`; normale Transparenz würde sie mit dem Körper ausblenden). Bier und Whiskey sind so durchsichtig wie getöntes Glas (Alpha 0,5 bzw. 0,6, goldfarben bzw. bernsteinfarben, leicht selbstleuchtend); Wein ist etwas dichter (rot 0,8, weiß 0,5). Der Schaum bleibt deckend. Dasselbe gilt für den Aschenbecher.
- **Tische:** Pro Tisch zufällig 0–2 Gläser (feste Startwerte), je zu 35 % Wein (davon 70 % rot), 25 % Whiskey, sonst Bier. Sie stehen 12–28 cm von der Mitte entfernt und halten Abstand zu Kerze, Aschenbecher und zueinander.
- **Billardtisch:** Je Spieler ein Getränk auf dem Holzrahmen der linken Längsseite, neben dem Aschenbecher. Die Getränke werden **bei jedem Laden neu gewürfelt** (nicht aus dem festen Startwert), und die beiden Spieler bekommen **nie dasselbe** (aus Rotwein, Weißwein, Bier, Whiskey).

## Flaschen (umgesetzt)

- **Code:** `src/bottles.js`, Werte in `src/bottles-constants.js`.
- **Form:** Drehkörper: runder Boden, gerader Körper, weich geschwungene Schulter, Hals und Mundring. Das Etikett ist ein Streifen über etwa 140° an der Vorderseite (Canvas-Textur mit erfundenen Namen „Château Backroom“ und „Backroom Original Lager“, keine echten Marken); die Flasche steht zufällig gedreht. Wein trägt eine Folienkapsel (dunkelrot, metallisch), Bier einen Kronkorken (golden).
- **Glas:** dunkles Glas (Wein grün, Bier braun) mit Glanz und Spiegelung wie die Gläser, aber fast undurchsichtig (Alpha 0,9 bzw. 0,88). Die Flaschen sind leer gedacht, innen ist nichts zu sehen.
- **Tische:** Etwa 40 % der Tische haben eine Flasche (je zur Hälfte Wein oder Bier, feste Startwerte). Sie steht im Abstand von 12–28 cm von der Mitte und hält Abstand zu Kerze, Aschenbecher und Gläsern. Am Billardtisch stehen keine Flaschen.

## Die Objekte

| Objekt | Größe (ca.) | Inhalt / Besonderheit |
|--------|-------------|------------------------|
| **Kerzenhalter** | Schale Ø 13 cm, Röhre 6 cm hoch | **Umgesetzt.** Dunkelrote Glasur (Schale mit Rand, Röhre für die Kerze, kleine Kugel an der Seite), **weiße Wachskerze** Ø 3 cm, 13 cm hoch, mit Flamme und flackerndem Schein. Steht **auf jedem Tisch**, ungefähr in der Mitte (zufällig bis 12 cm daneben, fester Startwert). |
| **Aschenbecher** | Ø 14 cm, 3 cm hoch | **Umgesetzt.** Schweres Glas, am Rand **5 Kerben** für Zigaretten. |
| **Weinglas** | 20 cm hoch, Kelch Ø 8 cm | **Umgesetzt.** Stiel und Fuß, zu 40 % des Kelchs mit Wein gefüllt (rot oder weiß). |
| **Bierglas** | 15 cm hoch, oben Ø 7 cm | **Umgesetzt.** Goldenes Bier mit **Schaumkrone** (3,7 cm, leicht über dem Rand gewölbt). |
| **Whiskeyglas** | 9 cm hoch, oben Ø 7,5 cm | **Umgesetzt.** Kurzer, breiter Tumbler mit dickem Glasboden, zwei Finger hoch Whiskey (bernsteinfarben, durchsichtig). |
| **Weinflasche** | 30 cm hoch, Ø 7,5 cm | **Umgesetzt.** Dunkelgrünes Glas (Bordeaux-Form), Etikett, dunkelrote Folienkapsel auf dem Hals. |
| **Bierflasche** | 23 cm hoch, Ø 6 cm | **Umgesetzt.** Braunes Glas, Etikett, goldener Kronkorken. |

Alle Maße sind Parameter (eigene `*-constants.js`, wie bei den Möbeln), nichts davon im Code verstreut.

## Form per Formel

- **Drehkörper:** Jedes Objekt ist ein Profil (Kurve aus Radius und Höhe), das um die Achse gedreht wird (`LatheGeometry`). Das Profil wird aus wenigen Zahlen berechnet (Boden, Wölbung, Hals, Rand).
- **Wandstärke:** Glas besteht aus einer Außen- und einer Innenfläche (Profil mit Wandstärke), damit Kante und Lichtbrechung glaubwürdig wirken.
- **Flüssigkeit:** Ein eigener, etwas kleinerer Drehkörper in der Innenform, oben mit leichtem Meniskus. Das Bier bekommt darüber die **Schaumkrone** (weich gewölbter, heller Körper).
- **Kerben im Aschenbecher:** 5 gleichmäßig verteilte, ausgerundete Kerben am Rand. Das Profil wird um den Umfang verformt (Kerbe = Absenkung der Randhöhe).
- **Etiketten:** Einfache bedruckte Streifen (Canvas-Textur) um die Flasche, fiktive Namen, keine echten Marken.

## Glas-Optik

- Durchsichtig, mit **Spiegelung des Raums** und hellem Rand (Fresnel). Die Lampenflecken sind das Wichtigste, daran erkennt man Glas.
- **Idee:** Die bereits vorhandene Raum-Aufnahme für die Kugeln (`ball-reflection.js`) wird auch für das Glas genutzt, nur als Spiegelung, ohne den Raum heller zu machen.
- **Brechung („echtes“ Glas)** über `transmission` rendert die Szene zusätzlich und ist bei 8 Tischen mit vielen Objekten teuer. Vorschlag: ohne `transmission`, mit transparentem, getöntem Material und Spiegelung; die Flüssigkeit ist die dunklere, gefärbte Füllung. Das sieht im dunklen Raum gut genug aus.
- **Kerzenglas:** dunkelrot, durchscheinend, innen leuchtet die Flamme.

## Flackerndes Kerzenlicht

- Kleine, warme Flamme (leuchtende Spitze) und ein **schwaches, flackerndes Licht** (Intensität aus überlagerten Sinus-Wellen und Rauschen, ca. 6–12 Hz, unregelmäßig).
- **Kosten:** Der Raum hat schon viele Lichter (3 Deckenleuchten, 10 Wandleuchten). Echte Lichtquellen nur für die **nächsten 2–3 Tische** zur Kamera, ohne Schatten und mit kleiner Reichweite (ca. 1,5 m); für die übrigen genügt ein leuchtendes Glas und ein weicher Lichtfleck (Sprite) auf der Tischplatte.
- Das Flackern darf **nicht heller wirken**: Die Lichtstimmung des Raums ist fest.

## Verteilung

- **Kerzenhalter:** immer, ein Stück pro Tisch, ungefähr in der Tischmitte.
- **Rest:** nicht auf jedem Tisch gleich, **zufällig, aber billig** (kleine Würfelauswahl mit festem Startwert, damit es bei jedem Start gleich aussieht). Pro Tisch z. B. 0–2 Gläser oder Flaschen, 0–1 Aschenbecher, ggf. eine Zigarettenschachtel.
- Es steht nichts übereinander, nichts am Plattenrand, und die Dinge sind leicht gedreht.
- **Kein Physik-Körper:** Das Zubehör ist reine Optik und stört weder Kugeln noch Cue.

## Am Billardtisch

- Auf dem **Holzrahmen** stehen je Spieler **ein Aschenbecher und ein Glas** (zufälliges Getränk). Bei zwei Spielern also **2 Aschenbecher und 2 Gläser**.
- **Platz:** Der Rahmen ist nur **11 cm breit** (`RAIL_WOOD_DEPTH`). Ein Aschenbecher mit Ø 14 cm passt nicht; der Aschenbecher dort ist kleiner (Ø 9 cm, umgesetzt). Das Glas (Ø 7 cm) passt (umgesetzt).
- **Stelle:** neben einer Tasche oder an einer Ecke, nicht auf den Diamanten und nicht zu nah an der Bande, damit sie beim Spiel nicht im Weg stehen (Kamera und Cue-Ansicht).
- Wer „Spieler 1 und 2“ ist und an welcher Seite sie stehen, kommt mit den Rollen aus [`game-concept.md`](game-concept.md). Bis dahin: feste Plätze auf der linken Längsseite.

## Füllstand und Schaum (umgesetzt, nur am Billardtisch)

> Gilt nur für die **Getränke der Spieler am Billardtisch**; alles auf den Tischen im Raum bleibt unverändert. Umgesetzt in `glasses.js` (`player`) und `drinking.js`.

- **Füllstand:** Ein Getränk hat **5 Schlucke** (`game-concept.md`). Mit jedem Schluck sinkt der Füllstand um ein Fünftel (sanft über etwa eine halbe Sekunde), danach ist das Glas leer. Technisch: Wein, Bier und Whiskey sind eigene Körper in der Innenform; sie werden für dieses eine Glas mit dem neuen Füllstand neu berechnet (wenige hundert Punkte, kostet nichts).
- **Schaum (Bier):** Der Schaum sitzt auf dem Bier und sinkt mit ihm. Mit der Zeit **zerfällt er**: erst wird die Krone flacher, dann öffnet sich in der Mitte ein **Loch mit ausgefranstem Rand**, das sich nach außen aufweitet, bis nur noch ein **schmaler Ring an der Glaswand** bleibt. Dauer einstellbar (`BEER_FOAM_DECAY_SECONDS`, 4 Minuten). Bei jedem Schluck sinkt der Schaum mit dem Bier.
- Flaschen: Der Inhalt ist nicht zu sehen; für Trinken genügt ein Zähler.

## Offene Punkte

- Sollen die Gläser mit der Zeit leerer werden (Trinken)?
- Soll man Gläser anklicken oder bewegen können?
- Whiskey: mit Eiswürfeln? Wie viele Sorten Bier?
- Kerzen: reichen ein Licht-Sprite und Leuchten, oder sollen alle Tische echtes Licht bekommen (Kosten)?
- Soll das Glas vorne an der Bande des Billardtisches stehen, wenn ein Spieler nicht am Zug ist?

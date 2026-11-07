# Glas und Tischdeko

> **Status: Konzept, nichts davon ist umgesetzt.** Erst bauen, wenn es ausdrücklich beauftragt wird. Zigaretten, Schachteln und Rauch stehen in [`cigarettes.md`](cigarettes.md).

Auf den Tischen im Raum und am Billardtisch stehen Gläser, Flaschen und Kleinteile. Sie müssen **wie Glas aussehen** und in der **Größe stimmen**; die Form darf einfach sein und wird **per Formel berechnet**, ohne externe Modelle.

## Die Objekte

| Objekt | Größe (ca.) | Inhalt / Besonderheit |
|--------|-------------|------------------------|
| **Kerzenhalter** | Ø 7 cm, 8 cm hoch | **Dunkelrotes Glas** mit Kerze (Teelicht) und **flackerndem Licht**. Steht **auf jedem Tisch**. |
| **Aschenbecher** | Ø 14 cm, 3 cm hoch | Glas, am Rand **5 Kerben** für Zigaretten. |
| **Weinglas** | 20 cm hoch, Kelch Ø 8 cm | Stiel und Fuß, ca. ein Drittel mit Wein gefüllt (rot oder weiß). |
| **Bierglas** | 15 cm hoch, oben Ø 7 cm | Goldenes Bier mit **Schaumkrone** (ca. 2 cm). |
| **Weinflasche** | 30 cm hoch, Ø 7,5 cm | Dunkelgrünes Glas, Etikett, Hals. |
| **Bierflasche** | 23 cm hoch, Ø 6 cm | Braunes Glas, Etikett, Kronkorken. |

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
- **Platz:** Der Rahmen ist nur **11 cm breit** (`RAIL_WOOD_DEPTH`). Ein Aschenbecher mit Ø 14 cm passt nicht; hier einen **kleineren** (Ø ≤ 10 cm) nehmen. Das Glas (Ø 7 cm) passt.
- **Stelle:** neben einer Tasche oder an einer Ecke, nicht auf den Diamanten und nicht zu nah an der Bande, damit sie beim Spiel nicht im Weg stehen (Kamera und Cue-Ansicht).
- Wer „Spieler 1 und 2“ ist und an welcher Seite sie stehen, kommt mit den Rollen aus [`game-concept.md`](game-concept.md). Bis dahin: feste Plätze auf der linken Längsseite.

## Offene Punkte

- Sollen die Gläser mit der Zeit leerer werden (Trinken)?
- Soll man Gläser anklicken oder bewegen können?
- Wein: nur rot oder auch weiß, und wie viele Sorten Bier?
- Kerzen: reichen ein Licht-Sprite und Leuchten, oder sollen alle Tische echtes Licht bekommen (Kosten)?
- Soll das Glas vorne an der Bande des Billardtisches stehen, wenn ein Spieler nicht am Zug ist?

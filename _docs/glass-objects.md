# Glas und Tischdeko

> **Status: umgesetzt.** Zigaretten, Schachteln, Feuerzeug und Rauch stehen in [`cigarettes.md`](cigarettes.md).

Auf den Tischen im Raum und am Billardtisch stehen Kerzenhalter, Aschenbecher, Gläser und Flaschen. Alles wird **per Formel berechnet** (ohne externe Modelle), sieht aus wie Glas und hat die richtige Größe. Es ist reine Optik, kein Physik-Körper, und stört weder Kugeln noch Cue. Alle Maße stehen in eigenen `*-constants.js`.

| Objekt | Größe (ca.) | Code |
|--------|-------------|------|
| **Kerzenhalter** | Schale Ø 13 cm, Röhre 6 cm; weiße Wachskerze Ø 3 cm, 13 cm hoch | `candle.js` |
| **Aschenbecher** | Ø 14 cm, 3 cm hoch, 5 Kerben | `ashtray.js` |
| **Weinglas** | 20 cm hoch, Kelch Ø 8 cm, zu 40 % gefüllt (rot oder weiß) | `glasses.js` |
| **Bierglas** | 15 cm hoch, oben Ø 7 cm, goldenes Bier mit Schaumkrone | `glasses.js` |
| **Whiskeyglas** | 9 cm hoch, oben Ø 7,5 cm, zwei Finger Whiskey | `glasses.js` |
| **White Russian** | im Whiskeyglas, zwei Schichten: unten dunkler Kaffeelikör, oben Sahne | `glasses.js` |
| **Weinflasche** | 30 cm hoch, Ø 7,5 cm, dunkelgrün, Etikett, Folienkapsel | `bottles.js` |
| **Bierflasche** | 23 cm hoch, Ø 6 cm, braun, Etikett, Kronkorken | `bottles.js` |

## Form und Optik

- **Drehkörper:** Jedes Objekt ist ein Profil aus wenigen Zahlen (Boden, Wölbung, Hals, Rand), das um die Achse gedreht wird (`LatheGeometry`). Gläser haben eine Wandstärke (Außen- und Innenfläche); Wein, Bier und Whiskey sind eigene, etwas kleinere Körper in der Innenform, das Bier trägt eine gewölbte Schaumkrone.
- **Glas:** fast durchsichtig, ohne Schatten, mit **Spiegelung des Raums** (die Aufnahme für die Kugeln, `ball-reflection.js`). Damit es glänzt, behalten Glanzlichter und Spiegelung auch bei Transparenz ihre volle Stärke (`clearGlass` in `applyBallReflection`). Bier und Whiskey sind so durchsichtig wie getöntes Glas (Alpha 0,5 bzw. 0,6, leicht selbstleuchtend), Wein etwas dichter (rot 0,8, weiß 0,5), der Schaum deckend. Auf `transmission` (echte Brechung) wird bewusst verzichtet, es wäre bei so vielen Objekten zu teuer.
- **Aschenbecher:** schweres, leicht grünliches Glas; die Kerben (8 mm tief) entstehen, indem der Rand an 5 Stellen abgesenkt wird.
- **Flaschen:** Etikett als Streifen über etwa 140° an der Vorderseite (Canvas-Textur, erfundene Namen „Château Backroom“ und „Backroom Original Lager“, keine echten Marken); fast undurchsichtig (Alpha 0,9 bzw. 0,88), leer gedacht.
- **Kerzenhalter:** dunkelrote Glasur, spiegelt den Raum.

## Kerzenlicht

Die Flamme streckt sich und wiegt sich, ihr Schein und das Licht schwanken unregelmäßig (überlagerte Sinus-Wellen). Alle Flammen leuchten; **echtes Licht** (Punktlicht, schwach, 2,5 m Reichweite, ohne Schatten) bekommen nur die **3 Kerzen, die der Kamera am nächsten sind**, beim Wechsel blendet es aus und an der neuen Kerze ein (`CANDLE_REAL_LIGHTS`, `CANDLE_LIGHT_*`). So bleibt die Zahl der Lichter im Raum klein, und der Raum wird nicht heller. Die Standteile der Kerzen sind instanziert.

## Verteilung

- **Auf den Tischen:** Der Kerzenhalter steht auf jedem Tisch, ungefähr in der Mitte (zufällig bis 12 cm daneben). Dazu je Tisch zufällig: ca. zwei Drittel haben einen Aschenbecher (25 cm von der Mitte), 0–2 Gläser (je 30 % Wein, davon 70 % rot, 20 % Whiskey, 15 % White Russian, sonst Bier), ca. 40 % eine Flasche (je zur Hälfte Wein oder Bier). Alles mit festem Startwert, also bei jedem Start gleich, mit Abstand zueinander und leicht gedreht.
- **Am Billardtisch** (Holzrahmen, links, nur 11 cm breit): je Spieler ein **Aschenbecher** (auf 65 % verkleinert, Ø 9 cm, zwischen der letzten Raute und der Ecktasche) und ein **Getränk** daneben. Die Getränke werden **bei jedem Laden neu gewürfelt**, und die beiden Spieler bekommen **nie dasselbe** (Rotwein, Weißwein, Bier, Whiskey, White Russian). Dazu liegen Packung und Feuerzeug (`cigarettes.md`). Flaschen stehen dort nicht.
- Wer „Spieler 1 und 2“ ist und an welcher Seite sie stehen, kommt mit den Rollen aus [`game-concept.md`](game-concept.md). Bis dahin: feste Plätze auf der linken Längsseite.

## Getränke: Aussehen

Alle fünf Getränke sind **klare** Flüssigkeiten mit demselben Look (`glasses.js`, Werte je Getränk in `LIQUID_LOOKS` in `glasses-constants.js`):
- **Meniskus (Benetzung):** Die Flüssigkeit steigt an der Glaswand 1 bis 1,6 mm nach oben und fällt auf 2,5 bis 3,5 mm Breite in einer glatten Kurve zum Stand in der Mitte; die Kante ist hell (Vertex-Farbe), die Mitte der Oberfläche etwas dunkler. Gilt für Whiskey, Bier, beide Weine und die Sahne (nicht für den Kaffee darunter).
- **Tiefe:** Ein kleiner Shader macht jedes Getränk in der Mitte dunkel und dicht (`center`, `opacityCenter`) und an den Rändern heller, gesättigter, durchsichtiger (`edge`, `opacityEdge`) mit einem warmen Leuchten (`glow`), als scheine Licht durch. `power` bestimmt, wie schmal die dunkle Mitte ist.
- **Bier:** zusätzlich feine, feste Bläschen (`sparkle`, kleine helle Punkte in der Flüssigkeit).
- **White Russian:** Der Kaffee ist nach oben hin heller, die Sahne unten etwas bräunlicher, so entsteht ein weicher Übergang zwischen den Schichten.
- Die Formen beim Trinken werden mit denselben Funktionen neu gebaut wie am Anfang, der Look bleibt also gleich.

## Trinken: Füllstand, Schaum, Nachschub (nur am Billardtisch)

Gilt nur für die **Getränke der Spieler**; alles auf den Tischen im Raum bleibt unverändert (`glasses.js` mit `player`, `drinking.js`).

- **Füllstand:** 5 Schlucke pro Getränk. Mit jedem sinkt der Stand um ein Fünftel, danach ist das Glas leer.
- **`R` halten:** Das Glas fliegt zum Mund und bleibt dort; es wird Schluck für Schluck getrunken (ca. 0,8 s pro Schluck, ±15 %), der Stand sinkt gleichmäßig, das Glas kippt dabei weiter, je leerer es ist (0,7 bis 1,2 rad). Beim Loslassen wird der laufende Schluck noch beendet, dann fliegt das Glas zurück; ein Antippen ist genau ein Schluck. Ist das Glas leer, endet das Trinken von selbst. Jeder Schluck bewegt den Körper-Marker. Auf dem Drink-Knopf zeigt eine Plakette (wie die Zigaretten auf dem Smoke-Knopf), **wie viele Schlucke noch im Glas sind**: im Glas, aus dem `R` gerade trinkt (in der Hand), sonst im eigenen Glas (dem der Kamera nächsten); 0, wenn es leer ist, dann öffnet `R` die Getränkekarte. Ab 2 Schlucken seufzt der Spieler ein „Ahh“.
- **Sound** (`drink-sounds.js`): ein „Glug“ pro Schluck (Kehlklick, tiefer Schlag, Wasser-Gluckser; 4 Varianten), dazu ein leises Fließgeräusch, solange das Glas gekippt ist (Bier sprudelig, Whiskey fast still), und das „Ahh“ am Ende. Werte in `sound-constants.js`. Das Getränk wird dafür für dieses eine Glas neu berechnet.
- **White Russian:** Beim Trinken sinken beide Schichten gemeinsam (unten 45 % Kaffeelikör, oben Sahne); der Rest wie beim Whiskey.
- **Schaum (Bier):** sinkt mit dem Bier und **zerfällt mit der Zeit** (`BEER_FOAM_DECAY_SECONDS`, 4 Minuten): erst wird die Krone flacher, dann öffnet sich in der Mitte ein Loch mit ausgefranstem Rand, das sich aufweitet, bis nur noch ein schmaler Ring an der Glaswand bleibt.
- **Nachschub:** Ist ein Glas leer (nach dem letzten Schluck, oder `R`, wenn das eigene Glas leer ist), erscheint die **Getränkekarte** als Popover „Was darf es sein?“ (`drink-menu.js`, Preise in `shop-constants.js`): **Bier 8 $, Rotwein 14 $, Weißwein 14 $, White Russian 16 $, Whiskey 18 $**. Ein Klick **kauft das Getränk sofort** und ersetzt das leere Glas durch ein volles der Sorte. Nicht bezahlbare Getränke sind grau, `Esc` oder ein Klick daneben schließt die Karte.

## Offene Punkte

- Whiskey mit Eiswürfeln? Mehr Sorten Bier?
- Sollen Gläser anklickbar oder bewegbar sein?
- Sollen die Kerzen aller Tische echtes Licht bekommen (Kosten)?

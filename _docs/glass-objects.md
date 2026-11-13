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
| **Cognacschwenker** | 12,5 cm hoch, kurzer Stiel, bauchig (Ø 9 cm), oben enger; wenig Cognac | `glasses.js` |
| **Champagnerflöte** | 22,5 cm hoch, langer Stiel, schmal (Ø 4,8 cm), blassgoldener Champagner mit Bläschen | `glasses.js` |
| **Wasserglas (Vodka)** | 10 cm hoch, gerade, oben Ø 7 cm; ein Achterl Vodka mit Eis | `glasses.js` |
| **Longdrinkglas (Gin Tonic)** | 15 cm hoch, gerade, oben Ø 6,8 cm; Tonic mit Bläschen, Eis und Limettenscheibe | `glasses.js` |
| **Cocktailglas** | 16,5 cm hoch, Kegel am Stiel (oben Ø 11 cm), pinker Cocktail, Kirsche am Spieß | `glasses.js` |
| **Eiswürfel** | 2,3–2,5 cm, abgerundet; in Whiskey, White Russian, Vodka und Gin Tonic | `glasses.js` |
| **Weinflasche** | 30 cm hoch, Ø 7,5 cm, dunkelgrün, Etikett, Folienkapsel | `bottles.js` |
| **Bierflasche** | 23 cm hoch, Ø 6 cm, braun, Etikett, Kronkorken | `bottles.js` |

## Form und Optik

- **Drehkörper:** Jedes Objekt ist ein Profil aus wenigen Zahlen (Boden, Wölbung, Hals, Rand), das um die Achse gedreht wird (`LatheGeometry`). Gläser haben eine Wandstärke (Außen- und Innenfläche); die Getränke sind eigene, etwas kleinere Körper in der Innenform, das Bier trägt eine gewölbte Schaumkrone. Es gibt zwei Grundformen: **Stielgläser** (Wein, Cognac, Champagner, Cocktail; nur die Kurve des Kelchs ist je Glas anders, `stemmedGlass`) und **gerade Gläser mit dickem Boden** (Bier, Whiskey, Vodka, Gin Tonic; `taperedGlass`).
- **Sorten:** Jede Sorte steht in einer Tabelle (`KINDS` in `glasses.js`): Glas, Schichten des Getränks, Eis und Garnitur. Menü, Bar und Tische nehmen die Sorten von dort (`DRINK_KINDS`); welche Sorte wie oft auf den Tischen steht, steht in `GLASSES_KIND_WEIGHTS`.
- **Glas:** fast durchsichtig, ohne Schatten, mit **Spiegelung des Raums** (die Aufnahme für die Kugeln, `ball-reflection.js`). Damit es glänzt, behalten Glanzlichter und Spiegelung auch bei Transparenz ihre volle Stärke (`clearGlass` in `applyBallReflection`). Bier und Whiskey sind so durchsichtig wie getöntes Glas (Alpha 0,5 bzw. 0,6, leicht selbstleuchtend), Wein etwas dichter (rot 0,8, weiß 0,5), der Schaum deckend. Auf `transmission` (echte Brechung) wird bewusst verzichtet, es wäre bei so vielen Objekten zu teuer.
- **Aschenbecher:** schweres, leicht grünliches Glas; die Kerben (8 mm tief) entstehen, indem der Rand an 5 Stellen abgesenkt wird.
- **Flaschen:** Etikett als Streifen über etwa 140° an der Vorderseite (Canvas-Textur, erfundene Namen „Château Backroom“ und „Backroom Original Lager“, keine echten Marken); fast undurchsichtig (Alpha 0,9 bzw. 0,88), leer gedacht.
- **Kerzenhalter:** dunkelrote Glasur, spiegelt den Raum.

## Kerzenlicht

Die Flamme streckt sich und wiegt sich, ihr Schein und das Licht schwanken unregelmäßig (überlagerte Sinus-Wellen). Alle Flammen leuchten; **echtes Licht** (Punktlicht, schwach, 2,5 m Reichweite, ohne Schatten) bekommen nur die **3 Kerzen, die der Kamera am nächsten sind**, beim Wechsel blendet es aus und an der neuen Kerze ein (`CANDLE_REAL_LIGHTS`, `CANDLE_LIGHT_*`). So bleibt die Zahl der Lichter im Raum klein, und der Raum wird nicht heller. Die Standteile der Kerzen sind instanziert.

## Verteilung

- **Auf den Tischen:** Der Kerzenhalter steht auf jedem Tisch, ungefähr in der Mitte (zufällig bis 12 cm daneben). Dazu je Tisch zufällig: ca. zwei Drittel haben einen Aschenbecher (25 cm von der Mitte), 0–2 Gläser (alle Sorten, am häufigsten Rotwein, Bier und Whiskey, `GLASSES_KIND_WEIGHTS`; ihr Eis ist schon etwas geschmolzen und bleibt so), ca. 40 % eine Flasche (je zur Hälfte Wein oder Bier). Alles mit festem Startwert, also bei jedem Start gleich, mit Abstand zueinander und leicht gedreht.
- **Am Billardtisch** (Holzrahmen, links, nur 11 cm breit): je Spieler ein **Aschenbecher** (auf 65 % verkleinert, Ø 9 cm, zwischen der letzten Raute und der Ecktasche) und ein **Getränk** daneben. Die Getränke werden **bei jedem Laden neu gewürfelt** (aus allen zehn Sorten), und die beiden Spieler bekommen **nie dasselbe**. Dazu liegen Packung und Feuerzeug (`cigarettes.md`). Flaschen stehen dort nicht.
- Wer „Spieler 1 und 2“ ist und an welcher Seite sie stehen, kommt mit den Rollen aus [`game-concept.md`](game-concept.md). Bis dahin: feste Plätze auf der linken Längsseite.

## Getränke: Aussehen

Alle Getränke sind **klare** Flüssigkeiten mit demselben Look (`glasses.js`, Werte je Getränk in `LIQUID_LOOKS` in `glasses-constants.js`):
- **Meniskus (Benetzung):** Die Flüssigkeit steigt an der Glaswand 1 bis 1,6 mm nach oben und fällt auf 2,5 bis 3,5 mm Breite in einer glatten Kurve zum Stand in der Mitte; die Kante ist hell (Vertex-Farbe), die Mitte der Oberfläche etwas dunkler. Gilt für alle Getränke und die Sahne (nicht für den Kaffee darunter).
- **Tiefe:** Ein kleiner Shader macht jedes Getränk in der Mitte dunkel und dicht (`center`, `opacityCenter`) und an den Rändern heller, gesättigter, durchsichtiger (`edge`, `opacityEdge`) mit einem warmen Leuchten (`glow`), als scheine Licht durch. `power` bestimmt, wie schmal die dunkle Mitte ist.
- **Glanzstreifen:** Auf der Glaswand liegt ein schmaler heller Streifen (wie ein Fenster, das sich spiegelt), im selben Shader.
- **Bier, Champagner, Gin Tonic:** zusätzlich kleine runde Bläschen, die **aufsteigen** (`sparkle`, Anteil der Zellen mit Bläschen; `bubble` ihre Farbe). Sie entstehen im Shader (keine echten Kugeln, das wäre viel zu teuer) und steigen je Spalte mit eigener Geschwindigkeit; die Zeit läuft in `glasses.update`.
- **Eiswürfel:** abgerundete Würfel (`RoundedBoxGeometry`) im selben Shader wie die Getränke (`LIQUID_LOOKS.ice`), fast durchsichtig, an den Kanten heller. Sie werden **vor** dem Getränk gezeichnet und scheinen so durch es hindurch. Sie **schwimmen**: 90 % eines Würfels liegen unter der Oberfläche (`ICE_SINK`), mehrere stapeln sich nach unten (`ICE` in `glasses-constants.js`: Größe und Lage je Getränk); beim Trinken sinken sie mit, im leeren Glas liegen sie am Boden.
- **Garnitur:** Im Gin Tonic schwimmt eine Limettenscheibe (aufrecht an der Glaswand, Canvas-Textur mit Schale, weißem Rand und Segmenten), im Cocktail liegt eine Kirsche am Spieß.
- **White Russian:** Der Kaffee ist nach oben hin heller, die Sahne unten etwas bräunlicher, so entsteht ein weicher Übergang zwischen den Schichten.
- Die Formen beim Trinken werden mit denselben Funktionen neu gebaut wie am Anfang, der Look bleibt also gleich.

## Trinken: Füllstand, Schaum, Nachschub (nur am Billardtisch)

Gilt nur für die **Getränke der Spieler**; alles auf den Tischen im Raum bleibt unverändert (`glasses.js` mit `player`, `drinking.js`).

- **Füllstand:** 5 Schlucke pro Getränk. Mit jedem sinkt der Stand um ein Fünftel, danach ist das Glas leer.
- **`R` halten:** Das Glas fliegt zum Mund und bleibt dort; es wird Schluck für Schluck getrunken (ca. 0,8 s pro Schluck, ±15 %), der Stand sinkt gleichmäßig, das Glas kippt dabei weiter, je leerer es ist (0,7 bis 1,2 rad). Beim Loslassen wird der laufende Schluck noch beendet, dann fliegt das Glas zurück; ein Antippen ist genau ein Schluck. Ist das Glas leer, endet das Trinken von selbst. Jeder Schluck bewegt den Körper-Marker. Auf dem Drink-Knopf zeigt eine Plakette (wie die Zigaretten auf dem Smoke-Knopf), **wie viele Schlucke noch im Glas sind**: im Glas, aus dem `R` gerade trinkt (in der Hand), sonst im eigenen Glas (dem der Kamera nächsten); 0, wenn es leer ist, dann öffnet `R` die Getränkekarte. Ab 2 Schlucken seufzt der Spieler ein „Ahh“.
- **Sound** (`drink-sounds.js`): ein „Glug“ pro Schluck (Kehlklick, tiefer Schlag, Wasser-Gluckser; 4 Varianten), dazu ein leises Fließgeräusch, solange das Glas gekippt ist (Bier, Champagner und Gin Tonic sprudelig, Whiskey und Cognac fast still), und das „Ahh“ am Ende. Werte in `sound-constants.js`. Das Getränk wird dafür für dieses eine Glas neu berechnet.
- **Stielgläser:** Der Stand fällt nicht gleichmäßig in der Höhe, sondern so, dass jeder Schluck etwa gleich viel nimmt (im Kegel des Cocktailglases fällt er oben schnell, unten langsam; `volume` in `SNIFTER`, `FLUTE`, `COCKTAIL_GLASS`).
- **Eis schmilzt:** Ein Glas mit Eis zählt die Zeit seit dem Einschenken; in `ICE_MELT_SECONDS` (5 Minuten) werden die Würfel auf 35 % ihrer Größe kleiner (`ICE_MELT_MIN`), dann sind sie weg, auch im leeren Glas. Das Getränk wird dabei nicht verwässert. Ein neu gekauftes Glas hat frisches Eis. Wie der Schaum wird das Schmelzen nicht übertragen: Jeder Browser rechnet ab dem Moment, in dem er das Glas sieht. Solange Eis im Glas ist, **klirrt** es bei jedem Schluck und beim Abstellen (`playIceSound`, `ICE_CLINK_*`).
- **White Russian:** Beim Trinken sinken beide Schichten gemeinsam (unten 45 % Kaffeelikör, oben Sahne); der Rest wie beim Whiskey.
- **Schaum (Bier):** sinkt mit dem Bier und **zerfällt mit der Zeit** (`BEER_FOAM_DECAY_SECONDS`, 4 Minuten): erst wird die Krone flacher, dann öffnet sich in der Mitte ein Loch mit ausgefranstem Rand, das sich aufweitet, bis nur noch ein schmaler Ring an der Glaswand bleibt.
- **Nachschub:** Ist ein Glas leer (nach dem letzten Schluck, oder `R`, wenn das eigene Glas leer ist), erscheint die **Getränkekarte** als Popover „Was darf es sein?“ (`drink-menu.js`, Preise in `shop-constants.js`): **Bier 8 $, Rot- und Weißwein 14 $, Gin Tonic 15 $, White Russian 16 $, Achterl Vodka 16 $, Cocktail 17 $, Whiskey 18 $, Champagner 22 $, Cognac 24 $** (zwei Spalten, wenn Platz ist). Ein Klick **kauft das Getränk sofort** und ersetzt das leere Glas durch ein volles der Sorte. Nicht bezahlbare Getränke sind grau, `Esc` oder ein Klick daneben schließt die Karte.

## Offene Punkte

- Mehr Sorten Bier?
- Sollen Gläser anklickbar oder bewegbar sein?
- Sollen die Kerzen aller Tische echtes Licht bekommen (Kosten)?

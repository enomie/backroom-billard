# Spielkonzept — Ideen

> **Status: Ideen, teilweise umgesetzt** (siehe „Durst, Betrunkenheit und Desire“ und „Tasten und Bedienknöpfe“). Alles andere ist nicht umgesetzt oder eingeplant und wird erst gebaut, wenn es ausdrücklich beauftragt wird.

## Grundidee

Ein Multiplayer-Billard in einem verrauchten Billardcafé der 80er. Für **alle Spieler der Welt gibt es nur einen Tisch**. Backend später z. B. SpacetimeDB.

## Rollen

| Rolle | Beschreibung |
|-------|--------------|
| **Spieler** | Genau 2 gleichzeitig am Tisch. |
| **Zuschauer / Anwärter** | Alle anderen betreten den Raum, ohne Limit. |

- Zuschauer erscheinen als **Gesicht**: eine Kugel mit Nase und zwei Augen (à la Pinocchio).
- Zuschauer haben eine **freie Kamera** zum Herumfliegen, kommen aber **nicht ganz nah an den Tisch**: **mindestens 2 m Abstand zur Tischkante**, damit sie die Spieler nicht stören.
- **Spieler** dürfen mit ihrer freien Kamera (`C`) dicht an den Tisch. Den Button zum Kamerawechsel (unten links) sehen nur Spieler.

## Tischwette (wer spielt als Nächstes)

1. Wer als Nächstes spielen will, platziert eine **Tischwette**.
2. Die **zwei Höchstbietenden** spielen das nächste Spiel.
3. **Winner takes all:** Der Sieger bekommt den Einsatz.
4. Die bisherigen Spieler werden wieder zu Zuschauern.

## Spielgeld

- Jeder neue Spieler bekommt nach der Registrierung **15.000 $ Spielgeld**.
- Später: Spielgeld gegen Echtgeld kaufen, sobald ein Payment eingebunden ist.

## Schuss-Spannung: schwankendes Fadenkreuz

Die Stoßkraft stellt man per Slider oder Mausrad ein. Wie in Shootern **schwankt das Fadenkreuz**, man muss den **richtigen Moment zum Abdrücken** abpassen.

## Zigaretten

- Man kann an einer **Zigarette ziehen**, um **ruhiger** zu werden (das Fadenkreuz schwankt weniger). Dagegen wirkt das **Verlangen** (Desire, siehe „Durst, Betrunkenheit und Desire“); zu viel Rauchen macht dafür fahrig (Nerves).
- Zigaretten werden **extra mit Spielgeld gekauft**.
- Offen: Animation (Aschenbecher, Rauch, Ziehen), wie lange die Ruhe anhält.
- Grund: Das Spiel spielt in den **80ern**, jedes Billardcafé war rauchig und schummrig. Die **Optik** bekommt später ein eigenes Dokument.

## Durst, Betrunkenheit und Desire

Zwei Balken am oberen Rand in der Mitte, jeder mit einem **Marker, der sich zwischen zwei Enden bewegt**. In der **Mitte** ist man **absolut ruhig**; je weiter ein Marker von der Mitte weg ist, desto unruhiger oder ungenauer wird man.

| Balken | Links | Mitte | Rechts |
|--------|-------|-------|--------|
| **1: Durst und Rausch** | **Thirsty** (durstig) | ruhig | **Drunk** (betrunken) |
| **2: Nikotin** (darunter) | **Nerves** (zu viel Nikotin, fahrig) | ruhig | **Desire** (Verlangen, Entzug) |

- **Balken 1:** Der Marker **wandert mit der Zeit nach links** (man wird durstig). **Trinken schiebt ihn nach rechts**: ein Schluck bringt ihn zur Mitte, zu viel schiebt ihn zu „Drunk“. Von dort wandert er mit der Zeit wieder zurück durch die Mitte nach links. Also: **oft, aber wenig trinken**.
- **Balken 2:** Der Marker **wandert mit der Zeit nach rechts** (das Verlangen wächst). **Rauchen schiebt ihn nach links**: ein Zug bringt ihn zur Mitte, zu viel (Kettenrauchen) macht „Nerves“. Von dort wandert er mit der Zeit wieder zurück zur Mitte und weiter zu „Desire“.
- **Wirkung:** Das Fadenkreuz schwankt umso stärker, je weiter die Marker von der Mitte entfernt sind; beide mittig = kein Schwanken. Die Art kann je Ende anders sein, z. B. *Drunk* = Zielfehler und langsames Schwanken, *Nerves* = schnelles Zittern, *Desire* = größeres Schwanken, *Thirsty* = Konzentration lässt nach (alles noch offen).
- **Trinken:** Jedes Getränk hat **5 Schlucke**, dann ist das Glas leer (der Füllstand sinkt mit jedem Schluck um ein Fünftel). Man kann **nicht zu viel trinken**: es gibt keine Sperre und kein Game Over, man wird nur **ungenauer**, je weiter der Marker Richtung „Drunk“ wandert.
- **Rauchen:** Jede Zigarette hat **5 kleine Züge** (je Zug etwa ein Fünftel). Man kann aber auch **die ganze Zigarette auf einmal rauchen**, indem man den Zug lange hält (siehe `cigarettes.md`).
- **Was zählt:** Wichtig sind die Dinge, die **am Billardtisch** liegen (die Getränke und Zigaretten der Spieler). Die Gegenstände auf den Tischen im Raum bleiben unverändert.
- **Umgesetzt** (`player-state.js`, Werte in `player-constants.js`): die zwei Balken oben in der Mitte mit den Tasten-Knöpfen **R Drink** und **T Smoke**, das Trinken (`R`, je Druck ein Schluck des nächsten Spielerglases, Glas fliegt zum Mund und kippt, Füllstand sinkt, `drinking.js`) und das Rauchen (`T`, der Nikotin-Marker bewegt sich während des Ziehens). Die Marker wandern von selbst (Durst 0,003/s nach links, Verlangen 0,004/s nach rechts); ein Schluck schiebt Balken 1 um 0,22, ein Zug Balken 2 um 0,1 je Sekunde. **Calm-Zone** ±0,12: dort keine Wirkung.
- **Wirkung auf das Zielen** (nur Cue und Zielhilfe schwanken, die Kamera bleibt ruhig; größter Ausschlag 0,05 rad ≈ 3°): *Nerves* schnelles kleines Zittern, *Desire* langsames großes Schwanken, *Thirsty* mittleres, unregelmäßiges Schwanken, *Drunk* sehr langsames, großes Schwanken; beim Stoß kommt bei *Drunk* noch ein zufälliger Fehler dazu (bis 0,04 rad). Die Stoßrichtung ist die, in die Cue und Zielhilfe im Moment des Stoßes zeigen.

## Tasten und Bedienknöpfe (HUD)

- **Tasten:** `T` = rauchen (Ziehen, halten = stärker), `R` = trinken, `C` = Kamera wechseln.
- **Knopf zur Taste:** Bei den **Balken** und beim **Kamera-Knopf** wird die Taste angezeigt, die man dafür braucht, und man kann den Knopf **auch direkt bedienen**: Maus am Desktop, Berührung am Handy. Halten gilt wie bei der Taste (Knopf gedrückt halten = Taste gehalten).
- **Aussehen:** wie der **Shoot-Knopf**, aber der **einzelne Buchstabe** darin etwas größer. Der Buchstabe steht links, rechts daneben die Beschriftung.
- **Zuordnung:** Balken 1 (Thirsty – Drunk) gehört zu `R`, Balken 2 (Nerves – Desire) zu `T`.
- **Kamera-Knopf:** größer als heute, links ein großes `C`, rechts **zweizeilig** der aktuelle Modus: **„Player / Camera“** oder **„Free / Camera“**. Die Texte laufen durch `src/i18n` (heute „Cue view“ und „Free camera“).
- **Tastenkonflikt gelöst:** „Neu aufbauen“ (Re-rack) liegt jetzt auf **`N`** (und dem Knopf oben rechts), `R` ist frei für das Trinken.
- **Umgesetzt:** der große Kamera-Knopf (`C`, zweizeilig „Player / Free Camera“) unten links und die Knöpfe **R Drink** und **T Smoke** neben den Balken, alle im Stil des Shoot-Knopfes. R ist ein Druck pro Schluck, T bleibt gedrückt (halten = stärker ziehen).

## Offene Punkte (noch nicht entschieden)

- Deutsche Beschriftung der Enden (Durstig / Betrunken, Nervös / Desire?); die englischen Namen stehen fest.
- Feintuning der Werte (Geschwindigkeit der Marker, Stärke der Wirkung) nach dem Spielen.
- Gibt es Nachschub, wenn ein Glas leer ist (neues Getränk)? Heute bleibt es leer, und die Zigarette im Aschenbecher brennt irgendwann ab.

- Was passiert mit den Einsätzen der Verlierer der Wette?
- Was passiert, wenn niemand bietet oder zwei Gebote gleich hoch sind?
- Wie lange dauert ein Spiel höchstens (Zeitlimit pro Stoß, Abbruch bei Inaktivität)?
- Wie nah dürfen Zuschauer an den Tisch (Radius)?
- Wie wird ein Spiel im Mehrspieler fair synchronisiert (die Physik läuft bisher lokal)?

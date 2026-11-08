# Spielkonzept

> **Status:** Der Zustand des Spielers (die zwei Balken), Trinken, Rauchen, Geld und die HUD-Knöpfe sind **umgesetzt**. Mehrspieler, Rollen, Tischwette und alles unter „Ideen“ sind **nicht umgesetzt** und werden erst gebaut, wenn es ausdrücklich beauftragt wird.

## Grundidee

Ein Multiplayer-Billard in einem verrauchten Billardcafé der 80er. Für **alle Spieler der Welt gibt es nur einen Tisch**. Backend später z. B. SpacetimeDB.

## Umgesetzt

### Zustand des Spielers: zwei Balken

Zwei Balken oben in der Mitte, jeder mit einem **Marker, der sich zwischen zwei Enden bewegt**. In der **Mitte** ist man **absolut ruhig**; je weiter ein Marker von der Mitte weg ist, desto unruhiger oder ungenauer wird man (`player-state.js`, Werte in `player-constants.js`).

| Balken | Links | Mitte | Rechts |
|--------|-------|-------|--------|
| **1: Durst und Rausch** (Knopf `R`) | **Thirsty** | ruhig | **Drunk** |
| **2: Nikotin** (Knopf `T`) | **Nerves** (zu viel Nikotin, fahrig) | ruhig | **Desire** (Verlangen) |

- **Balken 1:** Der Marker wandert mit der Zeit nach links (0,003/s). **Trinken schiebt ihn nach rechts** (ein Schluck um 0,22): ein Schluck bringt ihn zur Mitte, zu viel führt zu „Drunk“. Also: oft, aber wenig trinken.
- **Balken 2:** Der Marker wandert mit der Zeit nach rechts (0,004/s). **Rauchen schiebt ihn nach links** (0,1 je Sekunde Ziehen): ein Zug bringt ihn zur Mitte, Kettenrauchen macht „Nerves“.
- **Calm-Zone** ±0,12: dort keine Wirkung.
- **Wirkung auf das Zielen:** Die Cue-Spitze kreist (seitlich und auf-ab) um das Ziel, Kamera und Mittelpunkt der Kugel bleiben ruhig, höchstens 0,05 rad ≈ 3°. *Nerves* = schnelles kleines Zittern, *Desire* = langsames großes Schwanken, *Thirsty* = mittleres, unregelmäßiges Schwanken, *Drunk* = sehr langsames, großes Schwanken, dazu beim Stoß ein zufälliger Fehler bis 0,04 rad. Unten in der Mitte steht über dem eckigen **Shoot-Button** eine **transparente, runde Fläche** (die Kugel von vorn, mit feinem Kreuz) mit einem verschiebbaren Nubbel (Doppelklick = Mitte): Er setzt, wo die Cue-Spitze die Kugel trifft (bis 0,5 Kugelradius seitlich/oben/unten). Die Physik erzeugt Effet und leichte Ablenkung von selbst. Die Stoßrichtung ist die, in die Cue und Zielhilfe im Moment des Stoßes zeigen.

### Trinken (`R`)

Jedes Getränk hat **5 Schlucke**, dann ist das Glas leer. Man kann nicht zu viel trinken: keine Sperre, kein Game Over, man wird nur ungenauer. `R` halten trinkt Schluck für Schluck das nächste Spielerglas, ein Antippen ist ein Schluck (`drinking.js`); ist es leer, kommt die Getränkekarte (siehe `glass-objects.md`). Wichtig sind nur die Dinge **am Billardtisch**; die Gegenstände auf den Tischen im Raum bleiben unverändert.

### Rauchen (`T`)

Jede Zigarette hat 5 Züge (ein Zug etwa ein Fünftel); wer will, raucht sie auf einmal. Ist keine da, wird eine neue genommen und angezündet (siehe `cigarettes.md`).

### Geld

Das Geld steht oben links (`wallet.js`, Start **15.000 $**). Gekauft wird **Trinken** (Getränkekarte: Bier 8, Wein 14, White Russian 16, Whiskey 18 $) und **Zigaretten** (automatisch eine neue Packung für 75 $, wenn die alte leer ist).

### Tasten und Bedienknöpfe (HUD)

- **Tasten:** `E` schießen, `T` rauchen (halten = stärker ziehen), `R` trinken, `C` Kamera wechseln, `N` neu aufbauen.
- **Knöpfe:** Unten stehen **R Drink** links, **E Shoot** in der Mitte (mit der Fläche für den Nubbel darüber) und **T Smoke** rechts. Der **Kamera-Knopf** (`C`, „Camera“ oder „Free“, je nach Kamera) klebt am linken Browserrand vertikal mittig, der Text steht senkrecht und liest sich von unten nach oben; er ist nur rechts abgerundet. Gegenüber am rechten Rand steht der Power-Regler: Prozentzahl, Regler und Blitz-Symbol, 44 px breit, ohne Hintergrund und Rahmen. Auf dem Handy (unter 768 px) steht der Titel klein ganz oben in der Mitte, darunter die zwei Balken, darunter zentriert Status, Geld und versenkte Kugeln; die Tastenbuchstaben in den Knöpfen entfallen dort. Rechts oben steht nur das **Einstellungen-Symbol** (gelb, ohne Hintergrund, `settings.js`). Es öffnet ein Overlay mit dem **Re-rack-Knopf** (mit Pfeil-Symbol), den **Sprachflaggen** und den **Hinweisen zur Bedienung**; geschlossen wird es mit dem Kreuz, `Esc` oder einem Klick daneben, solange es offen ist, tun die Spieltasten nichts. Auf dem Handy bilden die drei Knöpfe unten eine **verbundene Leiste** über die volle Breite, bündig am unteren, linken und rechten Rand (nur oben abgerundet, dünne Trennlinien): Drink 31 %, Shoot 38 % und etwas höher (3,75 statt 3 rem, wie ein Reiter, darüber die Fläche für den Nubbel), Smoke 31 %. Ein zu langes Wort (andere Sprachen) wird mit „…“ gekürzt, die Zahl in der Plakette nie; der volle Name steht als Tooltip (`title`). Am PC sind die drei Knöpfe **gleich hoch** (`--bottom-button-height`) und stehen auf einer Linie (`--bottom-edge`); sie sehen aus wie der Shoot-Button, mit dem Buchstaben etwas größer, und lassen sich mit Maus oder Berührung bedienen. R und T bleiben gedrückt wie die Taste.

## Ideen (nicht umgesetzt)

### Rollen

| Rolle | Beschreibung |
|-------|--------------|
| **Spieler** | Genau 2 gleichzeitig am Tisch. |
| **Zuschauer / Anwärter** | Alle anderen betreten den Raum, ohne Limit. |

- Zuschauer erscheinen als **Gesicht**: eine Kugel mit Nase und zwei Augen (à la Pinocchio).
- Zuschauer haben eine **freie Kamera**, kommen aber **nicht nah an den Tisch**: **mindestens 2 m Abstand zur Tischkante**.
- **Spieler** dürfen mit ihrer freien Kamera (`C`) dicht an den Tisch. Den Kamera-Knopf sehen nur Spieler.
- Heute gibt es keine Rollen: Der Kamera-Knopf ist für alle da, und die zwei Plätze am Billardtisch (Aschenbecher, Glas, Packung, Feuerzeug links, Seite nach Kamera-z) sind fest.

### Tischwette (wer spielt als Nächstes)

1. Wer als Nächstes spielen will, platziert eine **Tischwette**.
2. Die **zwei Höchstbietenden** spielen das nächste Spiel.
3. **Winner takes all:** Der Sieger bekommt den Einsatz.
4. Die bisherigen Spieler werden wieder zu Zuschauern.

Später: Spielgeld gegen Echtgeld kaufen, sobald ein Payment eingebunden ist.

### Schuss-Spannung

Wie in Shootern könnte das Fadenkreuz schwanken, sodass man den **richtigen Moment zum Abdrücken** abpassen muss. Heute schwanken Cue und Zielhilfe nur durch den Zustand des Spielers, nicht fest.

## Offene Punkte

- Deutsche Beschriftung der Enden (Durstig / Betrunken, Nervös / Verlangen?); die englischen Namen stehen fest.
- Feintuning der Werte (Geschwindigkeit der Marker, Stärke der Wirkung) nach dem Spielen.
- Was passiert mit den Einsätzen der Verlierer der Wette?
- Was passiert, wenn niemand bietet oder zwei Gebote gleich hoch sind?
- Wie lange dauert ein Spiel höchstens (Zeitlimit pro Stoß, Abbruch bei Inaktivität)?
- Wie nah dürfen Zuschauer an den Tisch (Radius)?
- Wie wird ein Spiel im Mehrspieler fair synchronisiert (die Physik läuft bisher lokal)?

# Spielkonzept — Ideen

> **Status: nur Ideen.** Nichts davon ist umgesetzt oder eingeplant. Umgesetzt wird erst, wenn es ausdrücklich beauftragt wird.

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

- Man kann an einer **Zigarette ziehen**, um **ruhiger** zu werden (das Fadenkreuz schwankt weniger). Dagegen wirkt der **Nikotinentzug** (siehe „Durst, Betrunkenheit und Entzug“).
- Zigaretten werden **extra mit Spielgeld gekauft**.
- Offen: Animation (Aschenbecher, Rauch, Ziehen), wie lange die Ruhe anhält.
- Grund: Das Spiel spielt in den **80ern**, jedes Billardcafé war rauchig und schummrig. Die **Optik** bekommt später ein eigenes Dokument.

## Durst, Betrunkenheit und Entzug

Der Spieler hat drei Zustände, die sich mit der Zeit und durch sein Handeln ändern:

| Anzeige | Verlauf | Wirkung |
|---------|---------|---------|
| **Durst** | steigt mit der Zeit; **Trinken** senkt ihn | Man muss ab und zu trinken. |
| **Betrunken** | steigt beim **Trinken**, sinkt langsam von selbst | Man wird **ungenauer** (der Zielfehler und das Schwanken nehmen zu). |
| **Entzug** (Name offen) | steigt mit der Zeit; **Rauchen** senkt ihn | Je größer der Entzug, desto unruhiger (das Fadenkreuz schwankt mehr); Rauchen macht wieder ruhiger. |

- **Der Zielkonflikt:** Wer nicht trinkt, wird durstig (Folge noch offen); wer trinkt, wird betrunken und ungenau. Man muss das richtige Maß finden.
- **Anzeige:** **oben in der Mitte zwei Balken** (Durst und Betrunken), so dass man sieht, ob man durstig, betrunken oder dazwischen ist; **darunter ein dritter Balken** für den Entzug.
- Umgesetzt sind dafür bisher nur die Gegenstände: Gläser und Flaschen (`glass-objects.md`) und Zigaretten mit Ziehen (`cigarettes.md`). Das Trinken selbst (Glas nehmen, Schluck, Bewegung) und alle Werte sind offen.

## Offene Punkte (noch nicht entschieden)

- Wie heißt der dritte Balken (Entzug)? Vorschläge: **Verlangen / Craving**, **Nerven / Nerves**, **Entzug / Withdrawal**, **Jieper**.
- Was bewirkt Durst, wenn man gar nicht trinkt (Zittern, weniger Konzentration, Abzüge)?
- Wie schnell steigen und sinken die Werte, und wie stark wirken sie auf das Zielen?
- Wie trinkt man: Glas oder Flasche vom Tisch nehmen wie bei der Zigarette (Taste halten)?

- Was passiert mit den Einsätzen der Verlierer der Wette?
- Was passiert, wenn niemand bietet oder zwei Gebote gleich hoch sind?
- Wie lange dauert ein Spiel höchstens (Zeitlimit pro Stoß, Abbruch bei Inaktivität)?
- Wie nah dürfen Zuschauer an den Tisch (Radius)?
- Wie wird ein Spiel im Mehrspieler fair synchronisiert (die Physik läuft bisher lokal)?

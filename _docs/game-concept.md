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

- Man kann an einer **Zigarette ziehen**, um **ruhiger** zu werden (das Fadenkreuz schwankt weniger).
- Zigaretten werden **extra mit Spielgeld gekauft**.
- Offen: Animation (Aschenbecher, Rauch, Ziehen), wie lange die Ruhe anhält.
- Grund: Das Spiel spielt in den **80ern**, jedes Billardcafé war rauchig und schummrig. Die **Optik** bekommt später ein eigenes Dokument.

## Offene Punkte (noch nicht entschieden)

- Was passiert mit den Einsätzen der Verlierer der Wette?
- Was passiert, wenn niemand bietet oder zwei Gebote gleich hoch sind?
- Wie lange dauert ein Spiel höchstens (Zeitlimit pro Stoß, Abbruch bei Inaktivität)?
- Wie nah dürfen Zuschauer an den Tisch (Radius)?
- Wie wird ein Spiel im Mehrspieler fair synchronisiert (die Physik läuft bisher lokal)?

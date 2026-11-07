# Stoß-Animation — Konzept

> **Status: nur Konzept, nichts davon ist umgesetzt.** Umgesetzt wird erst, wenn es ausdrücklich beauftragt wird. Die dazugehörigen Klänge stehen in `sound.md`.

## Ausgangslage

Der Stoß passiert **sofort**: Klick, Leertaste oder Button geben der Kugel im selben Moment den Impuls. Die Cue-Bewegung (kurzes Vorschnellen, Nachschwung, Haltepose) läuft nur **danach** als Optik.

## Ziel

Ein Klick löst den Stoß **nicht sofort** aus, sondern startet eine Animation, in der der Spieler den Cue erst **zurückzieht** und dann **nach vorn schnalzen** lässt. Erst wenn die Spitze die Kugel erreicht, bekommt die Kugel den Impuls. **Alles hängt von der gewählten Stoßkraft ab.**

## Ablauf

| Phase | Beschreibung | Abhängigkeit von der Kraft |
|-------|--------------|----------------------------|
| **1. Zurückziehen** | Der Cue gleitet von der Kugel weg nach hinten. | Mehr Kraft = weiter zurück und etwas langsamer. |
| **2. Spannung** (optional) | Kurzer Halt am hinteren Punkt. | Nur bei hoher Kraft, wenige Zehntelsekunden. |
| **3. Vorschnalzen** | Der Cue schnellt nach vorn zur Kugel. | Mehr Kraft = **schneller**. |
| **4. Treffer** | Die Spitze erreicht die Kugel: **jetzt** wirkt der Impuls auf die Kugel (Abstoß-Klang). | Impulsstärke wie bisher aus der Kraft. |
| **5. Nachschwung** | Der Cue bleibt kurz an der Kugel (gibt es schon), dann schwingt er in die Haltepose (gibt es schon). | – |

Richtwerte (zum Einstellen): Zurückziehen 0,25–0,6 s, Vorschnalzen 0,08–0,18 s. Die Zugweite entspricht heute dem Abstand des Cues zur Kugel bei der gewählten Kraft.

## Klänge zur Animation

Zurückziehen (Gleiten, optional Einatmen), Vorschnalzen (Luftzug) und der Abstoß selbst sind in `sound.md` beschrieben.

## Offene Punkte

- Was passiert, wenn der Spieler während der Animation Zielen oder Kraft ändert: gesperrt oder abbrechen?
- Gibt es einen Abbruch (z. B. `Esc` oder ein zweiter Klick), bevor der Cue vorschnellt?
- Soll die Zugweite der Kraft entsprechen oder sichtbar übertrieben werden?
- Soll die Kamera beim Zurückziehen leicht mitgehen (kleiner Zoom oder Wackeln bei hoher Kraft)?
- Gilt das auch für Touch und den SHOOT-Button gleich?

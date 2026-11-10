# Multiplayer (Konzept)

> **Status: Idee, nichts davon ist umgesetzt.** Nur ein Entwurf, wie zwei Spieler (und Zuschauer) mit SpacetimeDB dasselbe sehen, ohne dass etwas ruckelt. Oberstes Ziel: **Die Physik bleibt wie sie ist** (Rapier, feste 240 Hz, echte Spitze); das Netz darf sie nie verbiegen.

## Grundidee: aufnehmen und abspielen

Billard ist **rundenbasiert**: Es stößt immer nur einer, dann rollen die Kugeln aus, dann ist der Nächste dran. Deshalb muss die Physik nicht live über das Netz laufen.

1. **Der Schütze rechnet seinen Stoß komplett selbst** (ohne Anzeige, so schnell der Rechner kann, mit denselben festen 240-Hz-Schritten wie im Spiel) und **nimmt dabei den ganzen Verlauf auf**: Lage und Drehung jeder Kugel (ca. 120-mal pro Sekunde), dazu die Ereignisse (Klack, Bande, Loch, mit Zeit und Stärke).
2. Er schickt **eine** Aufnahme (ein paar zehn KB, quantisiert und als Differenzen gepackt) mit den Stoßdaten an SpacetimeDB.
3. SpacetimeDB schickt sie allen Zuschauern. **Jeder Rechner spielt dieselbe Aufnahme ab** (Zwischenwerte interpoliert, mit der Bildrate des eigenen Bildschirms). Auch der Schütze sieht die Aufnahme, nicht eine zweite Rechnung.
4. Gleichzeitig läuft bei allen **dieselbe Cue-Animation** aus den Stoßdaten (Zurückziehen, Halt, Vorschnalzen), und der Klack fällt auf den Moment, in dem die Aufnahme beginnt.

Folgen:

- **Kein Ruckeln durch das Netz:** Die Aufnahme ist vollständig da, bevor sie abgespielt wird. Netzschwankungen verschieben höchstens den Start, sie unterbrechen nie den Ablauf.
- **Nie unterschiedliche Ergebnisse:** Es gibt nur **eine** Rechnung pro Stoß. Das Ergebnis (versenkt? Foul? schwarze 8?) steht in der Aufnahme.
- **Keine Gleichheit der Rechner nötig:** Verschiedene Browser rechnen `Math.sin` & Co. minimal anders, und Billard ist chaotisch (beim Anstoß verstärkt sich jeder Fehler). Ein Lockstep („alle rechnen mit denselben Eingaben“) würde irgendwann zu verschiedenen Ergebnissen führen. Aufnehmen und abspielen vermeidet das ganz.
- **Die Physik bleibt unangetastet:** keine Vorhersage, kein Zurückrollen, keine Vereinfachung für das Netz.

## Ablauf eines Zuges

| Zeit | Schütze | Gegner / Zuschauer |
|------|---------|--------------------|
| vorher | Zielt; Winkel, Nubbel, Kraft gehen **etwa 15-mal pro Sekunde** an die Datenbank | sieht den Cue sich bewegen (aus den Werten interpoliert) |
| Stoß | drückt SHOOT: `take_shot` (Stoßdaten) | Cue-Animation startet bei allen zum gleichen **Server-Zeitpunkt** |
| 0 bis ~0,5 s | rechnet den Stoß im Hintergrund und lädt die Aufnahme hoch, während der Cue zurückgezogen wird | Cue zieht zurück |
| Kontakt | Start der Aufnahme: spielt sie ab | spielt dieselbe Aufnahme ab, Töne aus den Ereignissen |
| Ruhe | letzte Lage = neuer Ruhezustand; Regeln werten Ergebnis; nächster Spieler | dasselbe, aus derselben Aufnahme |

Der gemeinsame Start ist ein **Server-Zeitpunkt** (jeder Rechner schätzt seinen Zeitunterschied zum Server). Er liegt weit genug hinter dem Stoß, dass die Aufnahme schon überall angekommen ist (Zurückziehen und Halt dauern ca. 0,3 bis 0,75 s); bei langsamer Leitung wird der Start etwas später gesetzt, nie wird abgespielt, bevor alles da ist.

## Was SpacetimeDB speichert

- **Spieler und Zug:** wer am Tisch sitzt, wer dran ist. Eine Aktion (`take_shot`) wird nur angenommen, wenn der Absender dran ist und kein Stoß läuft (die Datenbank ist die einzige Instanz, die die Reihenfolge entscheidet).
- **Ruhezustand:** Lage der Kugeln, versenkte Kugeln, Spielzustand (läuft, gewonnen, verloren und Grund).
- **Stoß:** Stoßdaten + Aufnahme (ein Zeilenpaket) + Startzeit.
- **Kleinkram im Fluss** (Cue-Zielen) als flüchtige Werte, ohne Verlauf.
- Wer später dazukommt (Zuschauer, Wiederverbinden), liest den Ruhezustand und, falls gerade ein Stoß läuft, die Aufnahme mit dem Zeitversatz.

## Zufall und Spielzustand

Alles, was wirkt, kommt **vom Schützen mit in die Aufnahme**: das zufällige Schwanken beim Stoß (Cue-Fehler bis 0,04 rad), Squirt und Swerve, das Neuauflegen der weißen Kugel. Die anderen würfeln nie selbst.

Getränk, Zigaretten, Zustandsbalken und Geld gehören dem jeweiligen Spieler (später eigene Tabelle); für den Stoß zählt nur das, was der Schütze in die Stoßdaten schreibt.

## Entschieden

- **Vertrauen:** Der Schütze rechnet selbst, das genügt (siehe unten).
- **Teilnehmer:** zwei Spieler am Tisch, dazu beliebig viele Zuschauer (nur schauen, freie Kamera).
- **Foul:** Wer das Foul macht (heute: die Cue-Spitze berührt zuerst eine farbige Kugel), **verliert** das Spiel sofort; der andere gewinnt.
- **Gewinnen:** Wer die **schwarze 8 einlocht, nachdem alle anderen Kugeln versenkt sind**, gewinnt. Die Kugeln gehören niemandem (keine Farben, keine Volle/Halbe): alle Kugeln spielen beide.
- **Schwarze zu früh:** Wer die schwarze 8 versenkt, solange noch andere Kugeln auf dem Tisch liegen, verliert (wie im Einzelspiel); der andere gewinnt.
- **Spielerwechsel:** Wer **mindestens eine Kugel versenkt**, stößt nochmal. Versenkt er **keine** Kugel, ist der andere dran. Das gilt für jeden Stoß.
- **Weiße Kugel:** Wird die weiße im Stoß **auch versenkt** (oder vom Tisch geschossen), ist **immer Spielerwechsel**, auch wenn im selben Stoß eine farbige fällt. Die weiße wird erst neu aufgelegt, wenn alles ruht (wie heute).
- **Wer beginnt:** Nach der **Reihenfolge des Beitretens**: Meist ist schon ein Spieler da, wenn der zweite kommt; der, der zuerst da war, stößt zuerst.
- **Zuschauer kommen zu einem laufenden Spiel:** Sie legen eine **Tischwette** (Einsatz) an den Tisch. **Wer am meisten setzt, fordert den Sieger der letzten Runde** (der Sieger bleibt am Tisch, der Verlierer wird Zuschauer). Zuschauer ohne Wette bleiben Zuschauer.
- **Verbindung weg:** Ein Spieler, dessen Verbindung abbricht, bekommt **10 Sekunden** (er kann zurückkommen und dort weiterspielen, wo er war). Danach hat er **verloren**. Nachrücken darf nur ein Zuschauer, der eine **Tischwette** platziert hat (der Höchstbietende).
- **Zuschauer sind Gäste wie die Spieler:** Sie sehen die **Trink- und Rauchanimationen** der Spieler, und sie können selbst **trinken und rauchen**. Sie haben **dieselben zwei Zustandsbalken** (Thirsty ↔ Drunk, Nerves ↔ Desire), Geld und Getränke wie ein Spieler; nur stoßen dürfen sie nicht. Die Anzeige der anderen (Trinken, Rauchen) wird als kleine Zustandsdaten (Glas hoch, Zigarette im Mund, Rauch) an alle gemeldet und lokal gezeichnet, nicht als Bild.

## Vertrauen

Der Schütze rechnet selbst, also **könnte er schummeln** (andere Aufnahme hochladen). Für eine Kneipenrunde unter Freunden genügt Vertrauen; die Datenbank prüft nur grob (Kugeln im Tisch, Anzahl stimmt, Ergebnis passt zur Aufnahme). Echte Absicherung wäre eine **Rechnung auf dem Server** mit derselben Physik, also dieselbe Rapier-Logik ein zweites Mal (z. B. in Rust im Modul oder in einem eigenen Node-Dienst), mit den Aufnahmen als Ergebnis: **gleiches Protokoll**, nur die Rechnung zieht um. Das ist ein späterer Schritt.

## Was dafür im Spiel zuerst nötig wäre

1. Der Stoß als **reine Funktion**: (Ruhezustand, Stoßdaten, Zufallswerte) → Aufnahme, ohne Anzeige, mit denselben festen Schritten (dann ist sie auch alleine nutzbar: schneller Vorlauf, Wiederholung).
2. Alles, was zufällig oder zeitabhängig in der Physik steckt (Cue-Schwanken, `performance.now`), wird **Eingabe** der Funktion.
3. Ein **Abspieler** für Aufnahmen (Interpolation, Töne aus Ereignissen), den auch der Schütze benutzt.
4. Danach erst SpacetimeDB (Tabellen, `take_shot`, Zeitabgleich) und die Anzeige der anderen Spieler.

## Offene Fragen

- **Tischwette** (steht auch in `game-concept.md`, dort noch die ältere Fassung „die zwei Höchstbietenden spielen“; **diese Seite gilt**):
  - Was passiert mit dem Einsatz: bekommt der Sieger den Einsatz des Herausforderers (winner takes all), und was zahlt der Sieger der letzten Runde dagegen?
  - Was passiert mit den Geboten der anderen Zuschauer (zurück oder verfallen)?
  - Bis wann kann man bieten (bis das laufende Spiel zu Ende ist)?
  - Gleich hohe Gebote: wer zuerst bot? Niemand bietet: Der Sieger wartet, bis jemand bietet?
- Was ist, wenn der Gegner nach 10 Sekunden verloren hat und **kein** Zuschauer eine Wette hat: Spiel beendet, der Verbliebene gewinnt?
- Wie viel Abstand müssen Zuschauer zum Tisch halten (bisher 2 m, siehe `game-concept.md`)?

# Multiplayer (Konzept)

> **Status: Idee, nichts davon ist umgesetzt.** Nur ein Entwurf, wie zwei Spieler (und Zuschauer) mit SpacetimeDB dasselbe sehen, ohne dass etwas ruckelt. Oberstes Ziel: **Die Physik bleibt wie sie ist** (Rapier, feste 240 Hz, echte Spitze); das Netz darf sie nie verbiegen.

## Rahmen: Server nur mit HTML und PHP

Der eigene Webserver hat **nur HTML und PHP**: kein Node, keine Websockets, kein Dienst, der dauerhaft läuft. Folgen für den Multiplayer:

- Das Spiel bleibt ein **statischer `dist/`-Ordner** (HTML, JS, WASM, Bilder, Töne); er läuft ohne jede Server-Logik.
- **SpacetimeDB läuft extern, auf Maincloud** (dem Dienst der SpacetimeDB-Macher, entschieden; nicht auf diesem Server). Der **Browser verbindet sich direkt** mit ihr (Websocket); der eigene Server liefert nur die Seiten.
- **Keine Rechnung auf dem eigenen Server:** Das passt zur Entscheidung, dass der Schütze selbst rechnet (siehe „Vertrauen“). Eine Server-Rechnung gäbe es nur auf einem zusätzlichen, externen Dienst.
- PHP wäre höchstens für Kleinigkeiten da (etwa eine Konfiguration oder ein Gästebuch), nie für das Spiel selbst.

## Grundidee: den laufenden Stoß mitschneiden und abspielen

Billard ist **rundenbasiert**: Es stößt immer nur einer, dann rollen die Kugeln aus, dann ist der Nächste dran. Deshalb muss die Physik nicht live über das Netz laufen, und es rechnet immer nur **einer**.

1. **Der Schütze spielt wie heute**, in Echtzeit, mit dem unveränderten Physikcode (feste 240 Hz, echte Spitze, Squirt, Swerve). Ein kleiner **Rekorder** liest dabei mit (er ändert nichts) und schreibt etwa **120-mal pro Sekunde** Lage und Drehung jeder Kugel auf, dazu die **Ereignisse** (Klack, Bande, Loch, mit Zeit und Stärke).
2. Der Rekorder schickt das **in kleinen Häppchen** (z. B. alle 100 ms, quantisiert und als Differenzen gepackt) an SpacetimeDB, schon **während** die Kugeln rollen.
3. SpacetimeDB verteilt die Häppchen an die anderen. **Ihr Abspieler** zeigt sie mit einem **kleinen Puffer** (etwa 0,5 bis 1 s Verzögerung), Zwischenwerte interpoliert, mit der Bildrate des eigenen Bildschirms, Töne aus den Ereignissen.
4. Die **Cue-Animation** (Zurückziehen, Halt, Vorschnalzen) läuft bei allen aus denselben Stoßdaten, zeitlich mit demselben Puffer versetzt.

Folgen:

- **Die Verzögerung stört nicht:** Der andere wartet ohnehin, bis der Stoß vorbei ist. Er sieht den Stoß nur einen Moment später als der Schütze. Der Puffer fängt Netzschwankungen ab; er wird **mitgeregelt** (bei Verspätung etwas größer, nie wird die Zeit angehalten oder zurückgespult).
- **Nie unterschiedliche Ergebnisse:** Es gibt nur **eine** Rechnung pro Stoß, die des Schützen; alle anderen sehen ihre Aufnahme. Das Ergebnis (versenkt? Foul? schwarze 8?) steht in den Ereignissen.
- **Keine Gleichheit der Rechner nötig:** Verschiedene Browser rechnen `Math.sin` & Co. minimal anders, und Billard ist chaotisch (beim Anstoß verstärkt sich jeder Fehler). Ein Lockstep („alle rechnen mit denselben Eingaben“) würde irgendwann zu verschiedenen Ergebnissen führen. Mitschneiden und abspielen vermeidet das ganz.
- **Die Physik bleibt unangetastet:** keine Vorhersage, kein Zurückrollen, keine Vereinfachung für das Netz, **kein Umbau** des Stoßes. Der Schütze sieht seine eigene Rechnung live, nicht die Aufnahme.

**Verworfen: den Stoß als reine Funktion vorab rechnen** (komplett im Hintergrund, dann eine fertige Aufnahme hochladen). Sie würde den Stoß aus der Spielschleife herauslösen (Cue-Animation, Squirt, Swerve, Foul, Versenken, Töne, Kamera hängen alle daran) und dabei die empfindlichste Stelle der Physik berühren. Der Gewinn (die Aufnahme liegt vollständig vor dem Abspielen vor, Wiederholung, Physiktests ohne Browser) hängt nicht am Multiplayer. **Nur wenn** sich im Test zeigt, dass der Puffer nicht reicht (Ruckeln bei schlechter Leitung), wird sie nachgezogen.

## Ablauf eines Zuges

| Zeit | Schütze | Gegner / Zuschauer |
|------|---------|--------------------|
| vorher | Zielt; Winkel, Nubbel, Kraft gehen **etwa 15-mal pro Sekunde** an die Datenbank | sieht den Cue sich bewegen (aus den Werten interpoliert) |
| Stoß | drückt SHOOT: `take_shot` (Stoßdaten) wird angenommen, wenn er dran ist | bekommt die Stoßdaten, startet die Cue-Animation mit dem Puffer |
| Zurückziehen, Vorschnalzen, Kontakt | spielt wie heute, der Rekorder schickt Häppchen | Cue-Animation, dann die Kugeln aus den Häppchen (mit Puffer) |
| Rollen | der Rekorder schickt weiter | spielt die Aufnahme, Töne aus den Ereignissen |
| Ruhe | letzte Lage = neuer Ruhezustand; Regeln werten das Ergebnis; nächster Spieler | dasselbe, aus denselben Ereignissen |

## Was SpacetimeDB speichert

- **Spieler und Zug:** wer am Tisch sitzt, wer dran ist. Eine Aktion (`take_shot`) wird nur angenommen, wenn der Absender dran ist und kein Stoß läuft (die Datenbank ist die einzige Instanz, die die Reihenfolge entscheidet).
- **Ruhezustand:** Lage der Kugeln, versenkte Kugeln, Spielzustand (läuft, gewonnen, verloren und Grund).
- **Stoß:** Stoßdaten + die **Häppchen** der Aufnahme (Zeilen, die schnell wachsen und nach dem Zug nicht mehr gebraucht werden; nur der Ruhezustand bleibt) + Startzeit.
- **Kleinkram im Fluss** (Cue-Zielen) als flüchtige Werte, ohne Verlauf.
- Wer später dazukommt (Zuschauer, Wiederverbinden), liest den Ruhezustand und, falls gerade ein Stoß läuft, die Häppchen bis jetzt und spielt ab dort weiter.

## Ein Raum, ein Tisch: wie ein Spiel zustande kommt

Es gibt **einen** Raum für alle Besucher und **einen** Tisch. **Jeder kommt zuerst als Zuschauer** (geht herum, sieht die Gesichter der anderen, kann trinken, rauchen, Klavier spielen, Radio hören); niemand wird automatisch an den Tisch gesetzt (so ist es im Modul umgesetzt: `set_profile` setzt keinen Platz).

> **Vorschlag, noch zu bestätigen:** Die Tischwette ist **die Herausforderung**: Wer spielen will, fragt den Sitzenden und legt dabei seinen Einsatz.

**Der Tisch hat drei Zustände:** leer, **einer sitzt allein** (er übt), **Spiel läuft** (zwei sitzen).

1. **Erster Besucher:** Er ist allein im Raum, Zuschauer, der Tisch ist leer. Er kann sich **an den Tisch setzen** („Platz nehmen“) und **allein üben**: Seine Stöße sehen alle, die später kommen. Er ist der **Platzhalter**.
2. **Zweiter Besucher:** Er kommt als Zuschauer, sieht das Gesicht des ersten und am Tisch, dass einer sitzt. Will er spielen, drückt er **Herausfordern** und wählt den **Einsatz** (+10 / +100, mindestens 10; das ist seine Tischwette). Der Platzhalter bekommt eine **Anfrage**: „Anna fordert dich heraus, Einsatz 50 $: Annehmen / Ablehnen“.
   - **Annehmen:** Das Spiel beginnt (der Platzhalter stößt zuerst). Der Einsatz des Herausforderers liegt im Spiel.
   - **Ablehnen** oder **keine Antwort in 15 s:** kein Spiel, das Gebot geht zurück; der Herausforderer bleibt Zuschauer (und kann es erneut versuchen).
3. **Läuft schon ein Spiel:** Zuschauer **bieten** (ihre Gebote bleiben stehen). Nach dem Spiel bleibt der Sieger sitzen, und der **Höchstbietende** wird sein Herausforderer (Anfrage wie in 2; lehnt der Sieger ab oder steht auf, ist der Tisch frei).
4. **Ist der Tisch leer**, und zwei Zuschauer wollen spielen: wer sich zuerst setzt, ist der Platzhalter, der andere fordert ihn heraus (wie in 2).

**Satz am Tisch (Getränk, Zigaretten, Feuerzeug, Aschenbecher):** Ein Satz gehört zu einem Platz und steht nur da, **solange der Platz besetzt ist** (heute stehen im Multiplayer immer beide Sätze: das wird so geändert). Offen: Wo sind Getränk und Zigaretten eines **Zuschauers**? (siehe Offene Fragen)

Dafür fehlen im Modul noch Aktionen wie `sit_down` (Platz nehmen) und `stand_up` (aufstehen) und die Anzeige im Spiel (Knöpfe, Liste, Hinweis).

## Gesicht als Kugel im Raum (als Vorschau umgesetzt)

`src/face-ball.js` baut das Gesicht aus denselben Daten wie die Vorschau auf dem Welcome-Screen (`face.js`) als Kugel (Kopf, Nase, Augen, Augenbrauen, Frisur, Bart; schmal bis breit) und darüber das Schild mit Flaggen-Icon und Name mit Initiale. Heute **schwebt ein Gesicht neben dem Ende der Bar** (Kopfmitte auf 1,70 m, `FACE_BALL_*` in `face-ball-constants.js`, schaut in den Raum), zeigt nach dem Welcome-Screen das **eigene** Gesicht mit Name und Land, und ein **Klick** darauf (wie beim Radioknopf, in der freien Kamera mit dem Fadenkreuz) würfelt ein **neues Zufallsgesicht** (nur zur Ansicht, das Profil bleibt). Im Mehrspieler entsteht daraus pro Spieler ein solches Gesicht an der Stelle der freien Kamera.

## Umgesetzt: Anmeldung und die Gesichter der anderen

`src/multiplayer.js` (Werte in `multiplayer-constants.js`, Typen in `src/module_bindings/`, erzeugt mit `spacetime generate`, nicht von Hand ändern):

- **Anmelden (nur im Multiplayer):** Der Welcome-Screen fragt **Singleplayer oder Multiplayer**; nur der Multiplayer-Knopf verbindet sich (mit Spinner, bis der Raum eingerichtet ist), der Einzelspieler benutzt SpacetimeDB gar nicht. Die Verbindung geht mit der Datenbank `backroom-billard-3000` und ruft `set_profile` (Name mit Initiale, Land, Gesicht als JSON, Geld). Das Login dieses Browsers (Token) liegt im `localStorage`, damit man beim nächsten Besuch derselbe Gast bleibt; ein privates Fenster oder ein anderer Browser ist ein neuer Gast.
- **Lebenszeichen und Ort:** `heartbeat` alle 2 s. In der **freien Kamera** schickt jeder alle 0,1 s Ort und Blick der Kamera (`set_presence`); wechselt er zurück zur Spielerkamera, einmal „weg“.
- **Gesichter der anderen:** Jeder andere Gast erscheint als Gesicht (`face-ball.js`, mit Flagge und Name) **dort, wo seine freie Kamera ist**, mit seiner Blickrichtung, weich nachgeführt. Ist er in der Spielerkamera oder weg, ist sein Gesicht nicht zu sehen. Das eigene Gesicht schwebt weiter neben der Bar (nur zur Ansicht).
- **Ohne Verbindung:** Im Multiplayer erscheint auf dem Welcome-Screen eine Meldung, und man kann es noch einmal versuchen oder allein spielen; ein Einzelspieler merkt nichts davon. Während des Spiels sind die Aufrufe abgesichert (ein Fehler beim Senden stört das Spiel nicht).
- **Noch nicht verbunden:** die Tischwette, der Spielzustand, die Plätze, Zielen und der Stoß (Rekorder, Abspieler).
- **Ausprobieren:** Das Spiel in zwei Fenstern öffnen (eines privat), jeweils den Welcome-Screen mit **Multiplayer** durchlaufen, mit `C` in die freie Kamera und aufeinander zufliegen: Man sieht das Gesicht des anderen.

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
- **Wer beginnt:** Wer **zuerst am Tisch sitzt** (der Platzhalter, siehe „Ein Raum, ein Tisch“), stößt zuerst.
- **Zuschauer kommen zu einem laufenden Spiel:** Sie legen eine **Tischwette** (Einsatz) an den Tisch. **Wer am meisten setzt, fordert den Sieger der letzten Runde** (der Sieger bleibt am Tisch, der Verlierer wird Zuschauer). Zuschauer ohne Wette bleiben Zuschauer.
- **Verbindung weg:** Ein Spieler, dessen Verbindung abbricht, bekommt **10 Sekunden** (er kann zurückkommen und dort weiterspielen, wo er war). Danach hat er **verloren**. Nachrücken darf nur ein Zuschauer, der eine **Tischwette** platziert hat (der Höchstbietende).
- **Gesicht:** Jeder (Spieler und Zuschauer) erscheint für die anderen als **Gesicht** (Kugel mit Nase und zwei Augen, Haut- und Haarfarbe aus dem Facegenerator, siehe [`welcome-screen.md`](welcome-screen.md)). Es **schwebt dort, wo die freie Kamera** des anderen ist. Die **Blickrichtung ist die der Kamera**, sonst bewegt sich nichts: ein **starres Gesicht**, keine Mimik (spätere Stufe).
- **Über dem Kopf:** ein **kleines Flaggen-Icon** (die runde Flagge des Landes) und der **Name** des Spielers **mit Initiale** („Anna T. Meier“, `displayName` mit Initiale in `name-rules.js`), **kompakt und nicht zu groß** (ein kleines Schild in einer Zeile: Flagge, Name). Später kommt der **Chat** dazu.
- **Abstand zum Tisch:** Zuschauer halten **mindestens 2 m** Abstand zur Tischkante (Spieler dürfen nah heran).
- **Zuschauer sind Gäste wie die Spieler:** Sie sehen die **Trink- und Rauchanimationen** der Spieler, und sie können selbst **trinken und rauchen**. Sie haben **dieselben zwei Zustandsbalken** (Thirsty ↔ Drunk, Nerves ↔ Desire), Geld und Getränke wie ein Spieler; nur stoßen dürfen sie nicht. Die Anzeige der anderen (Trinken, Rauchen) wird als kleine Zustandsdaten (Glas hoch, Zigarette im Mund, Rauch) an alle gemeldet und lokal gezeichnet, nicht als Bild.

- **Tischwette (Einsatz):**
  - Der **Sieger bekommt nur den Einsatz des Herausforderers**; der Sieger der letzten Runde setzt nichts dagegen.
  - Man kann **jederzeit** bieten, auch während ein Spiel läuft, und so viel, wie man Geld hat. Der Einsatz wächst über die Knöpfe **+10** und **+100** (Schritte von 10 und 100), **Mindesteinsatz 10**.
  - **Gleich hohe Gebote:** Wer zuerst geboten hat, gewinnt (first come).
  - **Ohne Gebot kein Spiel:** Ohne Tischwette setzt sich niemand an den Tisch; der Sieger wartet, bis jemand bietet.
  - **Die Bank legt nichts drauf:** Gewinnt der Herausforderer, bekommt er nur **seinen eigenen Einsatz zurück** (kein Gewinn, kein Verlust); gewinnt der Sieger der letzten Runde, bekommt er den Einsatz des Herausforderers.
  - **Der Sieger der letzten Runde bleibt immer am Tisch.** Er kann aber freiwillig aufhören oder sich ausloggen (siehe Offene Fragen).
  - **Gebote der anderen Zuschauer** (die nicht Herausforderer wurden) **bleiben für die nächste Runde stehen**.
  - **Zurückziehen:** Ein Gebot kann jederzeit **zurückgezogen** werden (das Geld ist sofort wieder frei), solange der Bieter nicht der Herausforderer des laufenden Spiels ist. **Hört der Herausforderer mitten im Spiel auf** (aussteigen, ausloggen, Verbindung länger als 10 Sekunden weg), hat er verloren und **sein Einsatz gehört dem anderen**.
  - **Der Sieger will aufhören oder loggt sich aus:** Dann ist ein Platz frei. Der **Höchstbietende** setzt sich **ohne Einsatz** auf den Platz, der **zweithöchste** fordert ihn mit seinem Gebot, die übrigen Gebote bleiben stehen. Gibt es nur ein Gebot oder keines, wartet der Tisch (ohne Gebot kein Spiel).
  - **Ein Spieler fehlt nach 10 Sekunden und kein Zuschauer hat eine Wette:** Das Spiel ist beendet, der Verbliebene gewinnt.

## Vertrauen

Der Schütze rechnet selbst, also **könnte er schummeln** (falsche Häppchen schicken). Für eine Kneipenrunde unter Freunden genügt Vertrauen; die Datenbank prüft nur grob (Kugeln im Tisch, Anzahl stimmt, Ergebnis passt zur Aufnahme). Echte Absicherung wäre eine **Rechnung auf dem Server** mit derselben Physik, also dieselbe Rapier-Logik ein zweites Mal (z. B. in Rust im Modul oder in einem eigenen Node-Dienst), mit den Häppchen als Ergebnis: **gleiches Protokoll**, nur die Rechnung zieht um (das bräuchte dann doch den Stoß als reine Funktion). Das ist ein späterer Schritt.

## Was dafür im Spiel zuerst nötig wäre

1. Ein **Rekorder** in der Spielschleife (nur lesend): Lage und Drehung der Kugeln etwa 120-mal pro Sekunde, dazu die Ereignisse, in Häppchen.
2. Ein **Abspieler** (Puffer, Interpolation, Töne aus den Ereignissen), den man auch ohne Netz mit einer Aufnahme füttern kann (so lässt er sich allein testen).
3. Zufälliges und zeitabhängiges (Cue-Schwanken, `performance.now`) wird ohnehin **in den Stoßdaten** festgehalten, damit die Cue-Animation bei allen gleich läuft.
4. Danach erst SpacetimeDB (Tabellen, `take_shot`, Zeitabgleich, Häppchen) und die Anzeige der anderen Spieler.

## Vorbereitet: das Datenbank-Modul

Das SpacetimeDB-Modul liegt in [`spacetime/`](../spacetime/README.md) (TypeScript, `spacetimedb` 2.14; prüft mit `npm run check`): die Tabellen (Spieler, Spiel, Kugeln, Stoß, Häppchen, Zielen, Gebote) und die Aktionen mit den hier festgelegten Regeln (Foul, schwarze 8, Spielerwechsel, Tischwette, 10-s-Frist). Die Datenbank auf Maincloud heißt **`backroom-billard-3000`** (Konto `liquid3logic`). Das Modul ist **auf Maincloud veröffentlicht** (Dashboard: <https://spacetimedb.com/backroom-billard-3000>; wer es ändert, veröffentlicht es mit den Schritten in `spacetime/README.md` neu), das Spiel benutzt es **noch nicht**.

## Offene Fragen

- **Zuschauer und ihre Sachen:** Die ersten Getränke und Zigaretten werden auf dem Welcome-Screen gekauft. Steht der Satz nur am Platz, hat ein Zuschauer nichts zum Trinken und Rauchen. Vorschlag: Jeder Gast hat **seinen eigenen Satz in der Hand** (das Glas erscheint beim Trinken in der Hand und löst sich danach auf, die Zigarette ebenso), am Tisch stehen die Sachen der Sitzenden. Oder: Zuschauer bekommen einen kleinen **Beistelltisch** (an der Bar?).
- **Die Anfrage:** Muss der Platzhalter immer annehmen können (Vorschlag: ja), oder nimmt der Höchstbietende automatisch den Platz (wie bisher beschlossen)?

Keine zum Regelwerk. Für den Bau stehen noch die Schritte unter „Was dafür im Spiel zuerst nötig wäre“ an (Rekorder, Abspieler, dann SpacetimeDB).


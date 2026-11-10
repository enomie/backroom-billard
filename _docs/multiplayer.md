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

**Der Ablauf (entschieden, bis auf die offenen Fragen unten):**

1. **Der erste Besucher** im Multiplayer ist allein. Auf dem Bildschirm steht **„Waiting for another player“** (de: „Warte auf einen weiteren Spieler“). Wer allein spielen will, wählt auf dem Welcome-Screen **Singleplayer**; im Multiplayer wartet man auf jemanden.
2. **Kommt ein Besucher dazu,** sieht der erste die Meldung **„Anna joined“** (de: „Anna ist beigetreten“), und beim Gehen „… left“. Die Meldung erscheint bei jedem Beitritt, auch wenn schon andere da sind.
3. **Sind genau zwei online,** spielen die beiden: **kein Ablehnen, keine Anfrage**, das Spiel beginnt von selbst; wer zuerst da war, stößt zuerst. Eine Tischwette gibt es dabei nicht.
4. **Der dritte und jeder weitere Besucher** ist **Zuschauer**: Er kann **bieten** (Tischwette, −100 −10 +10 +100, mindestens 100). Nach einem Spiel bleibt der Sieger am Tisch, und der **Höchstbietende** wird sein Herausforderer (automatisch, ohne Anfrage); der Sieger kann jederzeit aufhören (siehe „Entschieden“).
5. **Sachen der Zuschauer:** Ein Zuschauer hat **keine Sachen am Tisch**. Sein Glas, seine Zigarette und sein Feuerzeug **sieht man nur, solange er trinkt, raucht oder anzündet** (sie erscheinen in der Hand und lösen sich danach auf).
6. **Satz am Tisch** (Getränk, Zigaretten, Feuerzeug, Aschenbecher): gehört zu einem Platz und steht nur da, **solange der Platz besetzt ist**.

**Umgesetzt** (`room-notices.js`, `multiplayer.js`, `applySeats` in `billard.js`): die Meldungen („Waiting for another player“ solange man allein ist, „… joined“ / „… left“ und „Das Spiel beginnt: … stößt zuerst“ als kurze Meldungen für 5 s, mehrere untereinander; Texte `room.*`, Deutsch und Englisch) und der **Satz am Tisch**: Es sitzen die ersten **zwei anwesenden Gäste** (in der Reihenfolge des Beitretens, **die Datenbank vergibt die Plätze**: Platz 1 auf der +z-Seite, Platz 2 auf der −z-Seite; nur solange kein Spiel läuft). Ein Satz steht nur an einem besetzten Platz, die Tasten R und T benutzen immer den eigenen Satz. Im Singleplayer steht der eine Satz auf der +z-Seite. Der Satz des zweiten Gastes zeigt noch ein **zufälliges** Getränk und eine zufällige Packung (seine Wahl wird noch nicht übertragen). Ein Zuschauer (ab dem dritten Gast) nutzt vorerst die Sätze des Tisches, bis seine Sachen „nur in der Hand“ gebaut sind.

**Das Spiel startet von selbst,** sobald zwei Gäste sitzen (`seatTheFirstTwo` im Modul): Der Zustand in `game` wird „läuft“, der erste stößt zuerst, bei **beiden** erscheint „Das Spiel beginnt: Anna stößt zuerst“ und es wird **neu aufgebaut**. **Wer dran ist (umgesetzt):**
- **Wer dran ist, schaut durch seinen Cue** (die Kamera wechselt von selbst in die Spielerkamera) und darf stoßen. **Der andere ist in der freien Kamera** und schaut zu: Er kann nicht stoßen, nicht in die Spielerkamera wechseln und auch den Tisch nicht neu aufbauen (`N`, Re-rack). Zuschauer (ab dem dritten Gast) sind immer in der freien Kamera.
- Beginnt ein Stoß, sagt das Spiel es der Datenbank (`take_shot`). Liegen die Kugeln still (die weiße ist wieder aufgelegt), meldet der Schütze das Ergebnis (`end_shot`): welche Kugeln versenkt wurden, ob ein Foul war, ob die weiße weg war, und wo alle Kugeln liegen. **Die Datenbank wendet die Regeln an** (Foul, schwarze 8, wer dran ist) und sagt, wer als Nächstes stößt; bei allen folgt die Kamera, und in der Anzeige oben bekommt der, der dran ist, einen **abgerundeten Rahmen** (keine Meldung).
- **Die anderen sehen das Zielen und den Stoß (umgesetzt, `src/shot-replay.js`):**
  - **Der Kopf:** Der Kopf (das Gesicht) eines Gastes hängt **dort, wo seine Kamera ist**: in der freien Kamera dort, in der Spielerkamera **hinter dem Cue** (der Kopf des Schützen beim Zielen).
  - **Wo die freie Kamera im Multiplayer anfängt:** Nicht mehr dort, wo sie zuletzt war (dann säßen beide Spieler am selben Platz und sähen durch den Kopf des anderen), sondern **von der Spielerkamera aus nach hinten** (1,4 m entlang der Blickrichtung), **etwas höher** (0,5 m, innerhalb 1,5 bis 2,3 m) und **zur Seite des Platzes** (0,8 m, die zwei Plätze auf entgegengesetzte Seiten), mit Blick schräg nach unten auf den Tisch (`FREE_CAM_BACK`, `_SIDE`, `_UP`, `_PITCH`). Im Einzelspieler bleibt es dabei, dass die freie Kamera dort anfängt, wo sie zuletzt war.
  - **Zwei Köpfe nie am selben Ort:** Die freie Kamera hält mindestens 55 cm Abstand zu jedem anderen Kopf (`FREE_CAM_HEAD_DISTANCE`) und wird sonst hinausgeschoben. So sieht man nie durch den Kopf eines anderen.
  - **Nach dem Stoß geht der Schütze von selbst in die freie Kamera:** Sobald der Nachschwung des Cues vorbei ist, fliegt seine Kamera in die freie Ansicht (er schaut den Kugeln zu). Für die anderen wandert sein **Kopf** dorthin und sein **Cue** wird **am Kopf getragen** (die Haltepose), er bleibt **nicht am Ball** und folgt der weißen Kugel nicht. Der Cue verlässt den Ball dort, wo er gestoßen hat. Bleibt er nach dem Stoß dran (Kugel versenkt), geht seine Kamera zurück in die Spielerkamera.
  - **Zielen:** Wer dran ist, schickt etwa 15-mal pro Sekunde seinen Cue-Winkel, die Neigung und wo die Spitze die Kugel trifft (`set_aim`). Die anderen sehen **seinen Cue am Ball** (weich nachgeführt), nicht ihren eigenen getragenen Cue; die **gestrichelte Zielhilfe** sieht nur der Schütze selbst.
  - **Stoß:** Ab dem Stoß schreibt das Spiel des Schützen in jedem Bild auf, wo die Kugeln sind (Lage und Drehung) und wie der Cue sich bewegt (Zurückziehen, Halt, Vorschnalzen, Nachschwung), und schickt das alle 100 ms als Stück an die Datenbank (`push_chunk`, 468 Byte je Bild, bei 60 Bildern pro Sekunde knapp 30 KB/s). Die anderen sammeln die Stücke und spielen sie **0,7 s später** ab (Puffer, `REPLAY_DELAY_MS`), weich zwischen den Bildern; Kugeln, die ins Loch fallen, verschwinden im Ablauf.
  - **Am Ende** (die Kugeln liegen still, der Schütze hat `end_shot` gemeldet) wird erst der **Ablauf zu Ende gespielt**, dann springen die Kugeln auf die endgültigen Plätze, und erst dann kommen der Rahmen um den, der dran ist, der Kamerawechsel und ein mögliches Spielende. So sieht der Wartende alles, bevor er dran ist.
  - **Ton (umgesetzt):** Die Töne des Stoßes werden im selben Strom mitgeschickt und beim Abspielen zur richtigen Zeit gespielt, an den Stellen, wo sie entstanden: Zurückziehen und Vorschnalzen des Cues, das „Tock“ der Spitze, Klacken der Kugeln, Banden, Rand und Boden der Löcher. Das Rollgeräusch wird beim Abspielen aus der Bewegung der Kugeln berechnet (nicht mitgeschickt). Ein Ton ist ein kleiner Eintrag (8 Zahlen: Zeit, Art, Stärke, Ort, Kugel).
- **Spielende:** Entscheidet die Datenbank (Foul, schwarze 8, 10 Sekunden ohne Antwort, aufgestanden), erscheint bei allen „SPIEL VORBEI“ beziehungsweise GAME LOST / YOU WIN mit dem Grund und den Namen. Fehlt ein Spieler im laufenden Spiel länger als 10 Sekunden, hat er verloren (`check_timeouts`, das Spiel ruft es alle 2 s).
- **Nochmal (umgesetzt):** Nach dem Spielende steht auf dem Bildschirm der Knopf **Nochmal** (de) / **Play again** (en), nur für die zwei Spieler. Er schließt die Spielende-Meldung, dahinter steht das **Einsatz-Fenster** (siehe unten); die nächste Runde beginnt, wenn beide dort **Bereit** drücken (neu aufgebaut, **der Verlierer stößt zuerst**). Nach einem Foul oder der schwarzen 8 bleiben **beide sitzen**, wenn kein Zuschauer geboten hat. Hat der Verlierer den Tisch verlassen oder war zehn Sekunden stumm, gibt es den Knopf nicht (er verliert seinen Platz; kommt jemand Neues, öffnet sich mit ihm das Einsatz-Fenster von selbst). Ein Zuschauer oder ein Spieler, dessen Partner weg ist (oder der allein im Raum ist), bekommt statt „Nochmal“ den Re-rack-Knopf und kann allein üben, bis jemand kommt (das Rack wird beim Spielende **sofort neu aufgebaut**; die Meldung steht darüber).
- **Noch nicht gebaut:** die Tischwette (ab drei Online).

Dafür fehlen im Modul noch Aktionen wie `sit_down` (Platz nehmen) und `stand_up` (aufstehen) und die Anzeige im Spiel (Knöpfe, Liste, Hinweis).

Meldungen gibt es nur über das, was **nach** dem eigenen Beitritt geschieht: Wer schon vor dir da war, löst keine „joined“-Meldung aus, und das Ende eines Spiels, das du nie gesehen hast (Reste, die beim Aufräumen enden), wird einem Zuschauer nicht gemeldet (nur den zwei Spielern und Zuschauern, die einen Stoß gesehen haben).

## Gesicht als Kugel im Raum (als Vorschau umgesetzt)

`src/face-ball.js` baut das Gesicht aus denselben Daten wie die Vorschau auf dem Welcome-Screen (`face.js`) als Kugel (Kopf, Nase, Augen, Augenbrauen, Frisur, Bart; schmal bis breit) und darüber das Schild mit Flaggen-Icon und Name mit Initiale. Der Kopf hat einen Radius von 12,8 cm (`FACE_BALL_RADIUS`). Das **Schild** über dem Kopf (Flagge und Name) hat **immer dieselbe Größe auf dem Bildschirm**, egal wie nah oder weit der Kopf ist (`FACE_SIGN_SCREEN_HEIGHT`, 3,5 % der Bildhöhe). Heute **schwebt ein Gesicht neben dem Ende der Bar** (Kopfmitte auf 1,70 m, `FACE_BALL_*` in `face-ball-constants.js`, schaut in den Raum), zeigt nach dem Welcome-Screen das **eigene** Gesicht mit Name und Land, und ein **Klick** darauf (wie beim Radioknopf, mit der Mausposition) würfelt ein **neues Zufallsgesicht** (nur zur Ansicht, das Profil bleibt). Im Mehrspieler entsteht daraus pro Spieler ein solches Gesicht an der Stelle der freien Kamera.

## Umgesetzt: Anmeldung und die Gesichter der anderen

`src/multiplayer.js` (Werte in `multiplayer-constants.js`, Typen in `src/module_bindings/`, erzeugt mit `spacetime generate`, nicht von Hand ändern):

- **Anmelden (nur im Multiplayer):** Der Welcome-Screen fragt **Singleplayer oder Multiplayer**; nur der Multiplayer-Knopf verbindet sich (mit Spinner, bis der Raum eingerichtet ist), der Einzelspieler benutzt SpacetimeDB gar nicht. Die Verbindung geht mit der Datenbank `backroom-billard-3000` und ruft `set_profile` (Name mit Initiale, Land, Gesicht als JSON, Geld). Das Login dieses Browsers (Token) liegt im `localStorage`, damit man beim nächsten Besuch derselbe Gast bleibt; ein privates Fenster oder ein anderer Browser ist ein neuer Gast.
- **Lebenszeichen und Ort:** `heartbeat` alle 2 s. In der **freien Kamera** schickt jeder alle 0,1 s Ort und Blick der Kamera (`set_presence`); wechselt er zurück zur Spielerkamera, einmal „weg“.
- **Gesichter der anderen:** Jeder andere Gast erscheint als Gesicht (`face-ball.js`, mit Flagge und Name) **dort, wo seine freie Kamera ist**, mit seiner Blickrichtung, weich nachgeführt. Ist er in der Spielerkamera oder weg, ist sein Gesicht nicht zu sehen. Das eigene Gesicht schwebt weiter neben der Bar (nur zur Ansicht).
- **Ohne Verbindung:** Im Multiplayer erscheint auf dem Welcome-Screen eine Meldung, und man kann es noch einmal versuchen oder allein spielen; ein Einzelspieler merkt nichts davon. Während des Spiels sind die Aufrufe abgesichert (ein Fehler beim Senden stört das Spiel nicht).
- **Noch nicht verbunden:** die Tischwette, der Spielzustand, die Plätze, Zielen und der Stoß (Rekorder, Abspieler).
- **Ausprobieren:** Das Spiel in zwei Fenstern öffnen (eines privat), jeweils den Welcome-Screen mit **Multiplayer** durchlaufen, mit `C` in die freie Kamera und aufeinander zufliegen: Man sieht das Gesicht des anderen.

## Trinken und Rauchen der anderen (umgesetzt)

Hält ein Gast **R** (trinken) oder **T** (rauchen) gedrückt oder lässt los, sagt sein Spiel das der Datenbank (`set_hand`, nur bei einer Änderung). Bei den anderen läuft dann **dieselbe Animation** wie bei ihm (`drinking.js`, `smoking.js`), gesteuert von seinen Tasten und von der Lage seines Kopfes: das **Glas seines Platzes** fliegt zu seinem Mund, kippt, der Stand sinkt, er schluckt; die **Zigarette** kommt aus der Packung oder dem Aschenbecher, das Feuerzeug brennt, er zieht, die Glut glüht, der Rauch steigt, er atmet aus. Es ist bewusst keine Übertragung von Bildern: Beide Seiten rechnen aus denselben Eingaben (R und T gedrückt, Kopf). Ohne Geld und ohne Körper-Balken beim Zuschauer (die gehören dem, der trinkt).

- **Nur Spieler an den zwei Plätzen** (die Sätze am Tisch): Ein Zuschauer hat keinen Satz, seine Sachen „in der Hand“ sind noch nicht gebaut.
- Die Geräusche (Schluck, Feuerzeug, Ausatmen) kommen **nicht aus dem Raum**, sie klingen beim Zuschauer wie beim Trinkenden selbst (noch ohne Ort).
- **Was am Platz steht (umgesetzt):** Jeder Gast schickt, was an seinem Platz steht (`set_kit`, nur bei einer Änderung, höchstens viermal pro Sekunde): das **Getränk** (Sorte) und **wie viele Schlucke noch drin sind**, die **Marke** der Zigaretten und **wie viele noch in der Packung** sind. Die anderen zeigen es so: Ihr Glas am Platz des Gastes wird zu **seiner Sorte** (ein neues Getränk, das er an der Karte bestellt, tauscht das Glas aus), der **Stand** folgt seinen Schlucken, die Packung hat seine Marke und seine Zahl. Trinkt oder raucht er gerade, wird die Änderung erst am Ende der Animation übernommen (sie zeigt sie selbst). Wer sich setzt, bekommt **sein** Getränk und **seine** Packung von der Wahl auf dem Welcome-Screen auf seinen Platz (auch als Zweiter, auf der −z-Seite), voll.

## Name und Geld oben in der Mitte (umgesetzt, Einzelspieler und Mehrspieler)

Oben in der Mitte (unter dem kleinen Titel und den zwei Balken) steht immer ein Feld, in dem **Name und Geld untereinander** stehen (mit der Flagge vor dem Namen):

- **Einzelspieler:** nur ich: Flagge und Name, darunter das Geld, darunter die versenkten Kugeln (die gemeinsame Liste).
- **Mehrspieler, allein:** links wie gehabt ich (Flagge, Name, Geld), dann **VS**, rechts „Warte auf einen weiteren Spieler“ (kursiv, ohne Geld).
- **Mehrspieler, zwei am Tisch:** links der Gast auf Platz 1, rechts auf Platz 2, jeweils Flagge und Name, darunter sein **Geld**, darunter **seine** versenkten Kugeln; wer **dran** ist, hat einen gelben, abgerundeten Rahmen. Zwischen den beiden läuft eine **Trennlinie**, die das **VS** überdeckt. Die Kugeln des linken wachsen **von der Linie nach links**, die des rechten **von der Linie nach rechts**.

Das Geld des anderen kommt von der Datenbank (`set_money`; mein Spiel schickt mein Geld bei jeder Änderung), die Kugeln auch (`pocket`: welche Kugel, welcher Platz; der Schütze meldet seine versenkten Kugeln mit `end_shot`). Das gilt auch für den, der später dazukommt, und die Kugeln werden mit jedem neuen Aufbau geleert. „Warte auf einen weiteren Spieler“ steht nur noch in diesem Feld (keine eigene Meldung mehr).

**Links oben** steht nur noch der **Status** („Ready to shoot“, „Balls rolling …“): der Punkt, darunter jedes Wort in einer eigenen Zeile („Balls“ / „rolling …“).

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

- **Einsatz-Fenster (für die zwei am Tisch):**
  - **Umgesetzt** (`src/stake-window.js`, Modul `set_stake` / `set_ready`). Es öffnet sich, sobald der zweite Gast sitzt, und ebenso vor jeder neuen Runde („Nochmal“). Der gültige Einsatz steht im Spiel **über dem „VS“** im Kopf der Anzeige. Es ist **live**: beide sehen den Betrag des anderen und ob er **Ready** gedrückt hat.
  - Jeder stellt **seinen eigenen Betrag** mit **−100 −10 +10 +100** ein: **mindestens 100, höchstens sein Geld**. Hat jemand weniger als 100, darf er **alles, was er hat**, einsetzen.
  - **Der gültige Einsatz ist der kleinere der beiden Beträge.** Wer erhöht, wartet, ob der andere mitzieht.
  - **Ready** wird bei beiden zurückgesetzt, sobald sich der gültige Einsatz ändert. **Los geht es, wenn beide Ready gedrückt haben**; dann wird der Einsatz bei beiden abgezogen (Treuhand), und der **Sieger bekommt beide Beträge**.
- **Tischwette (Zuschauer, ab dem dritten Gast):**
  - **Umgesetzt** (`place_bid` / `withdraw_bid`, Knopf unter der Anzeige). Zuschauer haben einen Knopf **Tischwette** mit demselben +/−-Fenster (Mindestgebot 100, höchstens ihr Geld, bei weniger als 100 alles). Man kann **jederzeit** bieten, auch während ein Spiel läuft.
  - **Wer am meisten bietet, fordert den Sieger der letzten Runde**; bei gleich hohen Geboten gewinnt, wer zuerst geboten hat. Dann öffnet sich das Einsatz-Fenster für beide mit dem Gebot als Vorschlag; es gilt die Regel oben (kleinerer Betrag, beide Ready).
  - **Der Sieger der letzten Runde bleibt immer am Tisch,** der Verlierer wird Zuschauer, **sobald ein Gebot vorliegt** (ohne Gebot bleiben beide sitzen). Er kann aber freiwillig aufhören oder sich ausloggen.
  - **Gebote der anderen Zuschauer** bleiben für die nächste Runde stehen. Ein Gebot kann jederzeit **zurückgezogen** werden (das Geld ist sofort frei), solange der Bieter nicht Herausforderer des laufenden Spiels ist.
  - **Hört der Herausforderer mitten im Spiel auf** (aussteigen, ausloggen, Verbindung länger als 10 Sekunden weg), hat er verloren und **sein Einsatz gehört dem anderen**.
  - **Der Sieger will aufhören oder loggt sich aus:** Der **Höchstbietende** setzt sich auf den Platz, der **zweithöchste** fordert ihn; die übrigen Gebote bleiben stehen. Gibt es nur ein Gebot oder keines, wartet der Tisch.
  - **Ein Spieler fehlt nach 10 Sekunden und kein Zuschauer hat eine Wette:** Das Spiel ist beendet, der Verbliebene gewinnt.

## Klavier im Mehrspieler (umgesetzt)

Am Flügel sitzt **immer nur einer**; was er spielt, hören und sehen alle.

- **Hocker belegen:** Die Tabelle `piano` (eine Zeile) hält, **wer** am Flügel sitzt. `F` oder der Knopf fragt die Datenbank (`sit_piano`); ist der Hocker belegt, wird abgelehnt, und der Knopf zeigt „Klavier besetzt (Anna)“ und tut nichts. Aufstehen (`Esc`, Knopf) gibt ihn frei (`leave_piano`). Verlässt der Gast den Raum oder ist 10 Sekunden stumm, wird der Hocker von selbst frei (wie beim Tisch).
- **Töne senden:** Gesendet wird **nicht jede Note als eigene Zeile**, sondern der **Zustand der Tasten**: eine Zeile mit den 88 gedrückten Tasten als kleine Bitmaske (11 Byte), nur bei einer Änderung (`set_keys`). Die anderen vergleichen mit dem letzten Stand: neu gedrückt = Ton an, losgelassen = Ton ab. Das braucht **keinen Verlauf**, ein neu Hinzukommender bekommt gleich den Stand, und Akkorde gehen mit.
- **Hören:** Der Spieler hört seine Töne sofort selbst (ohne Umweg). Bei den anderen klingen die Töne **aus dem Flügel** (Ort des Flügels, Lautstärke und Panorama nach Abstand und Richtung wie beim Radio), mit etwa 50 bis 100 ms Verzögerung. Gespielt wird mit demselben Klang (`piano-sound.js`).
- **Sehen:** Bei allen senken sich die **Tasten**, die der Spieler drückt; sein **Kopf** (das Gesicht) schwebt am Hocker, weil dort seine Kamera ist.
- **Wer dran ist, setzt sich nicht:** Wer am Tisch **gerade dran ist**, kann sich nicht an den Flügel setzen (`F` und Knopf tun nichts). Der andere Spieler (nicht dran) und alle Zuschauer dürfen **klimpern**, solange der Hocker frei ist. **Kommt ein Spieler dran, während er am Flügel sitzt, steht er sofort auf** und seine Kamera geht in die Spielerkamera („schwups zum Tisch“); der Hocker wird frei.
- **Hocker belegt:** Jeder sieht, wer sitzt (der Knopf zeigt „Klavier besetzt (Anna)“); eine Zeitgrenze für Stille gibt es nicht (nur die 10 Sekunden ohne Verbindung). Mit der Maus oder der Tastatur spielt im Mehrspieler nur, wer sitzt.
- **Lautstärke:** dieselbe Kurve wie beim Radio (voll bis 2,5 m, danach leiser).

## Aufräumliste (abdichten, noch offen)

Beim Durchgehen des Moduls und des Clients gefunden. Der Stand ist **nicht** behoben, solange es hier steht.

**A. Geister im Raum (wahrscheinlichste Ursache für „andere online, obwohl keiner da ist“) – behoben, siehe unten**
1. *(behoben)* Ein **Zuschauer, der still geworden ist**, wird nie entfernt: `check_timeouts` prüft nur Gäste mit Platz. Nach einem Neuveröffentlichen des Moduls oder einem Absturz bleiben so Zeilen mit `connected = true` und altem `lastSeen` stehen. Sie zählen als „andere im Raum“, nehmen freie Plätze nach Beitrittsreihenfolge (der Neue wird Zuschauer) und lösen Beitritts- und Austrittsmeldungen aus.
2. *(behoben)* Das Aufräumen (`seatTheFirstTwo`) entfernt nur Gäste mit `connected = false`. **Vorschlag:** jeder Gast, der länger als 10 Sekunden nichts von sich hören ließ, gilt als weg (in `seatTheFirstTwo` und `check_timeouts`, für alle, nicht nur für Spieler).
3. *(behoben)* Beim Beitritt mit **derselben Identität** (Token im Browser) kommt man mit altem Platz und altem Spielzustand zurück; ein laufendes Spiel mit einem Geist als Gegner dauert bis zu 10 Sekunden, dann folgen Meldungen („hat nicht geantwortet“) und das Spielende. Beim Beitritt sollte ein Geist **sofort** erkannt und entfernt werden.
4. Nach einem Neuveröffentlichen mit alten Zeilen: einmal `--delete-data` (siehe `spacetime/README.md`).

*Umsetzung von A (`sweep` im Modul):* Ein Gast gilt als **weg**, wenn die Verbindung zu ist oder er **10 Sekunden** nichts von sich hören ließ (`isGone`); das gilt für Zuschauer und Spieler. `sweep` läuft bei **jedem Beitritt** und alle 2 s von den Clients (`check_timeouts`): weggegangene Zuschauer werden entfernt (mit allen Zeilen: Gebot, Angebot, Kit, Kopf, Flügel-Hocker), ein stiller Spieler im laufenden Spiel verliert, sonst räumt `seatTheFirstTwo` auf und füllt freie Plätze. Hat der Server einen Gast entfernt (Pause, gedrosselter Tab), meldet sich der Client von selbst neu an.

**B. Eingaben prüfen (die Datenbank vertraut dem Browser)**
5. `push_chunk`: keine Größengrenze (eine riesige Zeile füllt die Datenbank); Grenze je Häppchen und je Stoß setzen.
6. `end_shot`: die Listen (`restIds`, `restX`, `restZ`, `pocketed`) haben keine Längen- oder Wertprüfung (Kugel 1 bis 15, gleich lange Listen, höchstens 16 Einträge, endliche Zahlen).
7. `set_kit`, `set_aim`, `set_presence`, `take_shot`: Texte (Getränk, Marke) und Zahlen (NaN, unendlich, riesig) werden nicht geprüft.
8. Aufrufhäufigkeit: nichts begrenzt `set_aim`, `set_presence`, `set_kit`, `play_keys`, `set_stake` (Dauerfeuer). Grenze je Gast und Sekunde.
9. `set_profile`: der Beitritt mit gleichem Namen ist möglich (zwei „Anna M. Meier“); Anzeige bleibt eindeutig durch die Flagge, aber prüfen, ob das reicht.

**C. Geld**
10. Das Geld liegt im Browser (`set_money`): jeder kann sich beliebig viel melden, und damit Einsatz und Gebote. Ein Konto auf dem Server wäre der richtige Weg; bis dahin: obere Grenze, und `set_money` nur in kleinen Schritten.
11. Der **Einsatz wird beim Start abgezogen und dem Sieger beim Spielende gutgeschrieben, beides im Browser**. Lädt der Sieger zwischen Spielende und Meldung neu, ist der Gewinn weg; wer mitten im Spiel neu lädt, hat den Einsatz schon gezahlt. Auf den Server verlagern (Treuhand in der Datenbank) oder zumindest das Spielende mit der Auszahlung als „offener Gewinn“ merken.
12. Während des Einsatz-Fensters kann man Geld ausgeben (Getränk, Zigaretten): der Einsatz wird beim Start auf das Geld begrenzt, aber der Browser zieht dann gegebenenfalls zu viel ab (`wallet.spend` schlägt fehl). Prüfen.

**D. Der Client**
13. `onGameRow` ruft `tellTableNow()` ohne Prüfung auf: nach einem Verbindungsabbruch ist es `null`.
14. Die Meldungen „X ist beigetreten / gegangen“ kommen auch für Geister (siehe A) und für jedes Neuladen eines Gastes in Folge; bündeln oder bei sehr schnellen Wechseln unterdrücken.
15. Ein abgelehnter Aufruf (die Datenbank sagt Nein) steht nur in der Konsole. Für Einsatz, Tischwette und Hocker eine kurze Meldung im Spiel anzeigen.
16. Stand nach einem Verbindungsabbruch mit automatischem Wiederverbinden: `roster`, Gesichter und Tabellen werden geleert, der Beitritt (`set_profile`) wird aber nicht neu gesendet; der Gast ist dann ein Geist aus seiner Sicht.
17. `leave_table` ist im Client nicht angeschlossen (kein Knopf zum Aufstehen vom Tisch).

**E. Aufräumen**
18. Docs: der Abschnitt „Vorbereitet: das Datenbank-Modul“ in diesem Dokument sagt noch, das Spiel benutze es nicht.
19. Prüfen, ob `winnerSeat` und `reason` nach mehreren Spielen sauber zurückgesetzt werden (Verlierer stößt zuerst).

## Vertrauen

Der Schütze rechnet selbst, also **könnte er schummeln** (falsche Häppchen schicken). Für eine Kneipenrunde unter Freunden genügt Vertrauen; die Datenbank prüft nur grob (Kugeln im Tisch, Anzahl stimmt, Ergebnis passt zur Aufnahme). Echte Absicherung wäre eine **Rechnung auf dem Server** mit derselben Physik, also dieselbe Rapier-Logik ein zweites Mal (z. B. in Rust im Modul oder in einem eigenen Node-Dienst), mit den Häppchen als Ergebnis: **gleiches Protokoll**, nur die Rechnung zieht um (das bräuchte dann doch den Stoß als reine Funktion). Das ist ein späterer Schritt.

## Was dafür im Spiel zuerst nötig wäre

1. Ein **Rekorder** in der Spielschleife (nur lesend): Lage und Drehung der Kugeln etwa 120-mal pro Sekunde, dazu die Ereignisse, in Häppchen.
2. Ein **Abspieler** (Puffer, Interpolation, Töne aus den Ereignissen), den man auch ohne Netz mit einer Aufnahme füttern kann (so lässt er sich allein testen).
3. Zufälliges und zeitabhängiges (Cue-Schwanken, `performance.now`) wird ohnehin **in den Stoßdaten** festgehalten, damit die Cue-Animation bei allen gleich läuft.
4. Danach erst SpacetimeDB (Tabellen, `take_shot`, Zeitabgleich, Häppchen) und die Anzeige der anderen Spieler.

## Vorbereitet: das Datenbank-Modul

Das SpacetimeDB-Modul liegt in [`spacetime/`](../spacetime/README.md) (TypeScript, `spacetimedb` 2.14; prüft mit `npm run check`): die Tabellen (Spieler, Spiel, Kugeln, Stoß, Häppchen, Zielen, Einsatz, Gebote) und die Aktionen mit den hier festgelegten Regeln (Foul, schwarze 8, Spielerwechsel, Tischwette, 10-s-Frist). Die Datenbank auf Maincloud heißt **`backroom-billard-3000`** (Konto `liquid3logic`). Das Modul ist **auf Maincloud veröffentlicht** (nach jeder Änderung neu veröffentlichen) (Dashboard: <https://spacetimedb.com/backroom-billard-3000>; wer es ändert, veröffentlicht es mit den Schritten in `spacetime/README.md` neu), das Spiel benutzt es **noch nicht**.

## Offene Fragen

- **Nach einem Spiel mit nur zwei Online:** Beide bleiben sitzen, das Einsatz-Fenster öffnet sich wieder (Betrag bleibt stehen), und die neue Runde beginnt, wenn beide Ready drücken (der Verlierer stößt zuerst).
- Wie sieht der Zuschauer-Satz in der Hand aus (dieselben Glas-, Zigaretten- und Feuerzeugmodelle wie am Tisch, nur ohne Tisch)? Und sieht man das Trinken und Rauchen der anderen aus der Ferne (kleine Modelle an ihrem Gesicht)?

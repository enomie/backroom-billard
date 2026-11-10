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
4. **Der dritte und jeder weitere Besucher** ist **Zuschauer**: Er kann **bieten** (Tischwette, +10 / +100, mindestens 10). Nach einem Spiel bleibt der Sieger am Tisch, und der **Höchstbietende** wird sein Herausforderer (automatisch, ohne Anfrage); der Sieger kann jederzeit aufhören (siehe „Entschieden“).
5. **Sachen der Zuschauer:** Ein Zuschauer hat **keine Sachen am Tisch**. Sein Glas, seine Zigarette und sein Feuerzeug **sieht man nur, solange er trinkt, raucht oder anzündet** (sie erscheinen in der Hand und lösen sich danach auf).
6. **Satz am Tisch** (Getränk, Zigaretten, Feuerzeug, Aschenbecher): gehört zu einem Platz und steht nur da, **solange der Platz besetzt ist**.

**Umgesetzt** (`room-notices.js`, `multiplayer.js`, `applySeats` in `billard.js`): die Meldungen („Waiting for another player“ solange man allein ist, „… joined“ / „… left“ und „Das Spiel beginnt: … stößt zuerst“ als kurze Meldungen für 5 s, mehrere untereinander; Texte `room.*`, Deutsch und Englisch) und der **Satz am Tisch**: Es sitzen die ersten **zwei anwesenden Gäste** (in der Reihenfolge des Beitretens, **die Datenbank vergibt die Plätze**: Platz 1 auf der +z-Seite, Platz 2 auf der −z-Seite; nur solange kein Spiel läuft). Ein Satz steht nur an einem besetzten Platz, die Tasten R und T benutzen immer den eigenen Satz. Im Singleplayer steht der eine Satz auf der +z-Seite. Der Satz des zweiten Gastes zeigt noch ein **zufälliges** Getränk und eine zufällige Packung (seine Wahl wird noch nicht übertragen). Ein Zuschauer (ab dem dritten Gast) nutzt vorerst die Sätze des Tisches, bis seine Sachen „nur in der Hand“ gebaut sind.

**Das Spiel startet von selbst,** sobald zwei Gäste sitzen (`seatTheFirstTwo` im Modul): Der Zustand in `game` wird „läuft“, der erste stößt zuerst, bei **beiden** erscheint „Das Spiel beginnt: Anna stößt zuerst“ und es wird **neu aufgebaut**. **Wer dran ist (umgesetzt):**
- **Wer dran ist, schaut durch seinen Cue** (die Kamera wechselt von selbst in die Spielerkamera) und darf stoßen. **Der andere ist in der freien Kamera** und schaut zu: Er kann nicht stoßen, nicht in die Spielerkamera wechseln und auch den Tisch nicht neu aufbauen (`N`, Re-rack). Zuschauer (ab dem dritten Gast) sind immer in der freien Kamera.
- Beginnt ein Stoß, sagt das Spiel es der Datenbank (`take_shot`). Liegen die Kugeln still (die weiße ist wieder aufgelegt), meldet der Schütze das Ergebnis (`end_shot`): welche Kugeln versenkt wurden, ob ein Foul war, ob die weiße weg war, und wo alle Kugeln liegen. **Die Datenbank wendet die Regeln an** (Foul, schwarze 8, wer dran ist) und sagt, wer als Nächstes stößt; bei allen erscheint „Anna ist dran“ und die Kamera folgt.
- **Die anderen sehen das Zielen und den Stoß (umgesetzt, `src/shot-replay.js`):**
  - **Der Kopf:** Der Kopf (das Gesicht) eines Gastes hängt **dort, wo seine Kamera ist**: in der freien Kamera dort, in der Spielerkamera **hinter dem Cue** (der Kopf des Schützen beim Zielen).
  - **Nach dem Stoß geht der Schütze von selbst in die freie Kamera:** Sobald der Nachschwung des Cues vorbei ist, fliegt seine Kamera in die freie Ansicht (er schaut den Kugeln zu). Für die anderen wandert sein **Kopf** dorthin und sein **Cue** wird **am Kopf getragen** (die Haltepose), er bleibt **nicht am Ball** und folgt der weißen Kugel nicht. Der Cue verlässt den Ball dort, wo er gestoßen hat. Bleibt er nach dem Stoß dran (Kugel versenkt), geht seine Kamera zurück in die Spielerkamera.
  - **Zielen:** Wer dran ist, schickt etwa 15-mal pro Sekunde seinen Cue-Winkel, die Neigung und wo die Spitze die Kugel trifft (`set_aim`). Die anderen sehen **seinen Cue am Ball** (weich nachgeführt) und die Zielhilfe, nicht ihren eigenen getragenen Cue.
  - **Stoß:** Ab dem Stoß schreibt das Spiel des Schützen in jedem Bild auf, wo die Kugeln sind (Lage und Drehung) und wie der Cue sich bewegt (Zurückziehen, Halt, Vorschnalzen, Nachschwung), und schickt das alle 100 ms als Stück an die Datenbank (`push_chunk`, 468 Byte je Bild, bei 60 Bildern pro Sekunde knapp 30 KB/s). Die anderen sammeln die Stücke und spielen sie **0,7 s später** ab (Puffer, `REPLAY_DELAY_MS`), weich zwischen den Bildern; Kugeln, die ins Loch fallen, verschwinden im Ablauf.
  - **Am Ende** (die Kugeln liegen still, der Schütze hat `end_shot` gemeldet) wird erst der **Ablauf zu Ende gespielt**, dann springen die Kugeln auf die endgültigen Plätze, und erst dann kommen die Meldungen „X ist dran“, der Kamerawechsel und ein mögliches Spielende. So sieht der Wartende alles, bevor er dran ist.
  - **Ton (umgesetzt):** Die Töne des Stoßes werden im selben Strom mitgeschickt und beim Abspielen zur richtigen Zeit gespielt, an den Stellen, wo sie entstanden: Zurückziehen und Vorschnalzen des Cues, das „Tock“ der Spitze, Klacken der Kugeln, Banden, Rand und Boden der Löcher. Das Rollgeräusch wird beim Abspielen aus der Bewegung der Kugeln berechnet (nicht mitgeschickt). Ein Ton ist ein kleiner Eintrag (8 Zahlen: Zeit, Art, Stärke, Ort, Kugel).
- **Spielende:** Entscheidet die Datenbank (Foul, schwarze 8, 10 Sekunden ohne Antwort, aufgestanden), erscheint bei allen „SPIEL VORBEI“ beziehungsweise GAME LOST / YOU WIN mit dem Grund und den Namen. Fehlt ein Spieler im laufenden Spiel länger als 10 Sekunden, hat er verloren (`check_timeouts`, das Spiel ruft es alle 2 s).
- **„Nochmal“ (umgesetzt):** Nach dem Spielende steht auf dem Bildschirm der Knopf **Nochmal** (de) / **Play again** (en), nur für die zwei Spieler. Drückt einer, steht auf seinem Knopf „Warte auf den anderen Spieler …“, beim anderen erscheint „Anna will nochmal spielen“. **Haben beide gedrückt, beginnt die nächste Runde** (neu aufgebaut, **der Verlierer stößt zuerst**). Nach einem Foul oder der schwarzen 8 bleiben **beide sitzen**. Hat der Verlierer den Tisch verlassen oder war zehn Sekunden stumm, gibt es den Knopf nicht (er verliert seinen Platz; kommt jemand Neues, beginnt mit ihm ein neues Spiel von selbst). Der Re-rack-Knopf fehlt im Multiplayer.
- **Noch nicht gebaut:** die Tischwette (ab drei Online).

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

## Trinken und Rauchen der anderen (umgesetzt)

Hält ein Gast **R** (trinken) oder **T** (rauchen) gedrückt oder lässt los, sagt sein Spiel das der Datenbank (`set_hand`, nur bei einer Änderung). Bei den anderen läuft dann **dieselbe Animation** wie bei ihm (`drinking.js`, `smoking.js`), gesteuert von seinen Tasten und von der Lage seines Kopfes: das **Glas seines Platzes** fliegt zu seinem Mund, kippt, der Stand sinkt, er schluckt; die **Zigarette** kommt aus der Packung oder dem Aschenbecher, das Feuerzeug brennt, er zieht, die Glut glüht, der Rauch steigt, er atmet aus. Es ist bewusst keine Übertragung von Bildern: Beide Seiten rechnen aus denselben Eingaben (R und T gedrückt, Kopf). Ohne Geld und ohne Körper-Balken beim Zuschauer (die gehören dem, der trinkt).

- **Nur Spieler an den zwei Plätzen** (die Sätze am Tisch): Ein Zuschauer hat keinen Satz, seine Sachen „in der Hand“ sind noch nicht gebaut.
- Die Geräusche (Schluck, Feuerzeug, Ausatmen) kommen **nicht aus dem Raum**, sie klingen beim Zuschauer wie beim Trinkenden selbst (noch ohne Ort).
- Der Stand der Gläser und der Zigaretten der Gegenseite folgt nur den gesehenen Aktionen; ein neues Getränk, das der andere bestellt, wird noch nicht übertragen.

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

- **Nach einem Spiel mit nur zwei Online:** Der Verlierer wäre Zuschauer, und ohne Gebot gibt es kein Spiel. Vorschlag: Bei nur zwei Online bleiben **beide sitzen**, und eine neue Runde beginnt, wenn beide **„Nochmal“** drücken (der Verlierer stößt zuerst); den Einsatz (die Tischwette) gibt es erst ab drei Online.
- Wie sieht der Zuschauer-Satz in der Hand aus (dieselben Glas-, Zigaretten- und Feuerzeugmodelle wie am Tisch, nur ohne Tisch)? Und sieht man das Trinken und Rauchen der anderen aus der Ferne (kleine Modelle an ihrem Gesicht)?

# Chat (Plan)

> **Status: Plan, nichts davon ist umgesetzt.** Im Mehrspieler schreibt jeder Gast eine Nachricht, die **über seinem Kopf** stehen bleibt, bis er sie **selbst löscht** oder den Raum verlässt. Wie die anderen Teile des Mehrspielers steht der Rahmen in [`multiplayer.md`](multiplayer.md).

## Entschieden

- **Eine Nachricht je Gast:** die letzte. Eine neue ersetzt die alte, **kein Verlauf**, kein Archiv. Sie steht, bis der Gast sie **löscht** oder den Raum **verlässt** (keine Zeitgrenze).
- **Länge:** höchstens **90 Zeichen**, ohne Zeilenumbrüche und Steuerzeichen.
- **Reichweite:** Man sieht jede Nachricht **aus jeder Entfernung** (später vielleicht abgestuft).
- **Keine Moderation:** kein Filter, keine Stummschaltung. Technisch bleibt nur der Schutz gegen Überflutung: **mindestens 2 Sekunden** zwischen zwei Nachrichten (und die allgemeine Aufrufgrenze des Moduls).
- **Bedienung (Computer):** `Enter` öffnet das Eingabefeld, `Enter` sendet, `Esc` bricht ab. **Ein leeres Feld mit `Enter` löscht** die eigene Nachricht. Solange das Feld offen ist, tun die Spieltasten nichts.
- **Eigene Nachricht:** Man sieht seinen eigenen Kopf nicht; deshalb steht die eigene Nachricht **links**, **unter dem Status** (oben links, „Ready to shoot“), mit einem **✕** zum Löschen.
- **Handy:** ein **Knopf** (Sprechblase) öffnet das Eingabefeld, das Feld hat einen **Senden**-Knopf (es gibt keine Enter-Taste).
- **Nur im Mehrspieler.** Im Einzelspiel gibt es keinen Chat und keinen Knopf.
- **Text nur als Bild gezeichnet** (auf eine Fläche, nie als Seitentext), damit fremder Text nichts auslösen kann.

## Daten (Modul)

| Tabelle | Inhalt | Sichtbar |
|---------|--------|----------|
| `chat` | `identity` (Primärschlüssel), `text`, `at` (wann) | öffentlich |

| Aktion | Wirkung |
|--------|---------|
| `say(text)` | Die eigene Nachricht setzen. Geprüft: angemeldet (`me()`), getrimmt, **1 bis 90 Zeichen** (nach Zeichen, nicht Bytes), keine Steuerzeichen oder Zeilenumbrüche, **mindestens 2 s** nach der letzten eigenen (sonst Fehler „too fast“). |
| `clear_say()` | Die eigene Nachricht löschen. |

- Die Zeile verschwindet mit dem Gast (`dropGuest`, Verbindungsabbruch), nie mit der Zeit.
- Höchstens so viele Zeilen wie Gäste im Raum, nie ein Verlauf.

## Client

- **`face-ball.js`:** Über dem Schild (Flagge und Name) hängt eine **Sprechblase** (zweiter Sprite, wie das Schild **ohne Größenabnahme**: immer gleich groß auf dem Bildschirm, `sizeAttenuation: false`). Sie wird auf eine Zeichenfläche gemalt: dunkler, abgerundeter Hintergrund wie das Schild, heller Text, **Zeilen umgebrochen** (höchstens 3, danach „…“), die Höhe richtet sich nach der Zeilenzahl. Neue Funktion `setMessage(text)`; leerer Text blendet sie aus. Größen in `face-ball-constants.js`.
- **`multiplayer.js`:** `chat` abonnieren; bei Einfügen, Ändern, Löschen die Nachricht an den Kopf des Gastes (`setMessage`) und die eigene als Ereignis `chat` an das Spiel; Aufrufe `say(text)` und `clearSay()`.
- **Eingabe** (`src/chat-box.js`): ein Feld unten in der Mitte über der Leiste (`maxlength` 90), `Enter` / `Esc` / leer = löschen; **Senden**-Knopf für das Handy; Platzhaltertext. Beim Öffnen werden gehaltene Tasten losgelassen (`heldKeys` leeren, Trinken und Rauchen loslassen), solange es offen ist, schlucken die Tastenbehandlungen alle Tasten (die allgemeine in `billard.js`, die des Klaviers, die des Getränkemenüs).
- **Öffnen mit `Enter` nur**, wenn kein anderes Fenster oben ist (Einstellungen, Getränkemenü, Einsatz-Fenster, Spielende-Meldung, Welcome).
- **Eigene Nachricht:** Zeile unter dem Status oben links mit ✕; leer = ausgeblendet.
- **Knopf (Sprechblase):** Symbol im Kopf der Anzeige, nur im Mehrspieler.
- **Texte** (`en.js`, `de.js`): `chat.placeholder`, `chat.send`, `chat.clear`, `chat.open`.

## Schritte (jeder lauffähig und geprüft)

1. **Modul:** Tabelle `chat`, `say`, `clear_say`, Aufräumen in `dropGuest` und beim Verbindungsabbruch; Bindings. *Prüfen:* Typcheck; nach dem Veröffentlichen mit dem Spiel oder `spacetime sql … "select * from chat"`.
2. **Sprechblase am Kopf:** `setMessage` in `face-ball.js`, Größen in den Konstanten; Debug-Flagge `chat` (`?debug=chat`) zeigt am Dummy-Kopf (`?debug=face`) einen langen Beispieltext. *Prüfen:* Umbruch, drei Zeilen und „…“, gleich große Darstellung aus Nähe und Ferne, leerer Text blendet aus.
3. **Anbindung:** Nachrichten der anderen über deren Köpfen, `say` und `clearSay` im Client. *Prüfen:* mit zwei Browsern: Nachricht erscheint beim anderen, ersetzt die alte, verschwindet beim Löschen und wenn der Gast geht.
4. **Eingabe und Anzeige für mich:** das Feld, `Enter` / `Esc`, Tasten schlucken, eigene Zeile mit ✕, Handy-Knopf und Senden-Knopf. *Prüfen:* beim Tippen keine Spieltaste (E, R, T, W A S D, `C`, `F` am Klavier), `Enter` öffnet nicht über offenen Fenstern, Löschen mit leerem Feld und mit ✕, Handy.
5. **Docs und Aufräumen:** `multiplayer.md`, `spacetime/README.md`, README; tote Reste entfernen.

## Offene Punkte für die Umsetzung

- Genaue Stelle und Symbol des Handy-Knopfs (Vorschlag: unter dem Zahnrad oben rechts).
- Aussehen der Sprechblase (Vorschlag: wie das Schild, etwas heller, ohne Spitze).
- Später möglich: Reichweite abstufen (weit weg nur eine kleine Blase ohne Text), ein kurzer Verlauf in einer Ecke.

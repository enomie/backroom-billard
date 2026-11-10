# SpacetimeDB-Modul (Vorbereitung)

> **Status: auf Maincloud veröffentlicht (Datenbank `backroom-billard-3000`, Dashboard <https://spacetimedb.com/backroom-billard-3000>), vom Spiel benutzt (Anmeldung und Gesichter der anderen, siehe `_docs/multiplayer.md`).** Das Modul (TypeScript, `spacetimedb` 2.14) enthält die Tabellen und Aktionen (Reducer) nach [`_docs/multiplayer.md`](../_docs/multiplayer.md). Es rechnet **keine Physik**: Der Schütze rechnet im Browser und schickt die Aufnahme in Häppchen.

Läuft auf **Maincloud** (extern), die Datenbank heißt **`backroom-billard-3000`** (Konto `liquid3logic`: <https://spacetimedb.com/@liquid3logic/backroom-billard-3000>); der eigene Server (nur HTML und PHP) liefert nur das Spiel. Der Browser verbindet sich direkt mit der Datenbank.

## Inhalt (`src/index.ts`)

| Tabelle | Inhalt |
|---------|--------|
| `player` | wer im Raum ist: Name, Land, Gesicht (JSON), Geld, Platz (0 Zuschauer, 1 und 2 am Tisch), Lebenszeichen |
| `game` | das eine Spiel: Zustand, wer stößt, Stoßnummer, läuft ein Stoß, Sieger und Grund, Einsatz und Herausforderer |
| `ball` | die Kugeln in Ruhe (Lage, versenkt oder nicht) |
| `shot` | der Stoß (Winkel, Kraft, Nubbel, Neigung, der Zufallsfehler des Schützen) |
| `shotChunk` | die Aufnahme des laufenden Stoßes in Häppchen (nach dem Zug nicht mehr nötig) |
| `aim` | das Zielen des Schützen (etwa 15-mal pro Sekunde, die anderen sehen den Cue) |
| `kit` | was am Platz eines Gastes steht: Getränk, Schlucke, Marke und Zahl der Zigaretten |
| `hand` | was die Hände tun: R (trinken) und T (rauchen) gedrückt; die anderen sehen es |
| `presence` | wo jeder ist (Kamera: Ort und Blick, freie Kamera ein oder aus); das Gesicht der anderen hängt dort |
| `rematch` | wer nach einem Spielende nochmal spielen will (beide Spieler müssen drücken) |
| `bid` | die Tischwetten der Zuschauer (ein Gebot je Zuschauer) |

| Reducer | Zweck |
|---------|-------|
| `set_profile` | in den Raum kommen (Name, Land, Gesicht, Geld): es gibt **einen** Raum für alle, jeder kommt als Zuschauer; die ersten zwei anwesenden Gäste setzen sich in der Reihenfolge des Beitretens (Platz 1 und 2), bei zwei Spielern beginnt das Spiel von selbst; das Spiel (eine Zeile in `game`) wird beim ersten Gebrauch angelegt |
| `set_kit` | das Getränk oder die Zigaretten haben sich geändert (nur bei einer Änderung) |
| `set_hand` | R und T gedrückt oder losgelassen (nur bei einer Änderung) |
| `set_presence` | Ort und Blick der Kamera (etwa 10-mal pro Sekunde) |
| `heartbeat`, `check_timeouts` | Lebenszeichen alle 2 s; wer als Spieler 10 s fehlt, hat verloren |
| `place_bid`, `withdraw_bid` | Tischwette: Vielfache von 10, mindestens 10, höchstens das Geld; nur erhöhen oder zurückziehen (nicht als Herausforderer im laufenden Spiel) |
| `set_aim`, `take_shot`, `push_chunk`, `end_shot` | Zielen, Schuss (nur wer dran ist und kein Stoß läuft), Häppchen der Aufnahme, Ende des Stoßes mit Ergebnis |
| `play_again` | „Nochmal“: wenn beide Spieler gedrückt haben, beginnt das nächste Spiel (der Verlierer stößt zuerst) |
| `leave_table` | vom Tisch aufstehen (im Spiel: verloren) |

Regeln im Modul: Foul oder zu früh versenkte schwarze 8 verliert der Schütze, die schwarze 8 als letzte Kugel gewinnt; wer eine Kugel versenkt (und die weiße nicht), stößt nochmal, sonst der andere; der Einsatz des Herausforderers gehört dem Sieger (gewinnt der Herausforderer, bekommt er ihn zurück); der Verlierer wird Zuschauer, der Sieger bleibt, der Höchstbietende (bei Gleichstand der erste) rückt nach.

## Prüfen

```bash
cd spacetime
npm install
npm run check   # TypeScript, ohne Ausgabe
```

## Veröffentlichen (auf deinem Rechner, eingeloggt)

Die Datenbank heißt **`backroom-billard-3000`** (Konto `liquid3logic`, Maincloud): <https://spacetimedb.com/@liquid3logic/backroom-billard-3000>.

Die Schnellstart-Schritte der Seite (`spacetime dev … --template chat-react-ts`) legen ein **Chat-Beispiel** an; das brauchen wir **nicht**. Wir veröffentlichen **dieses Modul** in dieselbe Datenbank:

```bash
curl -sSf https://install.spacetimedb.com | sh   # einmal: die Kommandozeile installieren
spacetime login                                   # einmal
cd spacetime && npm install
spacetime publish backroom-billard-3000 --module-path . --server maincloud
```

Danach die Anbindung für das Spiel erzeugen (Typen für den Browser, im Spiel-Ordner):

```bash
spacetime generate --lang typescript --out-dir src/module_bindings --module-path spacetime
```

Die Aufrufe sind die der Schnellstart-Seite und der Dokumentation (`spacetime publish` ist der Befehl für ein vorhandenes Modul); die genauen Schalter bitte dort gegenprüfen, sie ändern sich. Das Spiel verbindet sich dann mit `DbConnection.builder().withUri('wss://maincloud.spacetimedb.com').withDatabaseName('backroom-billard-3000')` (Paket `spacetimedb`, noch nicht im Spiel).

## Noch offen

- Verbunden sind erst die Anmeldung und die Gesichter; Rekorder, Abspieler, Plätze und Tischwette fehlen noch, siehe „Was dafür im Spiel zuerst nötig wäre“ in `multiplayer.md`.
- Die Startlage der Kugeln: `ball` hat zu Beginn alle Kugeln auf (0, 0); die echten Lagen kommen vom Client beim ersten Stoß (oder werden dort geschickt).
- Ob die Reducer-Namen und Argumente in dieser Form bleiben, zeigt der erste Anschluss.

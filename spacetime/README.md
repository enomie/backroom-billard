# SpacetimeDB-Modul (Vorbereitung)

> **Status: vorbereitet, nicht veröffentlicht, vom Spiel noch nicht benutzt.** Das Modul (TypeScript, `spacetimedb` 2.14) enthält die Tabellen und Aktionen (Reducer) nach [`_docs/multiplayer.md`](../_docs/multiplayer.md). Es rechnet **keine Physik**: Der Schütze rechnet im Browser und schickt die Aufnahme in Häppchen.

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
| `bid` | die Tischwetten der Zuschauer (ein Gebot je Zuschauer) |

| Reducer | Zweck |
|---------|-------|
| `set_profile` | in den Raum kommen (Name, Land, Gesicht, Geld); die ersten zwei setzen sich in der Reihenfolge des Beitretens an den Tisch |
| `heartbeat`, `check_timeouts` | Lebenszeichen alle 2 s; wer als Spieler 10 s fehlt, hat verloren |
| `place_bid`, `withdraw_bid` | Tischwette: Vielfache von 10, mindestens 10, höchstens das Geld; nur erhöhen oder zurückziehen (nicht als Herausforderer im laufenden Spiel) |
| `set_aim`, `take_shot`, `push_chunk`, `end_shot` | Zielen, Schuss (nur wer dran ist und kein Stoß läuft), Häppchen der Aufnahme, Ende des Stoßes mit Ergebnis |
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

- Das Spiel wird noch nicht verbunden (Rekorder, Abspieler, Anmeldung): siehe „Was dafür im Spiel zuerst nötig wäre“ in `multiplayer.md`.
- Die Startlage der Kugeln: `ball` hat zu Beginn alle Kugeln auf (0, 0); die echten Lagen kommen vom Client beim ersten Stoß (oder werden dort geschickt).
- Ob die Reducer-Namen und Argumente in dieser Form bleiben, zeigt der erste Anschluss.

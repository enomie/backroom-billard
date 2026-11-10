# SpacetimeDB-Modul (Vorbereitung)

> **Status: auf Maincloud veröffentlicht (Datenbank `backroom-billard-3000`, Dashboard <https://spacetimedb.com/backroom-billard-3000>), vom Spiel benutzt (Anmeldung und Gesichter der anderen, siehe `_docs/multiplayer.md`).** Das Modul (TypeScript, `spacetimedb` 2.14) enthält die Tabellen und Aktionen (Reducer) nach [`_docs/multiplayer.md`](../_docs/multiplayer.md). Es rechnet **keine Physik**: Der Schütze rechnet im Browser und schickt die Aufnahme in Häppchen.

Läuft auf **Maincloud** (extern), die Datenbank heißt **`backroom-billard-3000`** (Konto `liquid3logic`: <https://spacetimedb.com/@liquid3logic/backroom-billard-3000>); der eigene Server (nur HTML und PHP) liefert nur das Spiel. Der Browser verbindet sich direkt mit der Datenbank.

## Inhalt (`src/index.ts`)

| Tabelle | Inhalt |
|---------|--------|
| `player` | wer im Raum ist: Name, Land, Gesicht (JSON), Geld, Platz (0 Zuschauer, 1 und 2 am Tisch), Lebenszeichen |
| `game` | das eine Spiel: Zustand, wer stößt, Stoßnummer, läuft ein Stoß, Sieger und Grund, Einsatz (je Spieler) |
| `ball` | die Kugeln in Ruhe (Lage, versenkt oder nicht) |
| `shot` | der Stoß (Winkel, Kraft, Nubbel, Neigung, der Zufallsfehler des Schützen) |
| `shotChunk` | die Aufnahme des laufenden Stoßes in Häppchen (nach dem Zug nicht mehr nötig) |
| `aim` | das Zielen des Schützen (etwa 15-mal pro Sekunde, die anderen sehen den Cue) |
| `kit` | was am Platz eines Gastes steht: Getränk, Schlucke, Marke und Zahl der Zigaretten |
| `hand` | was die Hände tun: R (trinken) und T (rauchen) gedrückt; die anderen sehen es |
| `presence` | wo jeder ist (Kamera: Ort und Blick, freie Kamera ein oder aus); das Gesicht der anderen hängt dort |
| `pocket` | welche Kugel welcher Platz versenkt hat (die zwei Listen über dem Tisch) |
| `ranking`, `standing` | die Weltrangliste (die ersten 100 nach Geld) und der Platz jedes angemeldeten Gastes (`refresh_ranking`, höchstens alle 5 s) |
| `lobby` | (öffentlich) wer angemeldet ist, aber noch nicht im Raum (Wahl an der Bar): Name, Land, Gesicht, Geld; verschwindet mit `join_room` |
| `account`, `link` | (privat) das Konto je Schlüssel (Geld, Name, Land, Gesicht) und welche Verbindung gerade angemeldet ist |
| `rate` | (privat) Aufrufe je Gast in der laufenden Sekunde, höchstens 100 |
| `piano` | der Flügel: wer am Hocker sitzt (nur einer) und welche Tasten gedrückt sind (88 Bits) |
| `stake` | das Einsatz-Fenster der zwei Spieler, live: Angebot und Bereit je Spieler (Einsatz = das kleinere Angebot) |
| `bid` | die Tischwetten der Zuschauer (ein Gebot je Zuschauer) |

| Reducer | Zweck |
|---------|-------|
| `create_account`, `enter`, `join_room` | Konto anlegen (der Browser würfelt den Schlüssel `XXXX-XXXX-XXXX-XXXX-XXXX`, Name, Land und Gesicht werden geprüft, 15.000 $) und mit einem Schlüssel anmelden (`enter`; nur angemeldet, noch nicht im Raum); `join_room` betritt den Raum. Es gibt **einen** Raum für alle, jeder kommt als Zuschauer; eine Verbindung je Konto (ein zweites Gerät loggt das erste aus); die ersten zwei Gäste setzen sich |
| `refresh_ranking` | die Weltrangliste und die Plätze neu berechnen (höchstens alle 5 s, wer immer fragt) |
| `buy` | Getränk oder Packung kaufen: Preis aus dem Modul (`PRICES`), der Server zieht vom Konto ab oder lehnt ab; das Geld zählt nur der Server (`player.money` ist die Anzeige) |
| `set_kit` | das Getränk oder die Zigaretten haben sich geändert (nur bei einer Änderung) |
| `set_hand` | R und T gedrückt oder losgelassen (nur bei einer Änderung) |
| `set_presence` | Ort und Blick der Kamera (etwa 10-mal pro Sekunde) |
| `heartbeat`, `check_timeouts` | Lebenszeichen alle 2 s; wer als Spieler 10 s fehlt, hat verloren |
| `place_bid`, `withdraw_bid` | Tischwette der Zuschauer: Vielfache von 10, mindestens 100, höchstens das Geld (wer weniger als 100 hat: alles); jederzeit änderbar oder zurückziehbar |
| `set_aim`, `take_shot`, `push_chunk`, `end_shot` | Zielen, Schuss (nur wer dran ist und kein Stoß läuft), Häppchen der Aufnahme, Ende des Stoßes mit Ergebnis |
| `sit_piano`, `leave_piano`, `play_keys` | Flügel: hinsetzen (nur einer, nicht wer am Tisch dran ist; wer dran kommt, steht auf), aufstehen, gedrückte Tasten senden; ohne Verbindung oder nach 10 s Stille wird der Hocker frei |
| `set_stake`, `set_ready` | Einsatz-Fenster: das eigene Angebot (gleiche Grenzen wie die Wette); Bereit. Ändert sich der Einsatz, ist Bereit bei beiden zurückgesetzt; sind beide bereit, beginnt das Spiel (der Verlierer stößt zuerst) |
| `leave_table` | vom Tisch aufstehen (im Spiel: verloren) |

Regeln im Modul: Foul oder zu früh versenkte schwarze 8 verliert der Schütze, die schwarze 8 als letzte Kugel gewinnt; wer eine Kugel versenkt (und die weiße nicht), stößt nochmal, sonst der andere; der Einsatz (das kleinere der beiden Angebote, von jedem gezahlt) gehört dem Sieger, der beide Beträge bekommt (die Clients buchen das Geld, das Spiel hält es lokal); der Sieger bleibt, der Verlierer wird Zuschauer, sobald jemand geboten hat (der Höchstbietende, bei Gleichstand der erste, rückt nach), sonst bleiben beide.

## Aufräumen von selbst

Bleibt der Raum in einem seltsamen Zustand (ein Spiel läuft mit Spielern, die längst weg sind), räumt das Modul auf: Wer **10 Sekunden** nichts von sich hören lässt, verliert (`check_timeouts`); danach (und bei jedem Lebenszeichen, solange kein Spiel läuft, `seatTheFirstTwo`) werden Gäste, die **weg** sind, aus der Liste genommen (mit ihren Plätzen, Geboten und Zeilen), und freie Plätze gehen an die Gäste, die **wirklich da** sind (in der Reihenfolge des Kommens); wer sitzt, behält seinen Platz. Sitzen zwei, öffnet sich das Einsatz-Fenster (Zustand 2).

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

Die Aufrufe sind die der Schnellstart-Seite und der Dokumentation (`spacetime publish` ist der Befehl für ein vorhandenes Modul); die genauen Schalter bitte dort gegenprüfen, sie ändern sich. Das Spiel verbindet sich dann mit `DbConnection.builder().withUri('wss://maincloud.spacetimedb.com').withDatabaseName('backroom-billard-3000')` (Paket `spacetimedb`).

## Noch offen

- Verbunden sind erst die Anmeldung und die Gesichter; Rekorder, Abspieler, Plätze und Tischwette fehlen noch, siehe „Was dafür im Spiel zuerst nötig wäre“ in `multiplayer.md`.
- Die Startlage der Kugeln: `ball` hat zu Beginn alle Kugeln auf (0, 0); die echten Lagen kommen vom Client beim ersten Stoß (oder werden dort geschickt).
- Ob die Reducer-Namen und Argumente in dieser Form bleiben, zeigt der erste Anschluss.

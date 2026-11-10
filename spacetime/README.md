# SpacetimeDB-Modul (Vorbereitung)

> **Status: vorbereitet, nicht veröffentlicht, vom Spiel noch nicht benutzt.** Das Modul (TypeScript, `spacetimedb` 2.14) enthält die Tabellen und Aktionen (Reducer) nach [`_docs/multiplayer.md`](../_docs/multiplayer.md). Es rechnet **keine Physik**: Der Schütze rechnet im Browser und schickt die Aufnahme in Häppchen.

Läuft auf **Maincloud** (extern); der eigene Server (nur HTML und PHP) liefert nur das Spiel. Der Browser verbindet sich direkt mit der Datenbank.

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
| `aim`, `take_shot`, `push_chunk`, `end_shot` | Zielen, Schuss (nur wer dran ist und kein Stoß läuft), Häppchen der Aufnahme, Ende des Stoßes mit Ergebnis |
| `leave_table` | vom Tisch aufstehen (im Spiel: verloren) |

Regeln im Modul: Foul oder zu früh versenkte schwarze 8 verliert der Schütze, die schwarze 8 als letzte Kugel gewinnt; wer eine Kugel versenkt (und die weiße nicht), stößt nochmal, sonst der andere; der Einsatz des Herausforderers gehört dem Sieger (gewinnt der Herausforderer, bekommt er ihn zurück); der Verlierer wird Zuschauer, der Sieger bleibt, der Höchstbietende (bei Gleichstand der erste) rückt nach.

## Prüfen

```bash
cd spacetime
npm install
npm run check   # TypeScript, ohne Ausgabe
```

## Veröffentlichen (wenn du eingeloggt bist)

Die genauen Aufrufe stehen in der SpacetimeDB-Dokumentation (die Befehle ändern sich); sinngemäß:

```bash
spacetime login
spacetime publish --module-path spacetime backroom-billard
spacetime generate --lang typescript --out-dir src/module_bindings --module-path spacetime
```

`generate` erzeugt die Anbindung für das Spiel (`module_bindings`), mit dem Paket `spacetimedb` im Browser (`DbConnection.builder()…`). Das Spiel selbst hat diese Abhängigkeit noch nicht.

## Noch offen

- Das Spiel wird noch nicht verbunden (Rekorder, Abspieler, Anmeldung): siehe „Was dafür im Spiel zuerst nötig wäre“ in `multiplayer.md`.
- Die Startlage der Kugeln: `ball` hat zu Beginn alle Kugeln auf (0, 0); die echten Lagen kommen vom Client beim ersten Stoß (oder werden dort geschickt).
- Ob die Reducer-Namen und Argumente in dieser Form bleiben, zeigt der erste Anschluss.

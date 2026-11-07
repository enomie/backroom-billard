# Radio

> **Status: umgesetzt** (Radio, Sideboard, Ein/Aus, Display, Stereo-Lautsprecher, Stream). Titelanzeige per ICY-Metadaten (best effort); **nicht umgesetzt:** Playlist.

Ein altes Röhren-Holzradio auf einem Sideboard an einer langen Wand. Es ist **standardmäßig eingeschaltet**; der **rechte Knopf** ist der Ein/Aus-Schalter und wird angeklickt.

## Aufbau (Code)

| Datei | Inhalt |
|-------|--------|
| `src/radio.js` | Meshes (Sideboard, Radio), Display, Klick auf den Knopf |
| `src/radio-audio.js` | Stream, Web Audio, zwei Lautsprecher im Raum |
| `src/radio-constants.js` | Stream-Adresse, Position, Maße, Lautstärke, Farben |

## Aussehen

- **Sideboard:** Holz mit Maserung, Deckplatte, zwei Türen mit Messing-Griffen, vier kurze Füße (1,6 × 0,42 × 0,78 m).
- **Radio** (0,56 × 0,31 × 0,26 m): dunkles Nussbaum-Gehäuse mit abgerundeten Kanten und Messing-Füßchen; oben ein **goldenes Lautsprechergewebe** im Messingrahmen; darunter die schwarze **Skala**; links ein Zierknopf, **rechts der Ein/Aus-Knopf**; grüne Kontrolllampe; fünf Tasten.
- **Beleuchtung:** Bei eingeschaltetem Radio leuchtet die Skala warm und das Radio erhellt Gewebe und Sideboard leicht. Aus: alles dunkel, der Knopf dreht sich um 90°.

## Standort

Das Sideboard steht an der **+x-Wand** (lange Seite), in Höhe der Tischmitte (`z = 0`), unter der mittleren Wandleuchte. Wand und Position stehen in `radio-constants.js` (`RADIO_WALL_SIDE`, `RADIO_WALL_Z`).

## Bedienung

- **Ein/Aus:** den rechten Knopf anklicken, aus höchstens 6 m Abstand (mit der freien Kamera `C`). Ein Klick auf den Knopf löst keinen Stoß aus.
- **Erster Klick:** Browser erlauben Ton erst nach einer Nutzeraktion. Das Radio ist von Anfang an „an“, die Skala zeigt bis zum ersten Klick oder Tastendruck **KLICK ZUM STARTEN**.

## Display

Die Skala zeigt den **Sender (KNKX)** und den **Zustand**: *Klick zum Starten*, *Verbinde…*, *Live*, *Kein Signal*. Die Wörter laufen durch `src/i18n`, der Sendername nicht.

## Audio

- **Quelle:** der direkte AAC-Stream (`RADIO_STREAM_URL`). Die HLS-Playlist (`.m3u8`) wird nicht genutzt, weil sie außerhalb von Safari eine Zusatzbibliothek braucht.
- **Zwei Lautsprecher:** Der Stream wird in linken und rechten Kanal getrennt. Jeder Kanal kommt aus einem eigenen Lautsprecher links und rechts im Radio (±15 cm). Ein Mono-Stream läuft auf beiden. Hörer ist die Kamera: Richtung und Abstand zum Radio ändern Panorama und Lautstärke, bis 2,5 m volle Lautstärke, danach leiser.
- **Fallback:** Erlaubt der Server keine Audio-Verarbeitung von einer anderen Domain (CORS), wird der Stream ohne Raumklang abgespielt; die Lautstärke folgt dann nur dem Abstand.
- **Lautstärke:** `RADIO_VOLUME`, `RADIO_REF_DISTANCE`, `RADIO_ROLLOFF` in `radio-constants.js`.

## Offene Punkte

- **Titel im Display:** Das Audio-Element liefert keine Titelinfos. `radio-metadata.js` fragt den Stream deshalb alle 20 s zusätzlich mit `Icy-MetaData: 1` an, liest nur den ersten Metadatenblock (`StreamTitle`) und bricht ab. Das funktioniert nur, wenn der Server per CORS `icy-metaint` freigibt; sonst zeigt das Display weiter nur Sender und „LIVE“. Gegen den echten Server nicht getestet (aus der Sandbox gesperrt). Hinweis: Kanal `6285` ist laut KNKX-Seite der Jazz24-Stream. Eine Playlist-Anzeige ist offen.
- **Rechte:** Dürfen wir den Stream im Spiel nutzen (Nutzungsbedingungen des Senders)?
- **Referenzfoto:** Es liegt nicht im Repo (Bildrechte ungeklärt).
- **Touch:** Das Anklicken des Knopfes geht mit der Maus, nicht per Antippen.

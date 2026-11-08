# Radio

> **Status: umgesetzt** (Radio, Sideboard, Ein/Aus, Display, Stereo-Lautsprecher, Stream). Titelanzeige.

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

**Titel:** Darunter steht der aktuelle Titel (zu lang → „…“). Das Audio-Element liefert keine Titelinfos, deshalb fragt `radio-metadata.js` den Stream zusätzlich mit `Icy-MetaData: 1` an, liest nur den ersten Metadatenblock (`StreamTitle`) und bricht ab. Das braucht CORS-Freigabe von `icy-metaint`; sonst bleibt es bei Sender und „LIVE“.

**Der Titel stört den Ton nie:** Er ist eine Nebensache und läuft unabhängig vom Audio. Er fragt erst 8 s nach dem Einschalten, nur solange der Ton läuft und der Tab sichtbar ist, nie zwei Anfragen gleichzeitig, jede mit 8 s Zeitlimit, alle 30 s, nach jedem Fehler doppelt so lange (bis 5 min) und gibt nach 4 Fehlern in Folge leise auf (bis das Radio neu eingeschaltet wird). Die Zeitwerte stehen in `radio-constants.js` (`RADIO_METADATA_*`). Die Fehlermeldung „Fetch failed loading“ in der Konsole kommt vom Browser bei so einer fehlgeschlagenen Anfrage und ist harmlos.

## Audio

- **Quelle:** der direkte AAC-Stream (`RADIO_STREAM_URL`). Die HLS-Playlist (`.m3u8`) wird nicht genutzt, weil sie außerhalb von Safari eine Zusatzbibliothek braucht.
- **Zwei Lautsprecher:** Der Stream wird in linken und rechten Kanal getrennt. Jeder Kanal kommt aus einem eigenen Lautsprecher links und rechts im Radio (±15 cm). Ein Mono-Stream läuft auf beiden. Hörer ist die Kamera: Richtung und Abstand zum Radio ändern Panorama und Lautstärke, bis 2,5 m volle Lautstärke, danach leiser.
- **Fallback:** Erlaubt der Server keine Audio-Verarbeitung von einer anderen Domain (CORS), wird der Stream ohne Raumklang abgespielt; die Lautstärke folgt dann nur dem Abstand. Das gilt nur, wenn der Fehler **vor dem ersten Ton** kommt; reißt ein laufender Stream ab, ist das ein Verbindungsabbruch und der Raumklang bleibt.
- **Selbstheilung:** Ein Live-Stream bricht ab und zu ab (Netz, Server, schlafender Tab). Das Radio merkt es (Fehler, Ende, Stillstand ohne Fortschritt über 8 s, eine Verbindung, die nach 20 s nicht kommt) und verbindet sich **von selbst neu**, solange es eingeschaltet ist: Pausen von 1, 2, 4, 8, 15, 30 s (`RADIO_RETRY_DELAYS`); nach 3 Abbrüchen in Folge zeigt die Skala „Kein Signal“, es versucht aber weiter. Lief der Ton danach mindestens 10 s, zählt der nächste Abbruch wieder als erster. Kommt man in den Tab zurück oder ist das Netz wieder da, wird sofort neu versucht. Das alles liegt in `radio-audio.js`.
- **Lautstärke:** `RADIO_VOLUME`, `RADIO_REF_DISTANCE`, `RADIO_ROLLOFF` in `radio-constants.js`.

## Offene Punkte

- **Rechte:** Dürfen wir den Stream im Spiel nutzen (Nutzungsbedingungen des Senders)?
- **Referenzfoto:** Es liegt nicht im Repo (Bildrechte ungeklärt).
- **Touch:** Das Anklicken des Knopfes geht mit der Maus, nicht per Antippen.

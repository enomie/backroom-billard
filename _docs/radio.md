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
- **Im Mehrspieler gehört das Radio dem Raum (umgesetzt):** Der Knopf schaltet **für alle** im Raum ein oder aus (Tabelle `radio`, Aktion `set_radio`; kein Eintrag = an). **Jeder** darf, aber höchstens alle **5 Sekunden** (wer zu früh drückt, sieht „Das Radio wurde gerade erst umgeschaltet.“). Die anderen sehen die Meldung „Anna hat das Radio ausgeschaltet“. Wer neu kommt, bekommt den Stand sofort; gehen alle, ist es für den Nächsten wieder an. Der Ton selbst kommt weiter bei jedem aus dem eigenen Stream (nur der Schalter ist geteilt). Im Einzelspiel bleibt der Knopf rein lokal.
- **Nur für mich aus:** Im Einstellungs-Panel unter „Radio“ steht der Knopf **Radio nur für mich aus** / **Radio für mich wieder an**: kein Ton bei diesem Gast, obwohl das Radio des Raums läuft (bleibt im Browser, `backroom-billard.radio-muted`).
- **Start:** Browser erlauben Ton erst nach einer Nutzeraktion. Das ist der Klick auf **Confirm Age 18+** im Startscreen: Er schaltet den Ton frei (`unlockAudio` in `audio.js`) und startet das Radio. Ein anderer Tastendruck oder Klick startet es nicht. Das Radio ist von Anfang an „an“, die Skala zeigt bis zur Bestätigung **KLICK ZUM STARTEN**.

## Sender: Jazz24

Der Sender heißt **Jazz24** ([jazz24.org](https://www.jazz24.org/)); spenden kann man dort: [jazz24.org/donate](https://www.jazz24.org/donate), mehr über sie: [jazz24.org/about](https://www.jazz24.org/about). **Dieses Spiel ist nicht von Jazz24**, es spielt nur ihren öffentlichen Stream. Im **Einstellungs-Panel** steht dazu ein kleiner Abschnitt „Radio“ („Du hörst gerade Jazz24. Dieses Spiel ist nicht von ihnen …“) mit den Links **Spenden** und **Über Jazz24** (öffnen in einem neuen Tab); Der Name steht in `radio-constants.js`, die Adressen und Texte in `index.html` und `src/i18n`.

## Display

Die Skala zeigt den **Sender (Jazz24)** und den **Zustand**: *Klick zum Starten*, *Verbinde…*, *Live*, *Kein Signal*. Die Wörter laufen durch `src/i18n`, der Sendername nicht.

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

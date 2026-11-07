# Radio — Konzept

> **Status: nur Konzept, nichts davon ist umgesetzt.** Umgesetzt wird erst, wenn es ausdrücklich beauftragt wird.

Ein altes Röhren-Holzradio im Raum, das Musik spielt und die Stimmung des 80er-Billardcafés trägt.

## Idee

- Das Radio steht auf einem **Sideboard an einer Wand** im Raum.
- Es ist **standardmäßig eingeschaltet**: Skala und Display leuchten, Musik läuft.
- Man kann es **ein- und ausschalten**, indem man den Schalter am Radio **anklickt**.
- Das Radio hat ein **Display** (siehe unten), das die **Playlist** bzw. den laufenden Titel zeigt.

## Aussehen (als Mesh-Modell, nach dem Referenzfoto)

Vorbild ist ein altes Holzradio aus den 50er/60er Jahren (Referenzfoto liegt nicht im Repo, da Bildrechte ungeklärt):

- **Gehäuse:** dunkles Nussbaum-/Furnierholz, leicht abgerundete Kanten, kleine Füße.
- **Oben:** große **Lautsprecherbespannung** aus goldbeigem Gewebe mit feinem Gittermuster, von einem hellen Rahmen eingefasst.
- **Darunter:** schwarze **Skalenfläche** mit feiner Frequenzskala und Beschriftung — hier sitzt das Display.
- **Links und rechts:** je ein runder **Drehknopf**, creme/metallisch mit Rändelung.
- **Kleine Kontrolllampe** (rund, grünlich) an der Skala.
- **Unten:** eine Leiste mit **Tasten** (Klaviertasten, creme/messing), mittig eine schmale Messingblende.
- Gebaut wird es als **eigenes Mesh aus Grundformen** (kein importiertes Modell), im selben Stil wie der Tisch.

Das **Sideboard** darunter ist ein einfaches Holzmöbel passend zum Rahmen des Tischs (grob 1,4 × 0,45 × 0,8 m, Radio ca. 0,55 × 0,3 × 0,28 m).

## Bedienung

- **Ein/Aus:** ein Schalter bzw. Knopf am Radio, den man mit der Maus **anklickt** (Klick auf das 3D-Objekt).
- Ein: Skala leuchtet warm, Musik spielt, Display zeigt den Titel. Aus: alles dunkel, Stille.
- Weitere Knöpfe (Lautstärke, Sender) sind **nicht** gefordert.

## Display

- Zeigt auf der Skalenfläche den **Sender** und die **Playlist** bzw. den **aktuellen Titel** (Interpret, Titel).
- Leuchtet nur bei eingeschaltetem Radio.
- Texte der Oberfläche (z. B. „Aus“) laufen durch `src/i18n`; Sender- und Titelnamen sind Daten und werden nicht übersetzt.

## Quellen

Zwei direkte Links zum Sender (laut URL KNKX):

| Art | Link |
|-----|------|
| Direkter Stream, AAC 256k | `https://knkx-live-a.edge.audiocdn.com/6285_256k` |
| Playlist (HLS, AAC 256k) | `https://knkx-live-a.edge.audiocdn.com/6285_256k/playlist.m3u8` |

## Technische Hinweise (Ideen, noch nicht entschieden)

- **Direkter Stream:** läuft in jedem Browser über ein normales Audio-Element.
- **HLS-Playlist (`.m3u8`):** nur Safari spielt sie nativ, sonst bräuchte man eine Bibliothek (z. B. hls.js).
- **Autoplay:** Browser erlauben Ton erst **nach der ersten Nutzeraktion** (Klick oder Taste). „Standardmäßig eingeschaltet“ heißt daher: das Radio ist im Zustand „an“ (Display leuchtet), der Ton startet beim ersten Klick im Spiel.
- **Räumlicher Ton:** Die Lautstärke könnte mit dem Abstand zum Radio sinken (3D-Audio).
- **Titelinfos:** Ob und wie der Stream Interpret und Titel liefert (z. B. über Stream-Metadaten), ist noch zu klären.

## Offene Punkte

- An welcher Wand und wie weit vom Tisch steht das Sideboard (damit man das Radio sieht, ohne dass es stört)?
- Woher kommen die Titelinfos für das Display?
- Dürfen wir den Stream im Spiel nutzen (Nutzungsbedingungen des Senders)?
- Wird das Referenzfoto später in die Docs aufgenommen (Rechte klären)?

# Sound — Konzept

> **Status: umgesetzt.** Alle hier beschriebenen Klänge gibt es: Stoß-Animation, Abstoß, Kugel–Kugel, Bande, Rollen und Becher. Unter „Offene Punkte“ stehen nur noch Feinheiten. Unabhängig vom Radio (`radio.md`).

## Umgesetzt

Code: `src/shot-sounds.js` (Stoß-Klänge), `src/collision-sounds.js` (Kugel–Kugel, Bande), `src/cup-sounds.js` (Tasche und Becher), `src/rolling-sound.js` (Rollen), `src/synth-utils.js` (gemeinsame Hilfen), `src/audio.js` (gemeinsamer Audio-Kontext), Werte in `src/sound-constants.js`.

### Stoß-Animation

- **Zurückziehen:** Gleiten der Hand auf dem Schaft, gefiltertes Rauschen mit rauer Textur, am lautesten in der Mitte der Bewegung. Es gibt 3 Längen (0,3 / 0,45 / 0,6 s) mit je 2 Varianten; die nächstliegende Länge wird leicht gestreckt, damit sie zur Zugdauer passt. Dazu ein sehr leises **Einatmen**.
- **Vorschnalzen:** Luftzug, dessen Tonhöhe und Lautstärke ansteigen und der **genau im Moment des Treffens** am lautesten ist und abrupt endet. 3 Stufen (weich, mittel, hart, mit zunehmender Helligkeit) mal 2 Varianten. Dazu ein kurzes, leises **Ausatmen** (Atem lässt sich mit `BREATH_ENABLED` abschalten).
- **Kraftabhängig:** Lautstärke wächst mit der Stoßkraft (Luftzug quadratisch), dazu eine zufällige Tonhöhe von ±5 %.
- **Gebuffert:** Die Klänge werden beim ersten Stoß einmal erzeugt (ca. 100 ms) und danach nur noch abgespielt.
- **Autoplay:** Der Audio-Kontext startet mit dem ersten Stoß (Klick oder Taste).
- **Abstoß** (Spitze trifft Kugel, im Moment des Treffens): kurzer „Tock“ aus einem Anschlagsklick (ca. 1,5 ms), dem Klingen der Kugel (hohe, schnell abklingende Anteile), der Schaft-Resonanz und einem leisen tiefen Schlag. 4 Kraftstufen mal 3 Varianten: weich = dumpfer und mit mehr tiefem Anteil, hart = heller und schärfer; Länge etwa 30–50 ms. Lautstärke wächst mit der Kraft. Der frühere einfache Computer-Ton ist ersetzt und entfernt.

### Kollisionen
- **Kugel–Kugel:** heller, harter „Klack“: ein scharfer, breitbandiger Kontakt-Klick, dazu ein kurzer holzig-glasiger Körper aus mehreren unharmonischen Schalen-Moden (jede leicht gespalten, so schwebt der Klang wie eine echte Kugel und piept nicht wie ein reiner Ton) und ein kleines tiefes Pochen; bei harten Stößen heller und mit leichter Sättigung. 5 Kraftstufen mal 4 Varianten.
- **Kugel–Bande:** dumpferer „Thump“ (tiefe Anteile um 200–400 Hz, ca. 70–80 ms, gedämpfter Klick). 4 Kraftstufen mal 3 Varianten.
- **Lautstärke und Helligkeit** folgen der **Aufprallgeschwindigkeit** entlang der Kollisionsrichtung (leiser als 0,06 m/s ist stumm, 4,5 m/s ist am lautesten), dazu zufällige Tonhöhe.
- **Kugel–Kugel erkennen:** Rapier meldet nur *neue* Kontakte. Im Dreieck berühren sich die Kugeln aber schon, ein Stoß würde also lautlos durchlaufen. Deshalb prüft das Spiel nach jedem Physikschritt berührende Kugelpaare: Näherten sie sich vorher und stoppen/trennen sie sich nachher, ist das ein Treffer. Der Anstoß erzeugt so mehrere Klacks nacheinander. Bande nutzt die Kollisionsereignisse von Rapier (Geschwindigkeitsänderung der Kugel).
- **Entprellen:** Pro Kugelpaar bzw. Kugel 50 ms Sperre und höchstens 8 gleichzeitige Klänge pro 40 ms, damit der Anstoß nicht ratterte.

### Rollen
- **Sehr leises** Rauschen („Schhh“): eine nahtlos geloopte Rauschdatei durch einen Tiefpass. Eine Mischung für alle Kugeln, kein Klang pro Kugel.
- **Pegel:** höchstens 0,05 (`ROLL_GAIN_MAX`). Lautstärke und Helligkeit folgen der Summe der Geschwindigkeiten aller rollenden Kugeln auf dem Tisch; bei Stillstand wird es sanft ausgeblendet. Gemessen: 0,0125 bei 0,4 m/s, 0,035 bei 3 m/s, 0 im Stillstand.

### Tasche und Becher
- **Lochkante:** kurzes, leises „Tick“, sobald eine Kugel über der Öffnung zu fallen beginnt, dazu das weiche **Rutschen** ins Dunkle (0,2 s). Die Stärke folgt der Rollgeschwindigkeit.
- **Aufprall am Becherboden:** dumpfer Schlag (Leder auf Holz) mit **zwei kleinen Nachhüpfern** und kurzem, leisem Ausrollen (0,55 s). 3 Kraftstufen mal 2 Varianten, nach Fallgeschwindigkeit. Da die Kugel nach dem Aufprall aus dem Becher gelöscht wird, stecken Nachhüpfer und Ausrollen im Klang selbst.
- **Becherwand:** gedämpfter „Tok“ (dumpfer als Kugel–Kugel), bei jedem Anstoß an die Wand nach Aufprallgeschwindigkeit (3 Stufen mal 2 Varianten).
- Der Fall in die Tasche ergibt bei einem Test in der Seitentasche genau diese Folge: Rand-Tick, Rutschen, Becherwand, Becherboden.

Der Rest dieser Seite ist das Konzept für die übrigen Klänge.

## Ausgangslage

- Es gibt **einen einzigen Ton**: den Stoß-Klang (`playClackSound` in `src/billard.js`). Er besteht aus einem einzelnen Oszillator mit fallender Tonhöhe und **klingt nach Computer**.
- Kugel–Kugel- und Kugel–Bande-Klänge gab es nur in der alten Physik. Seit der Umstellung auf Rapier **fehlen sie komplett**.
- Rollen, Taschen, Becher und der Cue haben keinen Klang.

## Ziel

Ein **natürlicher, dichter Klang** für alle Billard-Geräusche, **kraftabhängig** und mit kleiner Zufallsvariation, damit sich nichts wie dieselbe Aufnahme wiederholt.

## Grundprinzip: gebufferte, generierte Sounds

- Keine fertigen Aufnahmen, sondern **selbst erzeugte Klänge** (z. B. gefiltertes Rauschen plus gedämpfte Sinus-Anteile für Klack und Dumpfes).
- Sie werden **einmal beim Start erzeugt** und als **Audio-Buffer** gespeichert, danach nur noch abgespielt. Das spart Rechenzeit und klingt stabiler als ein Oszillator pro Treffer.
- Pro Klangart gibt es **mehrere Kraftstufen** (z. B. leise → hart) und **mehrere Varianten**. Beim Abspielen kommen noch **zufällige Tonhöhe und Lautstärke** dazu.
- **Lautstärke und Helligkeit** folgen der Aufprallgeschwindigkeit: harter Treffer = lauter, heller, kürzer; sanfter Treffer = leiser, dumpfer.

## Klänge

### Cue und Stoß
| Ereignis | Beschreibung |
|----------|--------------|
| **Abstoß** (Spitze trifft Kugel) | *Umgesetzt (siehe oben).* Kurzer, harter „Tock“: Lederspitze auf Kugel, mit kleiner Holz-Resonanz des Schafts. |
| **Zurückziehen** | Leises Gleiten der Hand auf dem Schaft (Reibung auf Holz). Dauer und Lautstärke hängen von der Stoßkraft ab. |
| **Vorschnalzen** | Kurzer Luftzug („Wusch“) beim schnellen Vorschnellen des Cues, direkt gefolgt vom Abstoß. Stärker bei mehr Kraft. |
| **Atem / Muskel** (optional) | Leises **Einatmen** beim Zurückziehen und kurzes **Ausatmen** beim Stoß; dazu eventuell ein feines Knarzen von Kleidung/Muskel bei viel Kraft. Nur dezent, keine Stimme. Ob wir das wollen, ist offen. |

Die zugehörige Bewegung steht in `shot-animation.md`.

### Kugeln
| Ereignis | Beschreibung |
|----------|--------------|
| **Kugel–Kugel** | *Umgesetzt (siehe oben).* Heller, harter „Klack“ (Phenolharz auf Phenolharz). Stärke nach der Aufprallgeschwindigkeit entlang der Kollisionsrichtung. Beim Anstoß treffen viele Kugeln fast gleichzeitig, deshalb gibt es ein **Limit gleichzeitiger Stimmen**. |
| **Kugel–Bande** | *Umgesetzt (siehe oben).* Dumpfer, kurzer „Tock/Thump“ (Gummi über Holz), tiefer und weicher als Kugel–Kugel. Stärke nach der Aufprallgeschwindigkeit senkrecht zur Bande. |
| **Rollen** | **Sehr leises** Rollgeräusch auf Filz: tiefes, weiches Rauschen („Schhh“). Lautstärke und Helligkeit steigen mit der Geschwindigkeit, bei Stillstand wird es ausgeblendet. Es soll nur unterschwellig mitlaufen. |

### Taschen und Becher
Der Weg einer Kugel hat mehrere Geräusche, damit es sich **echt** anhört:

1. **Lochkante:** kurzes, leises „Tick“, wenn die Kugel über den Rand rollt.
2. **Fall:** kurzes Rutschen/Fallen ins Dunkle.
3. **Aufprall auf dem Becherboden:** dumpfer Aufschlag (Leder/Holz), je nach Fallgeschwindigkeit; danach ein oder zwei **kleine Nachhüpfer** und leises Ausrollen.
4. **Kugel trifft die Becherwand:** gedämpfter „Klack“, dumpfer als Kugel–Kugel, stärker bei höherer Aufprallgeschwindigkeit.
5. **Kugel trifft eine andere Kugel im Becher:** wie Kugel–Kugel, aber gedämpft.

Die Becher-Klänge sollen **bei jeder Kollision** ausgelöst werden, nicht nur beim ersten Aufprall.

## Technik (Ideen, noch nicht entschieden)

- **Web Audio API**: Buffer per `OfflineAudioContext` oder direkt aus berechneten Samples erzeugen; Abspielen über `AudioBufferSourceNode`.
- **Auslöser** liefert die Physik: Rapier meldet Kollisionen (Kontakte mit Geschwindigkeit/Kraft). Heute gibt es nur das Event „Kugel trifft Becherboden“; für Kugel–Kugel, Bande und Becherwand braucht es mehr Kollisionsereignisse.
- **Stimmenlimit** und kurze Sperrzeit pro Kugelpaar, damit Dauerberührung nicht rattert.
- **Autoplay:** Browser erlauben Ton erst nach der ersten Nutzeraktion; der Audio-Kontext startet beim ersten Klick/Tastendruck.
- **Raum:** Der große, dunkle Raum könnte einen kurzen, leisen **Hall** bekommen; optional **3D-Ton** (Lautstärke/Panorama nach Position der Kamera).
- **Bedienung:** Ein Stumm-Schalter und eine Lautstärkeregelung in der Oberfläche (Texte über `src/i18n`).

## Offene Punkte

- *Kugel trifft Kugel im Becher* gibt es nicht, weil versenkte Kugeln sofort aus dem Becher gelöscht werden.
- Atem- und Muskelgeräusche: ja oder nein, und wie stark?
- Wie viele Kraftstufen und Varianten pro Klang (Speicher gegen Qualität)?
- Soll das Rollen pro Kugel oder als ein Gesamt-Mix klingen?
- Raumhall und 3D-Ton: gewollt?
- Lautstärke-Mix gegenüber dem Radio (`radio.md`).

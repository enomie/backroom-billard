# Sound — Konzept

> **Status: nur Konzept, nichts davon ist umgesetzt.** Umgesetzt wird erst, wenn es ausdrücklich beauftragt wird. Unabhängig vom Radio (`radio.md`).

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
| **Abstoß** (Spitze trifft Kugel) | Kurzer, harter „Tock“: Lederspitze auf Kugel, mit kleiner Holz-Resonanz des Schafts. Bei wenig Kraft weicher und leiser, bei viel Kraft heller und lauter. Ersetzt den heutigen Computer-Ton. |
| **Zurückziehen** | Leises Gleiten der Hand auf dem Schaft (Reibung auf Holz). Dauer und Lautstärke hängen von der Stoßkraft ab. |
| **Vorschnalzen** | Kurzer Luftzug („Wusch“) beim schnellen Vorschnellen des Cues, direkt gefolgt vom Abstoß. Stärker bei mehr Kraft. |
| **Atem / Muskel** (optional) | Leises **Einatmen** beim Zurückziehen und kurzes **Ausatmen** beim Stoß; dazu eventuell ein feines Knarzen von Kleidung/Muskel bei viel Kraft. Nur dezent, keine Stimme. Ob wir das wollen, ist offen. |

Die zugehörige Bewegung steht in `shot-animation.md`.

### Kugeln
| Ereignis | Beschreibung |
|----------|--------------|
| **Kugel–Kugel** | Heller, harter „Klack“ (Phenolharz auf Phenolharz). Stärke nach der Aufprallgeschwindigkeit entlang der Kollisionsrichtung. Beim Anstoß treffen viele Kugeln fast gleichzeitig, deshalb gibt es ein **Limit gleichzeitiger Stimmen**. |
| **Kugel–Bande** | Dumpfer, kurzer „Tock/Thump“ (Gummi über Holz), tiefer und weicher als Kugel–Kugel. Stärke nach der Aufprallgeschwindigkeit senkrecht zur Bande. |
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

- Atem- und Muskelgeräusche: ja oder nein, und wie stark?
- Wie viele Kraftstufen und Varianten pro Klang (Speicher gegen Qualität)?
- Soll das Rollen pro Kugel oder als ein Gesamt-Mix klingen?
- Raumhall und 3D-Ton: gewollt?
- Lautstärke-Mix gegenüber dem Radio (`radio.md`).

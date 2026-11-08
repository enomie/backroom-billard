# Sound

> **Status: umgesetzt.** Alle Klänge sind generiert (keine Aufnahmen). Weitere Klänge: Radio (`radio.md`), Rauchen und Feuerzeug (`cigarettes.md`), Trinken (`glass-objects.md`).

## Code

`src/shot-sounds.js` (Stoß-Klänge), `src/collision-sounds.js` (Kugel–Kugel, Bande), `src/cup-sounds.js` (Tasche und Becher), `src/rolling-sound.js` (Rollen), `src/synth-utils.js` (gemeinsame Hilfen), `src/audio.js` (gemeinsamer Audio-Kontext), Werte in `src/sound-constants.js`; Klänge für Rauchen, Feuerzeug und Trinken in `smoke-sounds.js`, `lighter-sounds.js`, `drink-sounds.js`.

### Stoß-Animation

- **Zurückziehen:** Gleiten der Hand auf dem Schaft, gefiltertes Rauschen mit rauer Textur, am lautesten in der Mitte der Bewegung. Es gibt 3 Längen (0,3 / 0,45 / 0,6 s) mit je 2 Varianten; die nächstliegende Länge wird leicht gestreckt, damit sie zur Zugdauer passt. Dazu ein sehr leises **Einatmen**.
- **Vorschnalzen:** Luftzug, dessen Tonhöhe und Lautstärke ansteigen und der **genau im Moment des Treffens** am lautesten ist und abrupt endet. 3 Stufen (weich, mittel, hart, mit zunehmender Helligkeit) mal 2 Varianten. Dazu ein kurzes, leises **Ausatmen** (Atem lässt sich mit `BREATH_ENABLED` abschalten).
- **Kraftabhängig:** Lautstärke wächst mit der Stoßkraft (Luftzug quadratisch), dazu eine zufällige Tonhöhe von ±5 %.
- **Gebuffert:** Die Klänge werden beim ersten Stoß einmal erzeugt (ca. 100 ms) und danach nur noch abgespielt.
- **Autoplay:** Der Audio-Kontext startet mit dem ersten Stoß (Klick oder Taste).
- **Abstoß** (Spitze trifft Kugel, im Moment des Treffens): kurzer „Tock“ aus einem Anschlagsklick (ca. 1,5 ms), dem Klingen der Kugel (hohe, schnell abklingende Anteile), der Schaft-Resonanz und einem leisen tiefen Schlag. 4 Kraftstufen mal 3 Varianten: weich = dumpfer und mit mehr tiefem Anteil, hart = heller und schärfer; Länge etwa 30–50 ms. Lautstärke wächst mit der Kraft. Der frühere einfache Computer-Ton ist ersetzt und entfernt.

### Kollisionen
- **Kugel–Kugel:** harter Rausch-Klick (Kontakt) plus vier Schwingungsmoden der Phenolharzkugel (520 / 3250 / 5600 / 8150 Hz, siehe `BALL_HIT_MODES`), jeder fällt exponentiell ab und sinkt leicht in der Tonhöhe. Je härter der Stoß, desto heller der Klick, desto stärker klingen die hohen Moden und desto länger klingen alle (Faktor 0,75 bis 1,25). Länge ca. 80 ms. 5 Kraftstufen mal 4 Varianten.
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

## Positionen

Jeder Klang kommt von dem Ort, an dem er entsteht, und die Kamera ist der Hörer (`playBuffer` mit `position`, Panner mit sanftem Abfall, `SOUND_REF_DISTANCE` und `SOUND_ROLLOFF`): Kugel–Kugel am Berührpunkt, Bande, Tasche und Becher an der Kugel, der Abstoß an der Weißen, Zurückziehen und Vorschnalzen am Cue, das Atmen am Kopf des Spielers. Das Rollen kommt vom geschwindigkeitsgewichteten Mittelpunkt der rollenden Kugeln. Der Hörer wird in `audio.js` gesetzt (`updateAudioListener`, nur wenn sich die Kamera bewegt hat), auch das Radio nutzt ihn.

## Grundprinzip: gebufferte, generierte Sounds

- Keine fertigen Aufnahmen, sondern **selbst erzeugte Klänge** (z. B. gefiltertes Rauschen plus gedämpfte Sinus-Anteile für Klack und Dumpfes).
- Sie werden **einmal beim Start erzeugt** und als **Audio-Buffer** gespeichert, danach nur noch abgespielt. Das spart Rechenzeit und klingt stabiler als ein Oszillator pro Treffer.
- Pro Klangart gibt es **mehrere Kraftstufen** (z. B. leise → hart) und **mehrere Varianten**. Beim Abspielen kommen noch **zufällige Tonhöhe und Lautstärke** dazu.
- **Lautstärke und Helligkeit** folgen der Aufprallgeschwindigkeit: harter Treffer = lauter, heller, kürzer; sanfter Treffer = leiser, dumpfer.

## Offene Punkte

- *Kugel trifft Kugel im Becher* gibt es nicht, weil versenkte Kugeln sofort aus dem Becher gelöscht werden.
- Raumhall: gewollt? Stumm-Schalter und Lautstärkeregelung in der Oberfläche?
- Lautstärke-Mix gegenüber dem Radio (`radio.md`).

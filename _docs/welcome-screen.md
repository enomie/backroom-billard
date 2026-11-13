# Welcome-Screen (Spielart, Konto, Karte)

> **Status: umgesetzt.** Dieser Screen kommt **nach dem Startscreen** (Alterbestätigung, siehe README) und **vor dem Spiel**, bei jedem Besuch. Der Umbau ist in [`konto-umbau.md`](konto-umbau.md) beschrieben, die Regeln für das Geld in [`multiplayer.md`](multiplayer.md).

Das Spiel lädt wie beim Startscreen im Hintergrund weiter; der Screen blendet aus, wenn das Spiel gestartet ist (bei Mehrspieler erst, wenn der Raum eingerichtet ist). Alle Texte laufen durch `src/i18n` (Englisch und Deutsch).

## Ablauf

1. **Spielart:** Titel „Wie willst du spielen?“, zwei große Knöpfe: **Einzelspiel** (offline) und **Mehrspieler**.
2. **Nur Mehrspieler: das Konto.**
   - Hat der Browser schon einen Schlüssel, wird **sofort angemeldet** (Spinner auf dem Knopf) und es geht zur Karte; kennt die Datenbank den Schlüssel nicht (mehr), landet man bei „Neu hier“.
   - **Neu hier:** Name (drei Felder), Land, Gesicht. **Weiter** legt das Konto an (15.000 $) und zeigt den **Schlüssel einmal groß** (Knopf **Kopieren**, „Gespeichert“).
   - **Ich habe einen Schlüssel:** Der Schlüssel wird eingegeben (Großbuchstaben, Gruppen, Leerzeichen und Striche egal); das Konto kommt samt Name, Land, Gesicht und Geld von der Datenbank, ein anderes Gerät mit demselben Konto wird **ausgeloggt**. Hat der Browser **schon ein anderes Konto**, steht davor eine **Warnung** (es wird aufgegeben, sein Geld ist weg, wenn sein Schlüssel nicht gespeichert ist) und der Knopf heißt dann „Trotzdem anmelden“.
3. **„Was darf es sein?“** (en: „What'll it be?“), die Karte der Bar, mit dem **Geld der Spielart** oben. Bier und **Premium Blend** sind **vorgewählt**, danach das, was zuletzt gewählt war. Knöpfe: **Zurück**, **Neu anfangen**, im Mehrspieler **Anderes Konto**, und **Los** (en: Start).

## Einzelspiel

Kein Name, keine Flagge, kein Gesicht, kein Schlüssel, **keine Verbindung**. In der Anzeige und im Einstellungs-Panel steht fest „Einzelspiel“ (en: „Single player“). Das Geld (15.000 $ am Anfang, jede Ausgabe wird sofort gespeichert) und die letzte Wahl liegen im Browser (`backroom-billard.single`, `src/profile-store.js`). Am Billardtisch steht **nur ein Satz** Getränk, Zigaretten, Feuerzeug und Aschenbecher (der Platz auf der +z-Seite).

Ein **älteres Profil** (Name, Land, Gesicht, Geld in einem Eintrag) wird einmal gelesen: sein **Geld** wird das Einzelspiel-Geld, **Name, Land und Gesicht** füllen das Formular „Neu hier“ vor; wenn das Konto angelegt ist, wird es gelöscht.

## Mehrspieler: das Konto

Der Server führt das Konto (Schlüssel, Name, Land, Gesicht, Geld); der Browser merkt sich nur den **Schlüssel** (`backroom-billard.account-key`, `src/account-key.js`) und die **letzte Wahl an der Bar**. **Name, Land und Gesicht sind danach nicht mehr änderbar** (auch nicht in den Einstellungen); ändern geht später nur gegen echtes Geld, bis dahin ist nichts davon gebaut. Die Anmeldung kommt vor der Karte (zum Anzeigen des Geldes), der **Raum** wird erst mit **Los** betreten.

- **Schlüssel:** 20 Zeichen aus 32 (ohne I, O, 0, 1) in fünf Gruppen, z. B. `K7Q2-9XPD-4MTR-8WNA-3FJH`, vom Browser gewürfelt. Es gibt **keine Wiederherstellung** (kein Login, keine E-Mail).
- **Neu anfangen** (auf der Karte): Einzelspiel: das Geld ist wieder 15.000 $. Mehrspieler: das Konto wird aufgegeben (sein Schlüssel bleibt für den gültig, der ihn gespeichert hat), und man beginnt bei „Neu hier“ ein neues mit neuem Schlüssel. Davor kommt eine Frage.
- **Anderes Konto** (nur Mehrspieler): führt zu „Ich habe einen Schlüssel“.
- **Ohne Verbindung:** Beim Anmelden erscheint eine rote Meldung („Der Raum konnte nicht eingerichtet werden …“); man kann es noch einmal versuchen oder zurückgehen und allein spielen.

## Name: drei Felder (nur „Neu hier“)

| Feld | Pflicht | Beschriftung (en / de) |
|------|---------|------------------------|
| Vorname | ja | First name / Vorname |
| Zweiter Name | **nein** (darf leer bleiben) | Middle name / Zweiter Name |
| Nachname | ja | Last name / Nachname |

- **Am PC nebeneinander**, **am Handy untereinander**.
- **Erlaubt:** nur **Buchstaben** (alle Schriften und Akzente), der **Punkt `.`** und der **Bindestrich `-`**. Alles andere wird beim Tippen gar nicht angenommen. Doppelnamen gehen mit Bindestrich: „Anna-Lena“.
- **Form:** Ein Bindestrich nicht am Anfang oder Ende und nicht doppelt, ein Punkt nur nach einem Buchstaben und nicht doppelt; mindestens ein Buchstabe pro ausgefülltem Feld; **höchstens 10 Zeichen je Feld**. Die Datenbank prüft dasselbe.
- **Groß- und Kleinschreibung:** Der erste Buchstabe jedes Namensteils (und nach einem Bindestrich) wird automatisch groß („mario“ → „Mario“), der Rest bleibt, wie getippt („McDonald“).
- **Enter** springt zum nächsten Feld, im letzten löst es **Weiter** aus (wenn alles gültig ist).

**Zweiter Name:** als Initiale (`T.`) oder ausgeschrieben (`Theodor`). Gezeigt wird im Spiel **„Anna T. Meier“** (Vorname, Initiale, Nachname; `displayName(…, "short")` in `name-rules.js`, die Kurzform: erster Buchstabe groß plus Punkt, bei Doppelnamen je Teil: `Jean-Luc` → `J.-L.`). Voll („Anna Theodor Meier“) und als Initialen („A. T. M.“) gibt es auch, wird aber noch nicht gebraucht.

## Gesicht und Land (nur „Neu hier“)

- **Gesicht (Facegenerator, bewusst einfach):** Eine Vorschau (kleines flaches SVG, `src/face.js`) mit **einem** Knopf **Zufall**. Es gibt **keinen** Bestätigungsknopf: **Das gezeigte Gesicht gilt**. Gewürfelt wird **aus kleinen Paletten**: 8 **Hauttöne**, 8 natürliche **Haarfarben** und mit 20 % Chance eine **lustige** (blau, grün, orange, pink, lila), 6 **Augenfarben**; die **Haarfarbe gilt für Haar, Bart und Augenbrauen**. **Formen:** die **Breite**, 6 Frisuren (von kahl bis lang), 3 Nasen, 3 Augenbrauen und der **Bart** (in 55 % der Fälle **keiner**). Das Gesicht ist **starr** (keine Mimik). Als Kugel mit Nase und Augen schwebt es im Raum (`face-ball.js`, siehe [`multiplayer.md`](multiplayer.md)).
- **Land:** Man wählt das Land, **für das man spielen will oder dem man sich zugehörig fühlt**, aus einer **Dropdown-Liste mit Suche** (Tippen filtert; Namen in der Sprache der Oberfläche). **Standard: Österreich** (`at`). Die Liste hat **nur die Länder, zu denen es eine (runde) Flagge gibt**: 42 Länder (`src/country-list.js`, Flaggen in `public/flags/{iso}.svg`). Gesucht wird ohne Akzente und Groß-/Kleinschreibung; Pfeiltasten und Enter wählen, Esc und ein Klick daneben schließen die Liste.

## „Was darf es sein?“: die Karte

Ein **Getränk** aus den zehn und eine **Packung Zigaretten** aus den zwei (**Premium Blend** schwarz/rot/gold, **Light Blend** weiß/blau). Die Zahl oben sinkt **sofort** beim Auswählen; wer zurückwählt, bekommt es zurück; nicht bezahlbare Einträge sind grau. Preise: `DRINK_MENU` und `PACK_PRICE` in `shop-constants.js` (Bier 8 $, Rot- und Weißwein 14 $, Gin Tonic 15 $, White Russian 16 $, Achterl Vodka 16 $, Cocktail 17 $, Whiskey 18 $, Champagner 22 $, Cognac 24 $, Packung 75 $); die Preise im Modul müssen dieselben sein.

- **Bezahlt wird mit Los:** im Einzelspiel vom Geld im Browser, im Mehrspieler über `buy` vom Konto auf dem Server.
- **Pleite:** Reicht das Geld nicht für eine Wahl, **darf man trotzdem spielen** (es steht ein Hinweis da): Was er nicht bezahlen kann, bleibt leer (leeres Glas, Packung ohne Zigaretten) und lässt sich auch im Spiel nicht kaufen. **Setzen** darf er mit „alles, was er hat“.

## Einstellungs-Panel

Zeigt oben den Namen (Mehrspieler: der Name des Kontos, Einzelspiel: „Einzelspiel“) und das Guthaben; im Mehrspieler darunter die Knöpfe **Spielgeld kaufen** und **Name oder Gesicht ändern** (sie tun noch nichts und sagen nur „Kommt später“, das soll später echtes Geld kosten); es scrollt innen, wenn es länger ist als der Bildschirm (der Kopf mit Titel und Kreuz bleibt stehen).

## Umsetzung

| Datei | Inhalt |
|-------|--------|
| `src/welcome-screen.js` | Die vier Schritte (Spielart, Konto, Schlüssel, Karte) |
| `src/account-key.js` | Schlüssel würfeln, in `localStorage` merken, Eingabe normalisieren |
| `src/profile-store.js` | Der Geldbeutel des Einzelspiels, die letzte Wahl im Mehrspieler, das alte Profil lesen |
| `src/name-rules.js` | Filtern beim Tippen, Fertigstellen, Prüfen, Kurzform; Beispiele in `_Scripts/test-name-rules.mjs` (`npm test`) |
| `src/face.js`, `src/country-list.js` | Das Zufallsgesicht; die Länder mit runder Flagge |
| `src/entry.js` | Ablauf: Startscreen, Welcome, Spiel (`loginMulti` und `startGame` in `billard.js`) |
| `src/wallet.js` | Das Geld: im Einzelspiel im Browser, im Mehrspieler die Zahl des Servers |
| `src/glasses.js`, `src/cigarette-pack.js` | Das erste volle Glas und die erste Packung am Platz des Spielers |

## Offene Fragen

- Wo erscheint der Name sonst im Spiel (Rangliste kommt mit [`konto-umbau.md`](konto-umbau.md))? Die kurzen Formen (`displayName`) liegen bereit.

# Umbau: Spielart zuerst, Konto auf dem Server (Plan)

> **Status: Plan, nichts davon ist umgesetzt.** Die Regeln stehen in [`multiplayer.md`](multiplayer.md) (Abschnitt „Geld im Mehrspieler“) und [`welcome-screen.md`](welcome-screen.md) (Abschnitt „Neuer Ablauf“); hier stehen die **Schritte**. Jeder Schritt lässt das Spiel lauffähig und wird geprüft, bevor der nächste beginnt. Wo das Modul neu veröffentlicht werden muss, steht es dabei.

## Ziel in Kürze

- Nach dem Startscreen: **Einzelspiel** oder **Mehrspieler**. Einzelspiel ohne Namen, Flagge, Gesicht und Schlüssel, Geld im Browser. Mehrspieler mit **Konto auf dem Server** (Schlüssel, Name, Land, Gesicht, Geld).
- Die Karte **„Was darf es sein?“** (Getränk und Zigaretten, Bier und Premium Blend vorgewählt) kommt zuletzt.
- Im Mehrspieler rechnet nur noch der **Server** mit Geld: Käufe, Einsatz (Treuhand), Gewinn, Obergrenze, Rangliste.

## Datenmodell (Modul)

| Tabelle | Inhalt | Sichtbar |
|---------|--------|----------|
| `account` | `key` (Primärschlüssel, der geheime Schlüssel), `money`, `name`, `country`, `face`, `createdAt` | privat |
| `link` | `identity` (Primärschlüssel) → `key`: welche Verbindung gerade zu welchem Konto gehört (höchstens eine je Konto) | privat |
| `player` | wie bisher; `money` ist nur noch die **Anzeige** und wird vom Server gesetzt | öffentlich |
| `ranking` | die ersten 100 (Platz, Name, Land, Geld) und je Gast seine eigene Zeile | öffentlich |

- **Schlüssel:** Der **Browser** würfelt ihn (`crypto.getRandomValues`, 20 Zeichen, 100 Bit, in 4er-Gruppen) und schickt ihn mit der Anlage; die Zufallszahlen des Moduls sind vorhersagbar und taugen nicht für ein Geheimnis. Der Server prüft Form und Einmaligkeit.
- **Preise** stehen im Modul (`PRICES`: Bier 8 $ … Packung 75 $) **und** in `shop-constants.js` (Anzeige): bei einer Änderung beide ändern (ein Hinweis steht in beiden Dateien).
- **Obergrenze:** `MAX_MONEY = 100_000_000`.

## Schritte

### 1. Modul: Konto, Anmeldung, Ausloggen (Tabellen und Aktionen, noch ohne Client) – **umgesetzt**

- `create_account(key, name, country, face)`: prüft Form, Name, Land, Gesicht (wie `checkProfile`), legt `account` mit 15.000 $ und `link` an.
- `enter(key)`: hängt die Identität an das Konto (`link`), setzt `player` (mit Name, Land, Gesicht und Geld **vom Konto**), wirft eine bisherige Verbindung desselben Kontos hinaus (ihr `player` und `link` verschwinden; ihr nächster Aufruf wird mit dem Fehler `logged-in-elsewhere` abgelehnt).
- `set_profile` und `set_money` entfallen im Schritt 2 (hier noch da, damit der alte Client weiterläuft).
- Gebaut: Schlüsselform `XXXX-XXXX-XXXX-XXXX-XXXX` (Alphabet ohne I, O, 0, 1), `create_account` und `enter` teilen `joinAccount`; wer ausgeloggt wird, verliert wie ein Spieler, der geht (`finishGame` mit „left“, wenn er am Tisch spielt), und seine Zeilen verschwinden. Der Client ruft beides noch nicht auf.
- **Noch offen für Schritt 2:** `me()` muss prüfen, dass die Verbindung zu einem Konto gehört (`link`); wer ausgeloggt wurde, bekommt `logged-in-elsewhere`, sonst legt der Wiederbeitritt des Clients ihn neu an.
- **Prüfen:** Typcheck (`npm run check`), Veröffentlichen **ohne** `--delete-data` (nur neue Tabellen und Aktionen), das Spiel läuft unverändert.

### 2. Modul: Geld nur noch auf dem Server – **Modul umgesetzt, Client folgt in Schritt 3** (bis dahin nicht veröffentlichen)

- `buy(item)`: Getränk (fünf Arten) oder Packung; Preis aus `PRICES`, zieht ab, lehnt bei zu wenig Geld ab, setzt `player.money`.
- **Treuhand:** `set_ready` zieht bei Spielstart den Einsatz bei beiden vom Konto ab (`agreedStake`, schon vorhanden); `finishGame` schreibt dem Sieger beide Beträge gut (Timeout und Aufgabe eingeschlossen), gedeckelt mit `MAX_MONEY`.
- `set_money` und der Geld-Parameter von `set_profile` werden entfernt; `place_bid`, `set_stake` rechnen mit dem Geld des Kontos.
- **Prüfen:** Typcheck; auf dem Papier alle Fälle durchgehen (Start, Gewinn, Timeout, Aufgabe, zu wenig Geld beim Einsatz, Deckel). **Das Modul und der Client müssen zusammen veröffentlicht werden** (alte Clients rufen entfernte Aktionen auf).

### 3. Client: Verbindung und Geld im Mehrspieler – **umgesetzt** (Modul und Client jetzt zusammen veröffentlichen)

- `multiplayer.js`: `join` mit Schlüssel (erst `create_account`/`enter`, dann der bisherige Ablauf); das Geld der Anzeige kommt aus der eigenen `player`-Zeile; `setMoney` entfällt; neuer Aufruf `buy`; Fehler `logged-in-elsewhere` wird gemeldet („Dieses Konto ist auf einem anderen Gerät angemeldet“) und trennt.
- `wallet.js`: zwei Arten: **Einzelspiel** (wie bisher im Browser) und **Mehrspieler** (Geld aus der Anzeige, `spend` fragt `buy` und zeigt sofort, korrigiert bei Nein). Der Einsatz wird im Browser nicht mehr abgezogen oder gutgeschrieben (die Zeilen in `onMultiplayerGame` entfallen).
- Gebaut: `src/account-key.js` (Schlüssel würfeln, in `localStorage` merken, Eingabe normalisieren). Bis zum Schritt 4 legt der Browser beim ersten Beitritt **selbst** ein Konto mit dem Profil des Welcome-Screens an und meldet sich danach mit dem Schlüssel an (ist er der Datenbank unbekannt, legt er ihn neu an). `wallet.js` kennt jetzt den Server-Modus (`useServer`, `syncBalance`); `spend(preis, ware)` fragt dort `buy`. Der Fehler `logged-in-elsewhere` trennt und meldet „Du wurdest abgemeldet …“ (das Spiel geht allein weiter). Bekannte Übergangslücke bis Schritt 4: Der Welcome-Screen zieht die erste Wahl noch vom Einzelspiel-Geld im Browser ab, und im Mehrspieler wird sie zusätzlich beim Server gekauft.
- **Prüfen:** Build; zwei Browser: Kaufen (Karte und neue Packung), Einsatz und Gewinn, Timeout; die Zahl oben stimmt bei beiden; Neuladen mitten im Spiel kostet nichts.

### 4. Client: der neue Ablauf (Welcome) – **umgesetzt** (Modul und Client zusammen veröffentlichen)

- `profile-store.js`: **Einzelspiel-Profil** (nur `money`, Getränk, Packung) und **Mehrspieler-Gerät** (der Schlüssel; Name, Land, Gesicht stehen auf dem Server und werden beim Beitritt gelesen). Das alte Profil wird einmal gelesen: sein Geld wird das Einzelspiel-Geld, Name, Land, Gesicht füllen „Neu hier“ vor.
- `welcome-screen.js` und `index.html`: **Spielart** → (nur Mehrspieler) **Konto** („Neu hier“ / „Ich habe einen Schlüssel“, Schlüssel einmal anzeigen und kopieren, Warnung beim Wechsel) → **„Was darf es sein?“** (vorausgewählt Bier und Premium Blend; danach das Letzte) mit Geld der Spielart, **Zurück**, **Los**.
- Einzelspiel: Anzeige und Einstellungs-Panel zeigen fest „Einzelspiel“ / „Single player“; kein Gesicht und keine Flagge.
- **Neu anfangen:** je Spielart; im Mehrspieler ein neues Konto mit neuem Schlüssel.
- Alle neuen Texte in `en.js` und `de.js`.
- Gebaut, abweichend vom Plan: Damit der Gast während der Wahl **nicht schon im Raum steht** (und am Tisch sitzt), meldet `enter`/`create_account` nur an und legt eine Zeile in der öffentlichen Tabelle `lobby` an (Name, Land, Gesicht, Geld; so sieht der Client sein Konto für die Karte); **`join_room`** betritt den Raum, erst mit **Los**. Neu im Modul: `lobby`, `join_room`; im Client `multiplayer.login()` und `multiplayer.join()`, in `billard.js` `loginMulti` und `startGame` statt `applyProfile`. Die Übergangslücke aus Schritt 3 (doppelte Abbuchung) ist weg.
- **Prüfen:** Build; alle Wege: Einzelspiel ohne Verbindung, neues Mehrspielerkonto, Schlüssel auf zweitem Gerät (Ausloggen am ersten, Warnung), Verbindung klappt nicht, Zurück, alte Profile.

### 5. Pleite und Dummy-Knöpfe – **umgesetzt** (die Karte und leere Plätze in Schritt 4, die Knöpfe im Einstellungs-Panel)

- Karte: Wer sich Getränk und Packung nicht leisten kann, kommt trotzdem herein (mit dem, was er hat), kann aber nichts mehr kaufen; die Trink- und Rauchtasten tun dann nichts. Setzen mit „alles, was er hat“ geht weiter.
- Dummy-Knöpfe **„Spielgeld kaufen“** und **„Name oder Gesicht ändern“** (tun nichts, nur ein Hinweis „kommt später“).
- **Prüfen:** Konto auf 50 $ setzen (Test im Modul oder per Verlust), Karte, Trinken, Setzen.

### 6. Rangliste – **umgesetzt** (Knopf im Einstellungs-Panel)

- Modul: `refresh_ranking` berechnet die ersten 100 nach Geld (Gleichstand: wer zuerst Konto hatte) und die eigene Zeile jedes Gasts; frühestens alle paar Sekunden neu.
- Client: Panel mit der Liste (Platz, Flagge, Name, Geld). Ist der Spieler nicht unter den ersten 100: eine Zeile „…“ und darunter seine Zeile „Platz 126“. Zu erreichen über einen Knopf (Ort noch festlegen).
- **Prüfen:** mehrere Konten, Platz 1 bis 100 und außerhalb, Gleichstand.

### 7. Aufräumen

- Docs nachziehen (`welcome-screen.md`, `multiplayer.md`, `spacetime/README.md`, `game-concept.md`), Aufräumliste (C) schließen, toten Code entfernen (`set_money`, alte Geldzeilen, nicht mehr gebrauchte Texte und Schlüssel), Bindings neu erzeugen lassen.

## Offene Punkte für die Umsetzung

- Ort des Rangliste-Knopfes (Einstellungs-Panel oder neben der Anzeige).
- Schlüssel verloren: Es gibt keine Wiederherstellung (kein Login, keine E-Mail); das ist gewollt, bis es echtes Bezahlen gibt.
- `rate`-Zeilen und Konten wachsen mit der Zahl der Gäste; Konten ohne Anmeldung seit langer Zeit könnten später aufgeräumt werden (nicht jetzt).

# Billiard (Prototype)

Statischer 3D-Billiard-Prototyp (Three.js): `index.html`, `style.css`, `billiard.js`, Geometrie-/Bauplan des Tischs in `table-blueprint.js`.

## Lokalen Server auf Port 8181 starten

Im Projektordner im Terminal:

```bash
cd /Users/johann/MyBrew/Billiard && python3 -m http.server 8181
```

Im Browser öffnen: **http://localhost:8181/**

**Hinweis:** Port belegen (`Address already in use`): anderen Prozess beenden oder anderen Port wählen und URL anpassen.

**Server beenden:** `Ctrl+C` im Terminal.

### Alternative (Node)

Wenn Node/npm installiert ist:

```bash
cd /Users/johann/MyBrew/Billiard && npx --yes serve -l 8181 .
```

Dann ebenfalls **http://localhost:8181/** (je nach Tool ggf. angezeigte URL prüfen).

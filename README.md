# Orbista (bisher Flaggo)

Länder-Quiz mit 197 Ländern und ihren Hauptstädten, komplett auf Deutsch. Privates Projekt von A Simple Man's Lab. Spielkonzept 2.0 (Hauptstädte, Weltreise, Gamification): https://claude.ai/artifact/UEUFjDKwakqbrAUHwzZ6R5

Themen und Spielarten: Flaggen (Flagge → Land, Land → Flagge, tippen), Hauptstädte (Land → Hauptstadt, Hauptstadt → Land, tippen), Beides (Flagge → Hauptstadt, tippen). Filter nach Weltregion, Runden mit 10, 20 oder allen Fragen. Schwächere Karten kommen häufiger dran, der Fortschritt liegt im Browser (localStorage).

## Bauen und veröffentlichen

```
python3 build.py                                # schreibt orbista.html (Artifact) und web/orbista/index.html
python3 tests/t1.py                             # Playwright bei 390 px: alle Spielarten, Hauptstädte tippen, Übernahme des Flaggo-Stands
python3 web/deploy.py ../mbroyer.github.io/orbista   # App für asimplemanslab.com/orbista
```

Findet Playwright den Browser nicht, den Pfad zu Chromium in `PW_CHROMIUM` setzen.

## Dateien
- `build.py` – baut aus `src/`, `flags/` und `assets/` eine einzige HTML-Datei (Flaggen und Logo eingebettet)
- `src/body.html` – Seitenaufbau (Start, Spiel, Ergebnis)
- `src/style.css` – Design, hell und dunkel über Tokens am Dateianfang
- `src/data.js` – Länder nach Region, deutsche Namen, Hauptstädte, Schreibweisen fürs Tippen
- `src/app.js` – Spiellogik, Fortschritt, Ansichten
- `flags/` – 197 SVG-Flaggen (Quelle: npm-Paket country-flag-icons)
- `assets/` – Logo A Simple Man's Lab
- `web/deploy.py` – legt die gebaute App ins Repo `mbroyer/mbroyer.github.io`, Ordner `orbista/`
- `tests/` – Playwright-Skripte (Viewport 390 px)

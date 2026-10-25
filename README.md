# Orbista (bisher Flaggo)

Länder-Quiz mit 197 Ländern und ihren Hauptstädten, komplett auf Deutsch. Privates Projekt von A Simple Man's Lab. Spielkonzept 2.0 (Hauptstädte, Weltreise, Gamification): https://claude.ai/artifact/UEUFjDKwakqbrAUHwzZ6R5

Beim ersten Start wählt man das Thema (Flaggen, Hauptstädte oder beides) und ein Tagesziel. Danach führt die Startseite: Ein Knopf „Weiterreisen“ stellt die nächste Runde selbst zusammen (fällige Karten zuerst, dann Neues aus der nächsten Region, ab zwei Sternen wird getippt). Darunter lässt sich gezielt üben: Flaggen, Hauptstädte oder Zeitrennen, jeweils nur Region und „Auswählen“ oder „Eintippen“. Runden haben 10 Fragen. Jede Karte (Flagge, Hauptstadt) sammelt bis zu drei Sterne und kommt nach Fälligkeit wieder dran. Dazu XP, Level, Tagesziel, Serie, ab Level 2 das Zeitrennen mit Bestzeiten und einen Reisepass mit Stempeln pro Region. Der Fortschritt liegt im Browser (localStorage).

## Bauen und veröffentlichen

```
python3 build.py                                # schreibt orbista.html (Artifact) und web/orbista/index.html
python3 tests/t1.py                             # Playwright bei 390 px: erster Start, Weiterreisen, gezieltes Üben, Übernahme des Flaggo-Stands
python3 tests/t2.py                             # Sterne, Fälligkeit, XP, Level, Tagesziel, Serie mit Ruhetag
python3 tests/t3.py                             # Zeitrennen: Strafzeit, Bestzeit, Freischaltung
python3 tests/t4.py                             # Reisepass: Sterne, Stempel, Bestzeiten
python3 web/deploy.py ../mbroyer.github.io/orbista   # App für asimplemanslab.com/orbista
```

Findet Playwright den Browser nicht, den Pfad zu Chromium in `PW_CHROMIUM` setzen.

## Dateien
- `build.py` – baut aus `src/`, `flags/` und `assets/` eine einzige HTML-Datei (Flaggen und Logo eingebettet)
- `src/body.html` – Seitenaufbau (Willkommen, Startseite, Gezielt üben, Reisepass, Spiel, Ergebnis)
- `src/style.css` – Design im Stil „Atlas“ (Kartenpapier, Young Serif und IBM Plex Sans, Druckstempel-Knöpfe), hell und dunkel über Tokens am Dateianfang
- `src/data.js` – Länder nach Region, deutsche Namen, Hauptstädte, Schreibweisen fürs Tippen
- `src/app.js` – Spiellogik, Fortschritt, Ansichten
- `flags/` – 197 SVG-Flaggen (Quelle: npm-Paket country-flag-icons)
- `assets/` – Logo A Simple Man's Lab
- `web/deploy.py` – legt die gebaute App ins Repo `mbroyer/mbroyer.github.io`, Ordner `orbista/`
- `tests/` – Playwright-Skripte (Viewport 390 px)

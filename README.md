# Flaggo

Flaggen-Quiz mit 197 Ländern, komplett auf Deutsch. Privates Projekt von A Simple Man's Lab.

Spielarten: Flagge → Land, Land → Flagge, selbst tippen. Filter nach Weltregion, Runden mit 10, 20 oder allen Flaggen. Schwächere Flaggen kommen häufiger dran, der Fortschritt liegt aktuell nur im Browser (localStorage).

## Lokal starten

Reine statische Seite, kein Build nötig:

```
python3 -m http.server 8080
```

Dann http://localhost:8080 öffnen.

## Struktur

```
index.html          Seitenstruktur (Start, Spiel, Ergebnis)
css/style.css       Design (hell und dunkel über Tokens am Dateianfang)
js/data.js          Länder nach Region, deutsche Namen, Schreibweisen fürs Tippen
js/app.js           Spiellogik, Fortschritt, Ansichten
flags/              197 SVG-Flaggen (Quelle: npm-Paket country-flag-icons)
assets/             Logo A Simple Man's Lab
supabase/schema.sql Entwurf für Konten und Fortschritt (noch nicht eingebunden)
CLAUDE.md           Kontext und Roadmap für Claude Code
```

## Veröffentlichen

Der Ordner ist direkt hostbar, zum Beispiel bei IONOS (Dateien per FTP in ein Unterverzeichnis), Cloudflare Pages oder Netlify (Ordner hochladen, kein Build-Befehl).

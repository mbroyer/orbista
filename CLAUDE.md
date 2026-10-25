# Orbista – Projektkontext für Claude Code

Privates Lernspiel (Flaggen, bald Hauptstädte), gleiche Linie wie die anderen Lernapps von Mark (NumNum, Vokamon, Readster). Bis Oktober 2026 hieß es Flaggo. Zielgruppe: gemischt, nicht nur Kinder, also freundlich, aber nicht kindlich.

## Stand
- Quelle in `src/`, `python3 build.py` baut eine einzige HTML-Datei (`orbista.html` fürs Artifact, `web/orbista/index.html` für asimplemanslab.com/orbista). Kein Framework, keine Abhängigkeiten außer Google Fonts.
- Alle Texte auf Deutsch. Kein Gendern, neutrale Formulierungen.
- Layout für iPad und Handy, Hell und Dunkel über CSS-Tokens (`:root` in `src/style.css`).
- Startseite zeigt unten das Logo „Made with love by A Simple Man's Lab" (nur dort, nie im Quiz). Logo ist schwarz und wird im Dunkelmodus per `--logo-filter` weiß.
- Fortschritt in localStorage unter `orbista.mastery` (nie umbenennen): pro Länderkürzel `{r: richtig, w: falsch}`. „Gekonnt" heißt r ≥ 2 und r > w. Ein alter Stand unter `flaggo.mastery` wird beim ersten Start übernommen.
- Nach Änderungen `python3 build.py` und `python3 tests/t1.py`.

## Nächste Schritte (Spielkonzept 2.0)
Konzept: https://claude.ai/artifact/UEUFjDKwakqbrAUHwzZ6R5
1. Hauptstädte: Daten, drei Fragetypen, Startseite mit Thema und Antwortart.
2. Sterne pro Karte, Fälligkeit, XP, Level, Tagesziel, Serie, Zeitrennen, Reisepass (alles lokal).
3. Abzeichen, Blitz, Zwillinge.
4. Cloudflare Worker mit Codes und Spielstand wie bei NumNum (kein Supabase), dann Rangliste.

## Hinweise
- Ländernamen kommen aus `Intl.DisplayNames('de')`, Abweichungen stehen in `NAME_FIX` in `src/data.js`. Zusätzliche Tipp-Schreibweisen in `ALIAS`.
- Neue Flaggen: SVG in `flags/` ablegen und das Kürzel in `REGIONS` eintragen.

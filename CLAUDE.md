# Orbista – Projektkontext für Claude Code

Privates Lernspiel (Flaggen und Hauptstädte), gleiche Linie wie die anderen Lernapps von Mark (NumNum, Vokamon, Readster). Bis Oktober 2026 hieß es Flaggo. Zielgruppe: gemischt, nicht nur Kinder, also freundlich, aber nicht kindlich.

## Stand
- Quelle in `src/`, `python3 build.py` baut eine einzige HTML-Datei (`orbista.html` fürs Artifact, `web/orbista/index.html` für asimplemanslab.com/orbista). Kein Framework, keine Abhängigkeiten außer Google Fonts.
- Alle Texte auf Deutsch. Kein Gendern, neutrale Formulierungen.
- Layout für iPad und Handy, Hell und Dunkel über CSS-Tokens (`:root` in `src/style.css`).
- Startseite: Thema (Flaggen, Hauptstädte, Beides) bestimmt die Spielarten (`TOPICS`, `MODES` in `src/app.js`).
- Startseite zeigt unten das Logo „Made with love by A Simple Man's Lab" (nur dort, nie im Quiz). Logo ist schwarz und wird im Dunkelmodus per `--logo-filter` weiß.
- Fortschritt in localStorage, getrennt nach Karte (beide Schlüssel nie umbenennen): Flaggen unter `orbista.mastery`, Hauptstädte unter `orbista.capitals`, jeweils pro Länderkürzel `{r: richtig, w: falsch}`. Alle Fragen, deren Antwort eine Hauptstadt ist oder die von einer Hauptstadt ausgehen, zählen für die Hauptstadt-Karte. „Gekonnt" heißt r ≥ 2 und r > w. Ein alter Stand unter `flaggo.mastery` wird beim ersten Start übernommen.
- Nach Änderungen `python3 build.py` und `python3 tests/t1.py`.

## Nächste Schritte (Spielkonzept 2.0)
Konzept: https://claude.ai/artifact/UEUFjDKwakqbrAUHwzZ6R5
1. Sterne pro Karte, Fälligkeit, XP, Level, Tagesziel, Serie, Zeitrennen, Reisepass (alles lokal).
2. Abzeichen, Blitz, Zwillinge.
3. Cloudflare Worker mit Codes und Spielstand wie bei NumNum (kein Supabase), dann Rangliste.

## Hinweise
- Ländernamen kommen aus `Intl.DisplayNames('de')`, Abweichungen stehen in `NAME_FIX` in `src/data.js`. Zusätzliche Tipp-Schreibweisen in `ALIAS`.
- Hauptstädte: `CAPITAL` in `src/data.js` (deutsche Namen, nur diese stehen in Auswahlfragen), `CAP_ALIAS` für weitere akzeptierte Antworten beim Tippen (zweite Hauptstädte, andere Schreibweisen), `CAP_NOTE` für Sonderfälle, die nach der Antwort erklärt werden (dann kein automatisches Weiter).
- Neues Land: SVG in `flags/` ablegen, Kürzel in `REGIONS` und Hauptstadt in `CAPITAL` eintragen.

# Flaggo – Projektkontext für Claude Code

Privates Lernspiel (Flaggen und Länder raten), gleiche Linie wie die anderen Lernapps von Mark (Vokabeltrainer, NumNum). Getrennt vom Geschäft: kein Firebase der App-Firma, eigenes Supabase.

## Stand
- Statische Seite ohne Build: `index.html`, `css/`, `js/`, `flags/`. Kein Framework, keine Abhängigkeiten außer Google Fonts.
- Alle Texte auf Deutsch. Kein Gendern, neutrale Formulierungen.
- Layout für iPad und Handy, Hell und Dunkel über CSS-Tokens (`:root` in `css/style.css`).
- Startseite zeigt unten das Logo „Made with love by A Simple Man's Lab" (nur dort, nie im Quiz). Logo ist schwarz und wird im Dunkelmodus per `--logo-filter` weiß.
- Fortschritt (`flaggo.mastery`) liegt in localStorage: pro Länderkürzel `{r: richtig, w: falsch}`. „Gekonnt" heißt r ≥ 2 und r > w.

## Nächste Stufe (wie die anderen Lernapps)
1. Eigene Seite außerhalb von Claude mit Login: mehrere Konten mit Benutzername und PIN, Supabase (Entwurf in `supabase/schema.sql`).
2. Fortschritt pro Konto speichern statt nur im Browser, mit Statistik pro Region.
3. Maskottchen und eigener Schriftzug passend zu den anderen Apps.
4. Mehr Übungsarten: Hauptstädte, Umrisse, Lernkarten, Zeitmodus.
5. Sprachausgabe für Ländernamen, nicht über das Gerätesystem.

## Hinweise
- Ländernamen kommen aus `Intl.DisplayNames('de')`, Abweichungen stehen in `NAME_FIX` in `js/data.js`. Zusätzliche Tipp-Schreibweisen in `ALIAS`.
- Neue Flaggen: SVG in `flags/` ablegen und das Kürzel in `REGIONS` eintragen.

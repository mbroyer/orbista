# Orbista – Projektkontext für Claude Code

Privates Lernspiel (Flaggen und Hauptstädte), gleiche Linie wie die anderen Lernapps von Mark (NumNum, Vokamon, Readster). Bis Oktober 2026 hieß es Flaggo. Zielgruppe: gemischt, nicht nur Kinder, also freundlich, aber nicht kindlich.

## Stand
- Quelle in `src/`, `python3 build.py` baut eine einzige HTML-Datei (`orbista.html` fürs Artifact, `web/orbista/index.html` für asimplemanslab.com/orbista). Kein Framework, keine Abhängigkeiten außer Google Fonts.
- Alle Texte auf Deutsch. Kein Gendern, neutrale Formulierungen.
- Layout für iPad und Handy, Hell und Dunkel über CSS-Tokens (`:root` in `src/style.css`). Stil „Atlas“ (von Mark gewählt): Kartenpapier mit Höhenlinien, Ozeanblau und Ocker, Schriften Young Serif und IBM Plex Sans, Knöpfe und Antworten als „Druckstempel“ (Tintenrand mit hartem Versatzschatten). Entwurf: https://claude.ai/artifact/D7hT3975Y7ki8BVDEMfTx4
- Geführter Ablauf statt vieler Einstellungen: Erster Start fragt Thema (`P.topic`: flag, cap, both) und Tagesziel. Startseite mit einem Hauptknopf „Weiterreisen“ (`autoPlan`: fällige Karten zuerst, dann neue aus der ersten Region in `ORDER`, die noch Unbekanntes hat; ab 2 Sternen getippt, sonst ausgewählt, `modeFor`). Darunter „Gezielt üben“: Flaggen, Hauptstädte, Zeitrennen → nur Region und Auswählen/Eintippen. Runden immer 10 Fragen. Untere Leiste Reise/Reisepass. Jede Frage trägt ihre Spielart (`G.list` = `{c, m}`), Kürzel und Spielart stehen für Tests an `#q` (`data-code`, `data-mode`).
- Startseite zeigt unten das Logo „Made with love by A Simple Man's Lab" (nur dort, nie im Quiz). Logo ist schwarz und wird im Dunkelmodus per `--logo-filter` weiß.
- Fortschritt in localStorage, getrennt nach Karte (Schlüssel nie umbenennen): Flaggen unter `orbista.mastery`, Hauptstädte unter `orbista.capitals`, jeweils pro Länderkürzel `{r, w, s, due, d1, d2, t}` (richtig, falsch, Sterne 0–3, fällig ab Tag, Tag des ersten Richtigen, Tag des zweiten Sterns, einmal richtig getippt). Tage sind lokale Tageszahlen (`today()`). Alle Fragen, deren Antwort eine Hauptstadt ist oder die von einer Hauptstadt ausgehen, zählen für die Hauptstadt-Karte. Ein alter Stand unter `flaggo.mastery` wird beim ersten Start übernommen, Sterne werden aus r und w abgeleitet.
- Sterne: 1 = einmal richtig, 2 = gekonnt (r ≥ 2, r > w, an zwei Tagen richtig), 3 = gemeistert (einmal ohne Tipp-Hilfe richtig getippt und ≥ 7 Tage nach dem zweiten Stern wieder richtig). Fehler kostet einen Stern und macht die Karte sofort fällig. Fällig nach 1, 3 bzw. 14 Tagen. Runden nehmen zuerst fällige Karten, dann neue.
- Profil unter `orbista.profile`: XP, Tagesziel (30/50/100, Tipp auf den Ring), Serie mit einem Ruhetag pro Woche. XP: 10 Auswahl, 20 Tippen, +5 für Flagge → Hauptstadt, halb mit Tipp-Hilfe, Serienbonus +2 je Folge bis +10, +20 neuer Stern, +50 gemeistert, +30 perfekte Runde ab 10 Fragen. Level L ab 50·L·(L−1) XP, alle 5 Level ein neuer Titel.
- Zeitrennen (Spielform, ab Level 2): Rennzeit = Summe der Antwortzeiten + 5 s je Fehler, die Lösungsanzeige zählt nicht. Bestzeiten in `orbista.profile` unter `best`, Schlüssel `Spielart|Region|Länge` (Spielart f2l, l2c, type oder ctype). Neue Bestzeit +30 XP. „Fehler nochmal üben“ läuft immer als Übung.
- Reisepass (untere Leiste): alle Länder nach Region mit Sternen, umschaltbar Flaggen/Hauptstädte, Stempel und Bestzeiten. Ein Stempel pro Region und Karte (Flaggen, Hauptstädte), sobald alle Karten der Region 2 Sterne haben. Vergeben am Ende einer Runde, einmalig, +100 XP, gespeichert in `orbista.profile` unter `stamps` (`Region|f` bzw. `Region|c`).
- Nach Änderungen `python3 build.py` und `python3 tests/t1.py` bis `t4.py`.

## Nächste Schritte (Spielkonzept 2.0)
Konzept: https://claude.ai/artifact/UEUFjDKwakqbrAUHwzZ6R5
1. Abzeichen, Blitz, Zwillinge.
2. Cloudflare Worker mit Codes und Spielstand wie bei NumNum (kein Supabase), dann Rangliste.

## Hinweise
- Ländernamen kommen aus `Intl.DisplayNames('de')`, Abweichungen stehen in `NAME_FIX` in `src/data.js`. Zusätzliche Tipp-Schreibweisen in `ALIAS`.
- Hauptstädte: `CAPITAL` in `src/data.js` (deutsche Namen, nur diese stehen in Auswahlfragen), `CAP_ALIAS` für weitere akzeptierte Antworten beim Tippen (zweite Hauptstädte, andere Schreibweisen), `CAP_NOTE` für Sonderfälle, die nach der Antwort erklärt werden (dann kein automatisches Weiter).
- Flaggen: detaillierte 4:3-SVGs aus dem npm-Paket flag-icons (MIT), Anzeige überall im Format 4:3. Nach jeder Antwort geht es nur per „Weiter“ weiter, nie automatisch (Marks Wunsch); nur im Zeitrennen läuft es ohne Knopf.
- Neues Land: SVG (4:3, aus flag-icons) in `flags/` ablegen, Kürzel in `REGIONS` und Hauptstadt in `CAPITAL` eintragen.

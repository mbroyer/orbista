# Reise-Codes für Orbista bei Cloudflare einrichten

Einmalig, etwa 10 Minuten, kostenlos. Genau wie bei NumNum, nur mit eigenem Speicher und eigenem Worker. Danach verwaltest du die Codes selbst, und der Spielstand jedes Codes liegt beim Worker.

1. Auf **dash.cloudflare.com** anmelden (dasselbe Konto wie für NumNum).
2. Links **Storage & Databases** → **Workers KV** → **Create instance**. Name: `orbista-stand`, speichern.
3. Links **Compute (Workers)** → **Workers & Pages** → **Erstellen** → **Worker** → „Hello World“. Name: `orbista`, **Bereitstellen** tippen.
4. **Code bearbeiten** öffnen, den ganzen Inhalt löschen, den Inhalt von `worker.js` einfügen und **Bereitstellen** tippen.
5. Im Worker **Einstellungen** → **Bindungen** → **Bindung hinzufügen** → **KV-Namespace**. Variablenname `STAND`, Namespace `orbista-stand` wählen, speichern.
6. Im Worker **Einstellungen** → **Variablen und Geheimnisse** → Variable vom Typ Text: Name `CODES`, Wert z. B. `KOMPASS-4821, ANDEN-1234` (Buchstaben, Zahlen, Bindestrich, 4 bis 24 Zeichen). **Bereitstellen** tippen.
7. Die Adresse des Workers im Browser öffnen, etwa `https://orbista.DEINNAME.workers.dev`. Dort muss `"dienst":"Orbista"`, `"stand":true` und `"codes":true` stehen. Diese Adresse an Claude schicken.

## Codes vergeben

- Neue Person: Code zur Liste `CODES` hinzufügen und **Bereitstellen** tippen. Link zum Verschicken: `https://asimplemanslab.com/orbista/?code=KOMPASS-4821`. Den Code kann man auch selbst eintippen, Groß- und Kleinschreibung ist egal.
- Code streichen: Das Gerät wird beim nächsten Öffnen mit Internet abgemeldet. Der Spielstand bleibt gespeichert und ist wieder da, wenn der Code zurück in die Liste kommt.
- Auf einem Gerät die Person wechseln: in Orbista unten auf der Startseite **Wechseln** tippen oder `https://asimplemanslab.com/orbista/?wechseln` öffnen.
- Ohne Variable `CODES` ist kein Code gültig. Ohne Code geht nur die Demo, die nichts speichert.

Gespeichert werden Profil (XP, Level, Serie, Stempel, Bestzeiten, Einstellungen) und die Sterne für Flaggen und Hauptstädte. Wer Orbista vorher schon ohne Code gespielt hat, nimmt diesen Stand beim ersten Anmelden auf dem Gerät mit. Ohne Internet spielt Orbista mit dem Stand auf dem Gerät weiter und gleicht später ab. Hochgeladen wird beim Schließen der App und sonst höchstens alle 5 Minuten, im kostenlosen Tarif sind 1.000 Speichervorgänge pro Tag frei.

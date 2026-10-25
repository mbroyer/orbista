# Baut Orbista zu einer einzigen HTML-Datei: orbista.html (Artifact) und web/orbista/index.html (asimplemanslab.com/orbista)
import os, json, base64
H = os.path.dirname(os.path.abspath(__file__)) + '/'
S = H + 'src/'
def rd(p): return open(p, encoding='utf8').read()

data, app, css, body = rd(S + 'data.js'), rd(S + 'app.js'), rd(S + 'style.css'), rd(S + 'body.html')
# Flaggen als data-URIs einbetten, damit die Seite ohne weitere Dateien läuft
flags = {f[:-4]: 'data:image/svg+xml;base64,' + base64.b64encode(open(H + 'flags/' + f, 'rb').read()).decode()
         for f in sorted(os.listdir(H + 'flags')) if f.endswith('.svg')}
logo = 'data:image/png;base64,' + base64.b64encode(open(H + 'assets/logo-simple-mans-lab.png', 'rb').read()).decode()
assert '__LOGO__' in body
body = body.replace('__LOGO__', logo)

out = '''<meta charset="utf-8">
<title>Orbista</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Young+Serif&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">
<style>
''' + css + '''
</style>
''' + body + '''
<script>
window.ORBISTA_FLAGS=''' + json.dumps(flags, separators=(',', ':')) + ''';
</script>
<script>
''' + data + '''
</script>
<script>
''' + app + '''
</script>
'''
open(H + 'orbista.html', 'w', encoding='utf8').write(out)
print('orbista.html', len(out), 'Zeichen,', len(flags), 'Flaggen')

# Webversion: eigenständige Seite (das Artifact ergänzt Doctype und Viewport selbst)
web = '''<!doctype html>
<html lang="de">
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Orbista">
''' + out + '''</html>
'''
os.makedirs(H + 'web/orbista', exist_ok=True)
open(H + 'web/orbista/index.html', 'w', encoding='utf8').write(web)
print('web/orbista/index.html')

#!/usr/bin/env python3
"""Legt Orbista für asimplemanslab.com/orbista in den Ordner orbista/ des Website-Repos.

Aufruf (nach python3 build.py):
  python3 web/deploy.py ../mbroyer.github.io/orbista https://orbista.DEINNAME.workers.dev

Ergebnis: index.html (Anmeldung mit Reise-Code) und app.html (die App).
"""
import pathlib, sys

H = pathlib.Path(__file__).resolve().parent
if len(sys.argv) != 3 or not sys.argv[2].startswith('https://'):
    sys.exit(__doc__)
out, worker = pathlib.Path(sys.argv[1]), sys.argv[2].rstrip('/')
out.mkdir(parents=True, exist_ok=True)
(out / 'app.html').write_text((H / 'orbista/index.html').read_text(encoding='utf8'), encoding='utf8')
(out / 'index.html').write_text((H / 'login.html').read_text(encoding='utf8').replace('__WORKER__', worker), encoding='utf8')
print('index.html, app.html ->', out)

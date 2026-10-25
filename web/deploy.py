#!/usr/bin/env python3
"""Legt Orbista für asimplemanslab.com/orbista in den Ordner orbista/ des Website-Repos.

Aufruf (nach python3 build.py):
  python3 web/deploy.py ../mbroyer.github.io/orbista

Ergebnis: index.html (die App). Anmeldung mit Code kommt später über einen Cloudflare Worker wie bei NumNum.
"""
import pathlib, sys

H = pathlib.Path(__file__).resolve().parent
if len(sys.argv) != 2:
    sys.exit(__doc__)
out = pathlib.Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)
(out / 'index.html').write_text((H / 'orbista/index.html').read_text(encoding='utf8'), encoding='utf8')
print('index.html ->', out)

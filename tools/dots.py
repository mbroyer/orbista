"""Baut src/dots.js aus src/map.js: Punktraster der Weltkarte für „Deine Welt“ auf der Startseite.
Jeder Punkt gehört zu genau einem Land (Mitte der Rasterzelle liegt im Umriss). Länder ohne eigenen Punkt
(Kleinstaaten, Inseln) bekommen die nächste freie Zelle bei ihrem Mittelpunkt, damit jedes Land sichtbar ist.
Aufruf: python3 tools/dots.py  (Chromium über Playwright; PW_CHROMIUM, falls Playwright den Browser nicht findet)"""
import asyncio, json, os
from playwright.async_api import async_playwright
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
COLS = 64

JS = """cols => { const M = window.ORBISTA_MAP, ns = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(ns, 'svg'); s.setAttribute('width', 2000); s.setAttribute('height', 1200); document.body.appendChild(s);
  const g = document.createElementNS(ns, 'g'); s.appendChild(g);
  for (const c in M.p) { const p = document.createElementNS(ns, 'path'); p.setAttribute('d', M.p[c]); p.dataset.c = c; g.appendChild(p); }
  const bb = g.getBBox(), sc = Math.min(2000 / bb.width, 1200 / bb.height);
  g.setAttribute('transform', `scale(${sc}) translate(${-bb.x},${-bb.y})`);
  const step = bb.width * sc / cols, rows = Math.round(bb.height * sc / step), cell = {};
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const el = document.elementFromPoint((i + .5) * step, (j + .5) * step), c = el && el.dataset && el.dataset.c;
    if (c) cell[j * cols + i] = c;
  }
  // Länder ohne Punkt: nächste freie Zelle beim Mittelpunkt
  const have = new Set(Object.values(cell));
  for (const c of Object.keys(M.box)) {
    if (have.has(c)) continue;
    const [x, y] = M.box[c], ci = Math.floor((x - bb.x) * sc / step), cj = Math.floor((y - bb.y) * sc / step);
    let best = null;
    for (let r = 0; r < 6 && best === null; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      const i = ci + di, j = cj + dj, k = j * cols + i;
      if (best === null && i >= 0 && i < cols && j >= 0 && j < rows && !cell[k]) best = k;
    }
    if (best !== null) { cell[best] = c; have.add(c); }
  }
  return {cols, rows, cell, missing: Object.keys(M.box).filter(c => !have.has(c))};
}"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('PW_CHROMIUM'))
        pg = await b.new_page(viewport={'width': 2000, 'height': 1200})
        await pg.set_content('<body style="margin:0"></body>')
        await pg.add_script_tag(path=H + 'src/map.js')
        r = await pg.evaluate(JS, COLS)
        await b.close()
    # kompakt: pro Land die Zellennummern
    by = {}
    for k, c in sorted(r['cell'].items(), key=lambda x: int(x[0])):
        by.setdefault(c, []).append(int(k))
    out = ('// Punktraster der Weltkarte für „Deine Welt“, erzeugt von tools/dots.py aus src/map.js\n'
           'window.ORBISTA_DOTS=' + json.dumps({'cols': r['cols'], 'rows': r['rows'], 'c': by}, separators=(',', ':')) + ';\n')
    open(H + 'src/dots.js', 'w', encoding='utf8').write(out)
    print('src/dots.js', len(out), 'Zeichen,', r['cols'], 'x', r['rows'], 'Raster,', sum(map(len, by.values())), 'Punkte,',
          len(by), 'Länder, ohne Punkt:', r['missing'])

asyncio.run(main())

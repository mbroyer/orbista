"""Baut src/kreativ.js aus den Flaggen in flags/: Daten für die kreativen Spielarten.
- pie:   Farbanteile je Flagge (Farbkreis, und die Farben für „Echt oder falsch“), Farben unter 2,5 % fallen weg
- keys:  Punkte für das Schlüsselloch, in deren Umkreis mindestens zwei Farben liegen
- sym:   Flaggen, die gespiegelt gleich aussehen (für „Echt oder falsch“ kein Spiegeln)
- parts: Einzelteile für „Zwei in Teilen“, nur für Flaggen aus abstrakten Formen (keine Wappen, Schrift oder Bildzeichen)
Teile entstehen aus den Ebenen der SVG-Flagge: jedes Element wird einzeln gerendert, damit nichts ausgestanzt ist
(Türkei = rote Fläche, weißer Mond, Stern). Abgezogen wird nur, was eine spätere Ebene fast überall in der Farbe
darunter ausschneidet (der rote Kreis im Mond) oder was als Randstreifen darüberliegt (Frankreich).
Aufruf: python3 tools/kreativ.py  (Playwright, numpy, scipy, Pillow; PW_CHROMIUM, falls Playwright den Browser nicht findet)"""
import asyncio, base64, io, json, os, random
import numpy as np
from PIL import Image
from scipy import ndimage
from playwright.async_api import async_playwright
H0 = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
W, H, N = 320, 240, 320 * 240
# Flaggen mit eindeutigem Bildzeichen oder Schrift in einer Farbe; die Wappen in mehreren Farben erkennt das Skript selbst
SYMBOL = set('''AF AL BB BT BY BZ CA CY DM EC ER ET FJ GD GT IN IQ IR KE KG KH KI KZ LB LK ME MW MX MZ NP PE PG PT SA SK SM SV SZ TM UG VA VE XK ZM ZW'''.split())
LEAF = 'path,rect,circle,ellipse,polygon,polyline,line,use'
JS_LEAVES = """() => { const s = document.querySelector('svg');
  const L = [...s.querySelectorAll('%s')].filter(e => !e.closest('defs,clipPath,mask,marker,pattern,symbol'));
  L.forEach((e, i) => e.setAttribute('data-k', i)); return L.length; }""" % LEAF
MAX_LAYERS = 40  # mehr Ebenen = Wappen, keine Teile

def png2arr(b): return np.array(Image.open(io.BytesIO(b)).convert('RGBA'))
def close(a, b, t=60): return np.linalg.norm(np.array(a, float) - np.array(b, float)) < t
def bbox(m):
    ys, xs = np.nonzero(m)
    return xs.min(), xs.max(), ys.min(), ys.max()
def hexc(c): return '#%02x%02x%02x' % tuple(int(v) for v in c)

def colors(full):
    """Farbanteile und Farbzuordnung je Pixel (-1 = Detail, etwa Wappen)."""
    px = full[..., :3].reshape(-1, 3).astype(int)
    cols, cnt = np.unique(px, axis=0, return_counts=True)
    pal = []
    for i in np.argsort(-cnt):
        if cnt[i] / N < 0.012: break
        if all(np.sum((cols[i] - p) ** 2) > 70 ** 2 for p in pal): pal.append(cols[i])
    pal = np.array(pal)
    d = ((px[:, None, :] - pal[None, :, :]) ** 2).sum(2)
    lab = np.where(d.min(1) < 70 ** 2, d.argmin(1), -1)
    keep = [i for i in range(len(pal)) if (lab == i).sum() / N >= 0.025]
    near = np.array(keep)[d[:, keep].argmin(1)]
    lab = np.where(np.isin(lab, keep), lab, -1).reshape(H, W)
    # Kantenglättung: einzelne Detailpixel gehören zur nächsten Farbe
    for _ in range(2):
        det = lab == -1
        k = ndimage.convolve(det.astype(int), np.ones((3, 3), int), mode='constant') - det
        lab = np.where(det & (k < 5), near.reshape(H, W), lab)
    pie = sorted(([hexc(pal[i]), round(float((lab == i).sum()) / N, 3)] for i in keep), key=lambda s: -s[1])
    return pie, lab

def keyholes(lab, c):
    R = int(W * 0.085); cand = []
    yy, xx = np.mgrid[-R:R + 1:6, -R:R + 1:6]; ring = (xx ** 2 + yy ** 2 <= R * R)
    offs = list(zip(yy[ring], xx[ring]))
    for y in range(R // 2, H - R // 2, 10):
        for x in range(R // 2, W - R // 2, 10):
            seen = {lab[y + dy, x + dx] for dy, dx in offs if 0 <= y + dy < H and 0 <= x + dx < W}
            cand.append((len(seen), x, y))
    best = max(n for n, _, _ in cand); top = [(x, y) for n, x, y in cand if n >= min(best, 2)]
    random.seed(c)
    return [[round(x / W, 3), round(y / H, 3)] for x, y in random.sample(top, min(8, len(top)))]

def edge_stripe(j, k):
    # j liegt als Streifen am Rand von k: über die ganze Breite oder Höhe von k und nur an einer Seite
    jm = j & k
    if jm.sum() < 0.1 * k.sum(): return False
    x0, x1, y0, y1 = bbox(k); a0, a1, b0, b1 = bbox(jm); tol = 3
    full_h = b0 <= y0 + tol and b1 >= y1 - tol; full_w = a0 <= x0 + tol and a1 >= x1 - tol
    if full_h and not full_w: return (a0 <= x0 + tol) != (a1 >= x1 - tol)
    if full_w and not full_h: return (b0 <= y0 + tol) != (b1 >= y1 - tol)
    return False

def parts(L):
    """Einzelteile aus den Ebenen; None, wenn die Flagge ein Wappen hat."""
    shapes, carvers = [], set()
    for k, (mk, ck) in enumerate(L):
        s = mk.copy()
        below = np.zeros((H, W, 3), int); has = np.zeros((H, W), bool)
        for i in range(k): below[L[i][0]] = L[i][1]; has |= L[i][0]
        for j in range(k + 1, len(L)):
            mj, cj = L[j]
            ov = mj & s
            if not ov.any() or close(cj, ck): continue
            if mj.sum() >= 0.03 * N:  # nur große Ebenen schneiden aus (Türkei), keine Schrift oder Sterne
                carve = ov & has & (np.linalg.norm(below - cj, axis=2) < 60)
                # nur, wenn die Ebene fast überall die Farbe darunter wiederherstellt (Türkei), nicht stellenweise (Griechenlands Kreuz)
                if carve.sum() >= 0.8 * ov.sum():
                    lab, n = ndimage.label(carve)
                    for i in range(1, n + 1):
                        if (lab == i).sum() >= 0.005 * N: s &= ~(lab == i); carvers.add(j)
            if edge_stripe(mj, s): s &= ~mj
        shapes.append(s)
    items = [{'m': s, 'c': L[k][1]} for k, s in enumerate(shapes) if s.sum() > 8 and k not in carvers]
    # direkt aufeinanderfolgende Ebenen gleicher Farbe, die sich berühren, sind ein Teil (Schweizer Kreuz aus zwei Balken)
    i = 0
    while i < len(items) - 1:
        A, B = items[i], items[i + 1]
        if close(A['c'], B['c'], 40) and (ndimage.binary_dilation(A['m']) & B['m']).any(): A['m'] = A['m'] | B['m']; items.pop(i + 1)
        else: i += 1
    # Wappen: kleine Stücke verschiedener Farben, die sich überlagern
    small = []
    for it in items:
        lab, n = ndimage.label(it['m'])
        for i in range(1, n + 1):
            p = lab == i
            if p.sum() / N < 0.06 and p.sum() > 6: small.append((p, it['c']))
    groups = []
    for p, c in small:
        d = ndimage.binary_dilation(p, iterations=4)
        hit = [g for g in groups if (d & g[0]).any()]
        g = [p.copy(), [c]]
        for h in hit: g[0] |= h[0]; g[1] += h[1]
        groups = [x for x in groups if not any(x is h for h in hit)] + [g]
    for m, cs in groups:
        if len(cs) >= 3 and any(not close(c, cs[0], 40) for c in cs): return None
    # alle Teile einzeln (nahe beieinander liegende Balken bleiben ein Zeichen, etwa Koreas Trigramme)
    singles = []
    for it in items:
        lab, n = ndimage.label(ndimage.binary_dilation(it['m'], iterations=3))
        for i in range(1, n + 1):
            m = it['m'] & (lab == i)
            if m.sum() >= 10: singles.append({'m': m, 'c': it['c']})
    if not singles: return None
    top = max(singles, key=lambda r: r['m'].sum())
    # Reste, die in seiner Farbe auf dem größten Teil liegen, sieht man nicht (Lücken in Koreas Trigrammen)
    singles = [r for r in singles if r is top or not (r['m'].sum() < 0.01 * N and close(r['c'], top['c'], 40) and (r['m'] & ~top['m']).sum() < 0.1 * r['m'].sum())]
    singles = [r for r in singles if r['m'].sum() >= 0.0008 * N or r['m'].sum() >= 12]
    out, seen = [], []
    for r in singles:
        m = r['m']; x0, x1, y0, y1 = bbox(m); cnt = 1
        same = [q for q in singles if close(q['c'], r['c'], 40) and abs((lambda b: (b[1] - b[0]) - (x1 - x0))(bbox(q['m']))) <= 2
                and abs((lambda b: (b[3] - b[2]) - (y1 - y0))(bbox(q['m']))) <= 2 and abs(q['m'].sum() - m.sum()) <= 0.15 * m.sum()]
        if len(same) >= 9:  # viele gleiche Kleinteile: eins mit Anzahl (USA: ein Stern ×50)
            key = (tuple(r['c']), x1 - x0, y1 - y0)
            if any(k[0] == key[0] and abs(k[1] - key[1]) <= 2 and abs(k[2] - key[2]) <= 2 for k in seen): continue
            seen.append(key); cnt = len(same)
        sub = m[y0:y1 + 1, x0:x1 + 1]
        im = Image.new('P', (x1 - x0 + 1, y1 - y0 + 1), 0)
        im.putpalette([0, 0, 0] + [int(v) for v in r['c']])
        im.putdata((sub.astype(np.uint8)).ravel().tolist())
        b = io.BytesIO(); im.save(b, 'PNG', optimize=True, transparency=0, bits=1)  # 1 Bit: durchsichtig oder Farbe
        o = {'w': round((x1 - x0 + 1) / W, 3), 'h': round((y1 - y0 + 1) / H, 3), 'src': 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()}
        if cnt > 1: o['n'] = cnt
        out.append(o)
    return out

async def main():
    flags = sorted(f[:-4] for f in os.listdir(H0 + 'flags') if f.endswith('.svg'))
    pie, keys, prt, sym = {}, {}, {}, []
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('PW_CHROMIUM'))
        pg = await b.new_page(viewport={'width': W, 'height': H})
        for c in flags:
            svg = open(H0 + 'flags/' + c + '.svg').read().replace('<svg ', '<svg preserveAspectRatio="none" ', 1)
            await pg.set_content('<style>*{margin:0}html,body{background:transparent}svg{width:%dpx;height:%dpx;display:block}</style>' % (W, H) + svg)
            full = png2arr(await pg.screenshot(omit_background=True))
            pie[c], lab = colors(full)
            keys[c] = keyholes(lab, c)
            if np.abs(full[..., :3].astype(int) - full[:, ::-1, :3].astype(int)).mean() < 4: sym.append(c)
            n = await pg.evaluate(JS_LEAVES)
            if c in SYMBOL or n > MAX_LAYERS: continue
            L = []
            for k in range(n):
                await pg.evaluate("k => document.querySelectorAll('[data-k]').forEach(e => e.style.visibility = e.dataset.k == k ? 'visible' : 'hidden')", k)
                a = png2arr(await pg.screenshot(omit_background=True)); m = a[..., 3] > 128
                if m.sum() >= 4: L.append((m, np.median(a[m][:, :3], axis=0).astype(int)))
            ps = parts(L)
            if ps: prt[c] = ps
        await b.close()
    js = ('// erzeugt von tools/kreativ.py aus flags/: Farbanteile, Schlüsselloch-Punkte, spiegelgleiche Flaggen und Einzelteile abstrakter Flaggen\n'
          'window.ORBISTA_KREATIV=' + json.dumps({'pie': pie, 'keys': keys, 'sym': sym, 'parts': prt}, separators=(',', ':')) + ';\n')
    open(H0 + 'src/kreativ.js', 'w').write(js)
    print('src/kreativ.js', len(js), 'Zeichen,', len(pie), 'Flaggen,', len(prt), 'mit Teilen')

asyncio.run(main())

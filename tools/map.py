"""Baut src/map.js aus world-atlas (Natural Earth 1:50m, gemeinfrei): vereinfachte Ländergrenzen als SVG-Pfade.
Quellen: npm pack world-atlas@2.0.2 (countries-50m.json) und npm pack i18n-iso-countries (codes.json, ISO-Nummer → Kürzel).
Aufruf: python3 tools/map.py <countries-50m.json> <codes.json>"""
import json, math, re, sys
EPS = 1         # Vereinfachung in Kartenpunkten (Douglas-Peucker)
SCALE = 800     # Kartenbreite etwa 2*pi*SCALE*0.87
topo = json.load(open(sys.argv[1]))
num2a = {n: a for a, _, n, _ in json.load(open(sys.argv[2]))}
src = open('src/data.js').read()
ours = set(" ".join(re.findall(r'^\s+\w+:"([A-Z ]+)"', src.split('const NAME_FIX')[0], re.M)).split())
MERGE = {'Kosovo': 'XK', 'Somaliland': 'SO', 'N. Cyprus': 'CY'}

def proj(lon, lat):
    # Natural Earth I (Šavrič et al.)
    p = math.radians(lat); l = math.radians(lon); p2 = p*p; p4 = p2*p2
    x = l*(0.8707 - 0.131979*p2 + p4*(-0.013791 + p4*(0.003971*p2 - 0.001529*p4)))
    y = p*(1.007226 + p2*(0.015085 + p4*(-0.044475 + 0.028874*p2 - 0.005916*p4)))
    return x*SCALE, -y*SCALE

sx, sy = topo['transform']['scale']; tx, ty = topo['transform']['translate']
# Ozeanien liegt über der Datumsgrenze: dort werden westliche Längen um 360° verschoben, damit Fidschi, Samoa,
# Tonga, Kiribati und Tuvalu rechts von Australien liegen statt am anderen Kartenrand
OCEANIA = set(re.search(r'Ozeanien:"([A-Z ]+)"', src).group(1).split())
raw = []
for a in topo['arcs']:
    x = y = 0; pts = []
    for dx, dy in a:
        x += dx; y += dy; pts.append((x*sx+tx, y*sy+ty))
    raw.append(pts)

def dp(pts, eps):
    if len(pts) < 3: return pts
    keep = [False]*len(pts); keep[0] = keep[-1] = True; st = [(0, len(pts)-1)]
    while st:
        i, j = st.pop(); ax, ay = pts[i]; bx, by = pts[j]; dx, dy = bx-ax, by-ay; L = math.hypot(dx, dy) or 1e-9
        best, bi = 0, -1
        for k in range(i+1, j):
            d = abs(dy*(pts[k][0]-ax) - dx*(pts[k][1]-ay))/L if L > 1e-6 else math.hypot(pts[k][0]-ax, pts[k][1]-ay)
            if d > best: best, bi = d, k
        if best > eps: keep[bi] = True; st += [(i, bi), (bi, j)]
    return [p for p, k in zip(pts, keep) if k]
arcs = [dp([proj(*q) for q in a], EPS) for a in raw]
arcs_east = [dp([proj(q[0]+360 if q[0] < -30 else q[0], q[1]) for q in a], EPS) for a in raw]

def ring(idx, east=False):
    A = arcs_east if east else arcs
    out = []
    for i in idx:
        a = A[i] if i >= 0 else A[~i][::-1]
        out += a if not out else a[1:]
    return out

def cut(r):
    # Ringe, die über die Datumsgrenze springen, in Teile zerlegen und jeden Teil einzeln schließen
    parts = [[r[0]]]
    for a, b in zip(r, r[1:]):
        if abs(b[0]-a[0]) > SCALE*2: parts.append([])
        parts[-1].append(b)
    if len(parts) > 1 and abs(parts[0][0][0]-parts[-1][-1][0]) < SCALE*2: parts[0] = parts.pop() + parts[0]
    return parts

def path(rings):
    s = []
    for r in [p for r in rings for p in cut(r)]:
        q = []
        for x, y in r:
            p = (round(x), round(y))
            if not q or p != q[-1]: q.append(p)
        if len(q) < 3: continue
        xs = [p[0] for p in q]; ys = [p[1] for p in q]
        if max(xs)-min(xs) < 2 and max(ys)-min(ys) < 2: continue
        f = lambda v: ('%g' % v)
        d = 'M' + f(q[0][0]) + ' ' + f(q[0][1])
        px, py = q[0]
        for x, y in q[1:]:
            d += 'l' + f(x-px) + ' ' + f(y-py); px, py = x, y
        s.append(d.replace(' -', '-') + 'z')
    return ''.join(s)

shapes, bg, box = {}, [], {}
for g in topo['objects']['countries']['geometries']:
    code = num2a.get(g.get('id')) or MERGE.get(g['properties']['name'])
    polys = g['arcs'] if g['type'] == 'MultiPolygon' else [g['arcs']] if g['type'] == 'Polygon' else []
    rings = [ring(r, code in OCEANIA) for poly in polys for r in poly]
    if code in ours:
        shapes.setdefault(code, []).extend(rings)
    elif g.get('id') != '010':
        bg.extend(r for poly in polys for r in [ring(poly[0])])  # Nichtquiz-Gebiete nur als Umriss, ohne Löcher
# Mittelpunkt und Größe je Land (größter Ring) für Zoom, Nachbarn und den Kreis bei Kleinstaaten
for c, rs in shapes.items():
    big = max(rs, key=lambda r: (max(p[0] for p in r)-min(p[0] for p in r))*(max(p[1] for p in r)-min(p[1] for p in r)))
    xs = [p[0] for p in big]; ys = [p[1] for p in big]
    allx = [p[0] for r in rs for p in r]; ally = [p[1] for r in rs for p in r]
    box[c] = [round((min(xs)+max(xs))/2), round((min(ys)+max(ys))/2), round(max(max(xs)-min(xs), max(ys)-min(ys)))]
box['TV'] = [*map(round, proj(179.2, -8.5)), 0]
# Kartenausschnitt je Region [x, y, Breite, Höhe], von Hand gewählt (Nordamerika ohne die Arktis)
VIEW = {'Europa': [-240, -1010, 710, 540], 'Asien': [280, -910, 1350, 1060], 'Afrika': [-300, -540, 1000, 1050],
        'Nordamerika': [-1410, -1000, 830, 925], 'Südamerika': [-1045, -185, 670, 950], 'Ozeanien': [1310, -120, 1165, 810]}
out = {'p': {c: path(r) for c, r in sorted(shapes.items())}, 'bg': path(bg), 'box': box, 'view': VIEW}
js = '// Weltkarte: Natural Earth 1:50m (gemeinfrei, über world-atlas), vereinfacht von tools/map.py\nwindow.ORBISTA_MAP=' + json.dumps(out, separators=(',', ':'), ensure_ascii=False) + ';\n'
open('src/map.js', 'w').write(js)
print(len(js), 'Bytes;', 'ohne Pfad:', sorted(c for c in ours if not out['p'].get(c)))

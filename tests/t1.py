# Playwright bei 390 px: erster Start, Weiterreisen, gezieltes Üben mit Auswählen und Eintippen, Übernahme des Flaggo-Stands, kein Querscrollen
import asyncio, os, json
from playwright.async_api import async_playwright
W = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'

# richtige Antwort zur aktuellen Frage (Kürzel und Spielart stehen an #q)
ANSWER = """() => { const q = document.getElementById('q'), c = q.dataset.code, m = q.dataset.mode, D = ORBISTA_DATA;
  if (['type', 'ctype', 'fctype'].includes(m)) return {m, v: m === 'type' ? (D.NAME_FIX[c] || new Intl.DisplayNames(['de'], {type: 'region'}).of(c))
    : D.CAPITAL[c].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')};
  return {m, c}; }"""

async def antwort(pg, ok=True):
    a = await pg.evaluate(ANSWER)
    if 'v' in a:
        if ok: await pg.fill('#ti', a['v']); await pg.click('#tf button[type=submit]')
        else: await pg.click('#skip')
    elif ok: await pg.click('.opt[data-c="%s"]' % a['c'])
    else: await pg.click('.opt:not(.ok):not([data-c="%s"]) >> nth=0' % a['c'])
    return a['m']

async def runde(pg, ok=True):
    modes = set()
    for i in range(10):
        modes.add(await antwort(pg, ok)); await pg.click('#nx')
    assert await pg.is_visible('#result')
    return modes, await pg.inner_text('#result .score')

async def gezielt(pg, path, typing, ok):
    await pg.click('[data-p="%s"]' % path); await pg.click('#regions [data-r="Europa"]')
    await pg.click('#answers [data-a="%d"]' % typing); await pg.click('#setupGo')
    modes, score = await runde(pg, ok); print(path, typing, sorted(modes), score)
    want = {('f', 0): {'f2l', 'l2f'}, ('f', 1): {'type'}, ('c', 0): {'l2c', 'c2l'}, ('c', 1): {'ctype'}}[(path, typing)]
    assert modes <= want, modes
    if ok: assert score == '10 / 10', score
    await pg.click('#homeBtn')

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('PW_CHROMIUM'))  # PW_CHROMIUM nur nötig, wenn Playwright den Browser nicht selbst findet
        ctx = await b.new_context(viewport={'width': 390, 'height': 844})
        pg = await ctx.new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        # alter Stand aus Flaggo: zwei Länder gekonnt
        await pg.add_init_script("if(!localStorage.getItem('orbista.mastery'))localStorage.setItem('flaggo.mastery',%s)"
                                 % json.dumps(json.dumps({'DE': {'r': 3, 'w': 0}, 'FR': {'r': 2, 'w': 1}})))
        await pg.goto('file://' + W + 'orbista.html'); await pg.wait_for_timeout(300)
        # erster Start: Willkommen, ohne Leiste unten
        assert await pg.is_visible('#welcome') and await pg.is_hidden('#home') and await pg.is_hidden('#tabs')
        await pg.screenshot(path=W + 't1_willkommen.png')
        await pg.click('#wTopics [data-t="both"]'); await pg.click('#wGoals [data-g="20"]'); await pg.click('#begin')
        P = await pg.evaluate("JSON.parse(localStorage.getItem('orbista.profile'))"); assert P['topic'] == 'both' and P['goalQ'] == 20 and 'goal' not in P, P
        # erster Start geht direkt in die erste Runde (neue Karten aus Europa), danach Startseite
        assert await pg.is_visible('#game') and await pg.is_hidden('#home') and await pg.is_hidden('#tabs')
        # Stummschalter auch im Quiz, gilt überall
        await pg.click('#game .sndbtn'); assert await pg.get_attribute('#soundBtn', 'aria-pressed') == 'false'
        await pg.click('#game .sndbtn'); assert await pg.get_attribute('#game .sndbtn', 'aria-pressed') == 'true'
        modes, score = await runde(pg); print('erste Runde', sorted(modes), score)
        assert score == '10 / 10', score  # DE und FR haben 2 Sterne, dort wird getippt
        assert await pg.is_visible('#result .sndbtn')
        await pg.click('#homeBtn')
        paths = await pg.inner_text('#paths'); print(paths.splitlines()[:2])
        assert '2 von 197 gekonnt' in paths, paths
        assert await pg.is_visible('#madeby') and await pg.is_visible('#tabs')
        assert await pg.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'Querscrollen'
        assert await pg.evaluate("[...document.images].every(i=>i.complete&&i.naturalWidth>0)"), 'Bild fehlt'
        await pg.screenshot(path=W + 't1_start.png', full_page=True)
        # Klänge an, Stummschalter merkt sich die Wahl
        assert await pg.get_attribute('#soundBtn', 'aria-pressed') == 'true'
        await pg.click('#soundBtn'); assert await pg.get_attribute('#soundBtn', 'aria-pressed') == 'false'
        assert (await pg.evaluate("JSON.parse(localStorage.getItem('orbista.profile'))"))['sound'] is False
        await pg.click('#soundBtn')

        # Weiterreisen bei „Beides“: neue Karten aus Europa, gemischt aus Flaggen- und Hauptstadtfragen
        sub = await pg.inner_text('#goSub'); assert 'Europa' in sub, sub
        await pg.click('#go'); assert await pg.is_hidden('#madeby') and await pg.is_hidden('#tabs')
        modes, score = await runde(pg); print('weiter', sorted(modes), score)
        assert score == '10 / 10', score
        await pg.click('#homeBtn')

        for path in ('f', 'c'):
            for typing in (0, 1):
                await gezielt(pg, path, typing, ok=False)
        await gezielt(pg, 'c', 1, ok=True)
        caps = await pg.evaluate("JSON.parse(localStorage.getItem('orbista.capitals'))")
        assert sum(v['r'] for v in caps.values()) >= 10, caps

        # Thema ändern führt zurück zum ersten Schritt
        await pg.click('#changeTopic'); assert await pg.is_visible('#welcome')
        await pg.click('#wTopics [data-t="cap"]'); await pg.click('#begin')
        assert 'Hauptstädte' in await pg.inner_text('#topicLine')
        await pg.screenshot(path=W + 't1_ende.png', full_page=True)
        assert await pg.evaluate("!!localStorage.getItem('orbista.mastery')")
        assert not errs, errs
        print('ok')
        await b.close()
asyncio.run(main())

# Playwright: kreative Spielarten (Farbkreis, Zwei in Teilen, Schlüsselloch, Echt oder falsch) über Gezielt üben → Flaggen → Knifflig,
# richtig und falsch beantwortet, auf Handy und Desktop; Zwei in Teilen nur mit abstrakten Flaggen, die zweite teilt eine Farbe
import asyncio, os
from playwright.async_api import async_playwright
W = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
URL = 'file://' + W + 'web/orbista/index.html'
Q = "() => { const q = document.getElementById('q'); return {c: q.dataset.code, m: q.dataset.mode, c2: q.dataset.c2 || null}; }"

async def antwort(pg, ok):
    q = await pg.evaluate(Q)
    if q['m'] == 'two':
        k = await pg.evaluate("Object.keys(ORBISTA_KREATIV.parts)")
        assert q['c'] in k and q['c2'] in k, q  # nur abstrakte Flaggen
        assert await pg.locator('.stage.parts .part').count() >= 2
        await pg.click('.opt[data-c="%s"]' % q['c'])
        assert await pg.is_hidden('#nx')  # ein Land reicht nicht
        if ok: await pg.click('.opt[data-c="%s"]' % q['c2'])
        else: await pg.click('.opt:not([data-c="%s"]):not([data-c="%s"]) >> nth=0' % (q['c'], q['c2']))
    elif q['m'] == 'hole':
        await pg.click('#holeBtn'); await pg.click('#holeBtn')
        assert await pg.is_disabled('#holeBtn')
        await pg.click('.opt[data-c="%s"]' % q['c'] if ok else '.opt:not([data-c="%s"]) >> nth=0' % q['c'])
    else:
        if q['m'] == 'fake': assert await pg.locator('.opt.imgopt').count() == 4
        if q['m'] == 'pie': assert await pg.locator('.pie path, .pie circle').count() >= 1
        await pg.click('.opt[data-c="%s"]' % q['c'] if ok else '.opt:not([data-c="%s"]) >> nth=0' % q['c'])
    await pg.wait_for_selector('#nx')
    if q['m'] == 'two':
        assert await pg.locator('.pair .flag').count() == 2
        assert await pg.locator('.opt.ok').count() == 2
    return q['m']

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('PW_CHROMIUM'))
        for w, h in ((390, 844), (1280, 800)):
            ctx = await b.new_context(viewport={'width': w, 'height': h}); pg = await ctx.new_page()
            errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(URL); await pg.evaluate("localStorage.setItem('orbista.profile', JSON.stringify({topic:'flag', goalQ:10}))"); await pg.reload()
            await pg.click('[data-p="f"]'); await pg.click('#regions [data-r="Alle"]')
            assert await pg.locator('#answers button').count() == 3
            await pg.click('#answers [data-a="2"]'); assert await pg.get_attribute('#answers [data-a="2"]', 'aria-pressed') == 'true'
            shot = set()
            for ok in (True, False, True):
                await pg.click('#setupGo'); modes = set()
                for i in range(10):
                    m = await antwort(pg, ok); modes.add(m)
                    if m not in shot: shot.add(m); await pg.screenshot(path=W + 't9_%s_%d.png' % (m, w))
                    sw = await pg.evaluate('document.documentElement.scrollWidth'); assert sw <= w, (m, sw)
                    await pg.click('#nx')
                assert modes <= {'pie', 'two', 'hole', 'fake'}, modes
                score = await pg.inner_text('#result .score'); assert score == ('10 / 10' if ok else '0 / 10'), score
                await pg.click('#homeBtn'); await pg.click('[data-p="f"]')
            assert shot == {'pie', 'two', 'hole', 'fake'}, shot
            # Knifflig gibt es nur bei Flaggen
            await pg.click('#setupBack'); await pg.click('[data-p="c"]'); assert await pg.locator('#answers button').count() == 2
            assert not errs, errs
            await ctx.close()
        await b.close()
    print('t9 ok')
asyncio.run(main())

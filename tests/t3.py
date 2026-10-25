# Playwright: Zeitrennen mit Strafzeit, Bestzeit und Freischaltung mit dem ersten Visum
import asyncio, os, re
from playwright.async_api import async_playwright
W = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
CODE = "() => document.getElementById('q').dataset.code"

async def neu(b, profil=None):
    pg = await (await b.new_context(viewport={'width': 390, 'height': 844})).new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    profil = profil or '{}'
    await pg.add_init_script("localStorage.setItem('orbista.profile',JSON.stringify(Object.assign({topic:'flag'},%s)))" % profil)
    await pg.goto('file://' + W + 'orbista.html'); await pg.wait_for_timeout(200)
    return pg, errs

async def rennen(pg, fehler):
    await pg.click('[data-p="race"]'); await pg.click('#raceKinds [data-k="f"]'); await pg.click('#regions [data-r="Europa"]')
    await pg.click('#answers [data-a="0"]'); await pg.click('#setupGo')
    for i in range(10):
        await pg.wait_for_selector('.opt:not([disabled])')
        hud = await pg.inner_text('#hudScore'); assert re.match(r'\d:\d\d,\d · %d/10' % (i + 1), hud), hud
        code = await pg.evaluate(CODE)
        if i in fehler: await pg.click('.opt:not([data-c="%s"]) >> nth=0' % code)
        else: await pg.click('.opt[data-c="%s"]' % code)
        assert await pg.locator('#nx').count() == 0, 'im Rennen gibt es keinen Weiter-Knopf'
    await pg.wait_for_selector('#result:not([hidden])')
    return await pg.inner_text('#result')

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('PW_CHROMIUM'))
        # ohne Visum: Zeitrennen gesperrt, auch mit vielen XP
        pg, errs = await neu(b, '{xp:5000}')
        assert await pg.is_disabled('[data-p="race"]'), 'Zeitrennen müsste gesperrt sein'
        assert 'Ab dem ersten Visum' in await pg.inner_text('#paths')

        # mit einem Visum, erstes Rennen mit 2 Fehlern: 10 s Strafzeit, erste Bestzeit
        pg, errs = await neu(b, "{stamps:{'Ozeanien|f':1}}")
        await pg.click('[data-p="race"]'); assert 'Noch keine Bestzeit' in await pg.inner_text('#answerHint')
        await pg.click('#setupBack')
        txt = await rennen(pg, (2, 7)); print(txt.splitlines()[:4])
        assert '8 von 10 richtig' in txt and '10 s Strafzeit' in txt and 'Erste Bestzeit' in txt, txt
        P = await pg.evaluate("JSON.parse(localStorage.getItem('orbista.profile'))")
        best = P['best']['f2l|Europa|10']; print('Bestzeit', best)
        assert 10000 <= best < 60000, best
        assert 'Schnellste Antwort' in txt and 'Langsamste Antwort' in txt
        await pg.screenshot(path=W + 't3_ergebnis.png', full_page=True)
        await pg.click('#homeBtn'); assert 'Schnellste Runde' in await pg.inner_text('#paths')
        await pg.click('[data-p="race"]'); assert 'Deine Bestzeit für diese Strecke' in await pg.inner_text('#answerHint')
        assert not errs, errs

        # Rekord schlagen und verfehlen
        pg, errs = await neu(b, "{best:{'f2l|Europa|10':999999}}")
        txt = await rennen(pg, ()); assert 'Neue Bestzeit' in txt and 'XP' not in txt, txt
        pg, errs = await neu(b, "{best:{'f2l|Europa|10':1}}")
        txt = await rennen(pg, ()); assert 'langsamer als deine Bestzeit' in txt, txt
        P = await pg.evaluate("JSON.parse(localStorage.getItem('orbista.profile'))")
        assert P['best']['f2l|Europa|10'] == 1, P
        assert not errs, errs
        print('ok')
        await b.close()
asyncio.run(main())

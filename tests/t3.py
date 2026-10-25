# Playwright: Zeitrennen mit Strafzeit, Bestzeit und Freischaltung ab Level 2
import asyncio, os, re
from playwright.async_api import async_playwright
W = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
CODE = """() => { const src = document.querySelector('#q img.flag').src;
  return Object.keys(ORBISTA_FLAGS).find(k => ORBISTA_FLAGS[k] === src); }"""

async def neu(b, profil=None):
    pg = await (await b.new_context(viewport={'width': 390, 'height': 844})).new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    if profil:
        await pg.add_init_script("localStorage.setItem('orbista.profile',JSON.stringify(%s))" % profil)
    await pg.goto('file://' + W + 'orbista.html'); await pg.wait_for_timeout(200)
    return pg, errs

async def rennen(pg, fehler):
    await pg.click('[data-f="1"]'); await pg.click('[data-r="Europa"]'); await pg.click('[data-l="10"]'); await pg.click('#go')
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
        # Level 1: Zeitrennen gesperrt
        pg, errs = await neu(b)
        assert await pg.is_disabled('[data-f="1"]'), 'Zeitrennen müsste gesperrt sein'
        assert 'ab Level 2' in await pg.inner_text('#forms')

        # Level 2, erstes Rennen mit 2 Fehlern: 10 s Strafzeit, erste Bestzeit, +30 XP
        pg, errs = await neu(b, '{xp:100}')
        await pg.click('[data-f="1"]'); assert 'Noch keine Bestzeit' in await pg.inner_text('#raceInfo')
        txt = await rennen(pg, (2, 7)); print(txt.splitlines()[:4])
        assert '8 von 10 richtig' in txt and '10 s Strafzeit' in txt and 'Erste Bestzeit' in txt, txt
        P = await pg.evaluate("JSON.parse(localStorage.getItem('orbista.profile'))")
        best = P['best']['f2l|Europa|10']; print('Bestzeit', best)
        assert 10000 <= best < 60000, best
        assert 'Schnellste Antwort' in txt and 'Langsamste Antwort' in txt
        await pg.screenshot(path=W + 't3_ergebnis.png', full_page=True)
        await pg.click('#home'); assert 'Deine Bestzeit für diese Strecke' in await pg.inner_text('#raceInfo')
        assert not errs, errs

        # Rekord schlagen und verfehlen
        pg, errs = await neu(b, "{xp:100,best:{'f2l|Europa|10':999999}}")
        txt = await rennen(pg, ()); assert 'Neue Bestzeit' in txt and '+30 XP' in txt, txt
        pg, errs = await neu(b, "{xp:100,best:{'f2l|Europa|10':1}}")
        txt = await rennen(pg, ()); assert 'langsamer als deine Bestzeit' in txt, txt
        P = await pg.evaluate("JSON.parse(localStorage.getItem('orbista.profile'))")
        assert P['best']['f2l|Europa|10'] == 1, P
        assert not errs, errs
        print('ok')
        await b.close()
asyncio.run(main())

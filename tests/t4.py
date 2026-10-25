# Playwright: Reisepass mit Sternen, Regionsstempel (+100 XP, nur einmal) und Bestzeiten
import asyncio, os, json
from playwright.async_api import async_playwright
W = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
TODAY = "(()=>{const d=new Date();return Math.floor((d-d.getTimezoneOffset()*6e4)/864e5)})()"
CODE = """() => { const src = document.querySelector('#q img.flag').src;
  return Object.keys(ORBISTA_FLAGS).find(k => ORBISTA_FLAGS[k] === src); }"""
OZ = 'AU FJ KI MH FM NR NZ PW PG WS SB TO TV VU'.split()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('PW_CHROMIUM'))
        pg = await (await b.new_context(viewport={'width': 390, 'height': 844})).new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        # Ozeanien: alle Flaggen gekonnt (2 Sterne), aber noch nicht fällig; Bestzeit vorhanden
        karten = json.dumps({c: {'r': 3, 'w': 0, 's': 2, 'd2': 0, 'due': 'T+3'} for c in OZ}).replace('"T+3"', 'T+3')
        await pg.add_init_script("""if(!localStorage.getItem('orbista.profile')){const T=%s;
          localStorage.setItem('orbista.mastery',JSON.stringify(%s));
          localStorage.setItem('orbista.profile',JSON.stringify({xp:100,best:{'f2l|Europa|10':42300}}))}""" % (TODAY, karten))
        await pg.goto('file://' + W + 'orbista.html'); await pg.wait_for_timeout(200)

        # Reisepass vor der Runde: noch kein Stempel, 14 Länder mit Sternen, 183 grau
        await pg.click('#passBtn')
        assert await pg.is_hidden('#start') and await pg.is_hidden('#madeby')
        assert await pg.locator('.tile').count() == 197
        assert await pg.locator('.tile.grey').count() == 183
        assert await pg.locator('.stamp.on').count() == 0
        txt = await pg.inner_text('#pass'); assert '0:42,3' in txt and 'Flagge → Land · Europa · 10 Fragen' in txt, txt
        await pg.click('#passKinds [data-k="c"]'); assert await pg.locator('.tile.grey').count() == 197
        await pg.click('#passBack'); assert await pg.is_visible('#start')

        # Runde Ozeanien, alles richtig: Stempel Ozeanien · Flaggen, +100 XP
        await pg.click('[data-r="Ozeanien"]'); await pg.click('#go')
        for i in range(10):
            await pg.click('.opt[data-c="%s"]' % await pg.evaluate(CODE)); await pg.click('#nx')
        txt = await pg.inner_text('#result'); print([l for l in txt.splitlines() if 'Stempel' in l])
        assert 'Neuer Stempel im Reisepass: Ozeanien · Flaggen · +100 XP' in txt, txt
        P = await pg.evaluate("JSON.parse(localStorage.getItem('orbista.profile'))")
        assert 'Ozeanien|f' in P['stamps'] and len(P['stamps']) == 1, P

        # zweite Runde: kein zweites Mal
        await pg.click('#new')
        for i in range(10):
            await pg.click('.opt[data-c="%s"]' % await pg.evaluate(CODE)); await pg.click('#nx')
        assert 'Neuer Stempel' not in await pg.inner_text('#result')
        await pg.click('#home'); await pg.click('#passBtn')
        assert await pg.locator('.stamp.on').count() == 1
        assert await pg.get_attribute('.stamp.on', 'data-stamp') == 'Ozeanien|f'
        assert await pg.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'Querscrollen'
        await pg.screenshot(path=W + 't4_pass.png', full_page=True)
        assert not errs, errs
        print('ok')
        await b.close()
asyncio.run(main())

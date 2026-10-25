# Playwright: Reisepass mit Sternen, Regionsstempel (Visum, nur einmal) und Bestzeiten
import asyncio, os, json
from playwright.async_api import async_playwright
W = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
TODAY = "(()=>{const d=new Date();return Math.floor((d-d.getTimezoneOffset()*6e4)/864e5)})()"
CODE = "() => document.getElementById('q').dataset.code"
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
          localStorage.setItem('orbista.profile',JSON.stringify({topic:'flag',xp:100,best:{'f2l|Europa|10':42300}}))}""" % (TODAY, karten))
        await pg.goto('file://' + W + 'orbista.html'); await pg.wait_for_timeout(200)

        # Reisepass vor der Runde: noch kein Stempel, 14 Länder mit Sternen, 183 grau
        await pg.click('#passBtn')
        assert await pg.is_hidden('#home') and await pg.is_hidden('#madeby') and await pg.is_visible('#tabs')
        # Sammelalbum: zuerst die erste Region mit Lücken (Europa), Ozeanien komplett eingeklebt
        assert await pg.locator('.stamp').count() == 12 and await pg.locator('.stamp.on').count() == 0
        assert await pg.locator('.album .slot').count() == 46 and await pg.locator('.album .slot.empty').count() == 46
        await pg.click('#passRegions [data-r="Ozeanien"]')
        assert await pg.locator('.album .slot').count() == 14 and await pg.locator('.album .sticker').count() == 14
        txt = await pg.inner_text('#pass'); assert '14 von 14 eingeklebt' in txt and '0:42,3' in txt and 'Flagge → Land · Europa · 10 Fragen' in txt, txt
        await pg.click('#passKinds [data-k="c"]'); assert await pg.locator('.album .sticker').count() == 0 and await pg.locator('.album .slot.empty').count() == 14
        await pg.click('#passKinds [data-k="f"]')
        await pg.click('#tabs [data-tab="home"]'); assert await pg.is_visible('#home')

        # Runde Ozeanien, alles richtig: Visum Ozeanien · Flaggen, schaltet das Zeitrennen frei
        await pg.click('[data-p="f"]'); await pg.click('#regions [data-r="Ozeanien"]'); await pg.click('#answers [data-a="0"]'); await pg.click('#setupGo')
        for i in range(10):
            await pg.click('.opt[data-c="%s"]' % await pg.evaluate(CODE)); await pg.click('#nx')
        txt = await pg.inner_text('#result'); print([l for l in txt.splitlines() if 'Visum' in l])
        assert 'Neues Visum im Reisepass: Ozeanien · Flaggen' in txt, txt
        P = await pg.evaluate("JSON.parse(localStorage.getItem('orbista.profile'))")
        assert 'Ozeanien|f' in P['stamps'] and len(P['stamps']) == 1, P

        # zweite Runde: kein zweites Mal
        await pg.click('#new')
        for i in range(10):
            await pg.click('.opt[data-c="%s"]' % await pg.evaluate(CODE)); await pg.click('#nx')
        assert 'Neues Visum' not in await pg.inner_text('#result')
        await pg.click('#homeBtn'); assert await pg.is_enabled('[data-p="race"]'), 'Zeitrennen nach dem ersten Visum offen'
        await pg.click('#passBtn')
        assert await pg.locator('.stamp.on').count() == 1
        assert await pg.get_attribute('.stamp.on', 'data-stamp') == 'Ozeanien|f'
        assert await pg.evaluate("/\\d\\d\\.\\d\\d\\.20\\d\\d/.test(document.querySelector('.stamp.on').textContent)"), 'Datum im Stempel'
        assert 'unterwegs seit' in (await pg.inner_text('.cover')).lower() and '14 Länder besucht' in await pg.inner_text('.cover') and await pg.is_hidden('.coverstats')
        assert await pg.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'Querscrollen'
        await pg.screenshot(path=W + 't4_pass.png', full_page=True)
        assert not errs, errs
        print('ok')
        await b.close()
asyncio.run(main())

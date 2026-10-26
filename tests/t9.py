# Playwright: Gezielt üben mit Umfang „Alle“ – alle Länder einer Region in einer Runde, Abbruch zeigt das Ergebnis, Zeitrennen über alle
import asyncio, os, re
from playwright.async_api import async_playwright
W = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
CODE = "() => document.getElementById('q').dataset.code"

async def neu(b, profil='{}'):
    pg = await (await b.new_context(viewport={'width': 390, 'height': 844})).new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.add_init_script("localStorage.setItem('orbista.profile',JSON.stringify(Object.assign({topic:'flag'},%s)))" % profil)
    await pg.goto('file://' + W + 'orbista.html'); await pg.wait_for_timeout(200)
    return pg, errs

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('PW_CHROMIUM'))
        # Hauptstädte Ozeanien, alle auf einmal: jedes Land genau einmal
        pg, errs = await neu(b)
        n = await pg.evaluate("REGIONS['Ozeanien'].split(' ').length")
        await pg.click('[data-p="c"]'); await pg.click('#regions [data-r="Ozeanien"]'); await pg.click('#sizes [data-s="1"]')
        assert await pg.inner_text('#sizes [data-s="1"]') == 'Alle %d' % n
        assert 'alle %d Länder' % n in await pg.inner_text('#setupGoSub')
        await pg.click('#answers [data-a="0"]'); await pg.click('#setupGo')
        seen = []
        for i in range(n):
            await pg.wait_for_selector('.opt:not([disabled])')
            assert await pg.inner_text('#hudScore') == '%d / %d' % (i + 1, n)
            code = await pg.evaluate(CODE); seen.append(code)
            await pg.click('.opt[data-c="%s"]' % code); await pg.click('#nx')
        assert sorted(seen) == sorted(await pg.evaluate("REGIONS['Ozeanien'].split(' ')")), seen
        txt = await pg.inner_text('#result'); assert '%d / %d' % (n, n) in txt, txt
        # „Noch eine Runde“ startet wieder alle
        await pg.click('#new'); await pg.wait_for_selector('.opt:not([disabled])')
        assert await pg.inner_text('#hudScore') == '1 / %d' % n
        # nach drei Antworten beenden: Ergebnis über die drei
        for i in range(3):
            await pg.click('.opt >> nth=0'); await pg.click('#nx')
        await pg.click('#quit'); await pg.wait_for_selector('#result:not([hidden])')
        assert re.search(r'\d / 3\b', await pg.inner_text('#result')), await pg.inner_text('#result')
        # ohne Antwort beenden: zurück zur Startseite
        await pg.click('#new'); await pg.wait_for_selector('.opt:not([disabled])'); await pg.click('#quit')
        assert await pg.is_visible('#home')
        assert not errs, errs

        # Zeitrennen über alle Länder Ozeaniens: eigene Bestzeit „alle“
        pg, errs = await neu(b, "{stamps:{'Ozeanien|f':1}}")
        await pg.click('[data-p="race"]'); await pg.click('#raceKinds [data-k="f"]'); await pg.click('#regions [data-r="Ozeanien"]')
        await pg.click('#sizes [data-s="1"]'); await pg.click('#answers [data-a="0"]')
        assert 'Alle Länder der Region gegen die Uhr' in await pg.inner_text('#setupSub')
        await pg.click('#setupGo')
        for i in range(n):
            await pg.wait_for_selector('.opt:not([disabled])')
            await pg.click('.opt[data-c="%s"]' % await pg.evaluate(CODE))
        await pg.wait_for_selector('#result:not([hidden])')
        best = await pg.evaluate("JSON.parse(localStorage.getItem('orbista.profile')).best")
        assert list(best) == ['f2l|Ozeanien|alle'], best
        await pg.click('#homeBtn'); await pg.click('#passBtn')
        assert 'Flagge → Land · Ozeanien · alle Länder' in await pg.inner_text('#pass')
        # Landkarte, ganze Welt: Umfang zeigt alle Länder
        await pg.click('[data-tab="home"]'); await pg.click('[data-p="m"]'); await pg.click('#regions [data-r="Alle"]')
        assert await pg.inner_text('#sizes [data-s="1"]') == 'Alle %d' % await pg.evaluate("Object.values(REGIONS).join(' ').split(' ').length")
        assert not errs, errs
        await b.close()
    print('t9 ok')
asyncio.run(main())

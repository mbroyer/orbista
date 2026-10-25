# Playwright: Hell als Standard (auch bei System-Dunkelmodus), Umschalter Hell/Dunkel bleibt gemerkt, wichtige Knöpfe in Orange
import asyncio, os
from playwright.async_api import async_playwright
W = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
URL = 'file://' + W + 'web/orbista/index.html'
BG = "() => getComputedStyle(document.body).backgroundColor"

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('PW_CHROMIUM'))
        for w, h in ((390, 844), (1180, 820)):
            ctx = await b.new_context(viewport={'width': w, 'height': h}, color_scheme='dark')
            pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(URL); await pg.evaluate("localStorage.setItem('orbista.profile', JSON.stringify({topic:'flag', goalQ:10}))"); await pg.reload()
            assert await pg.evaluate("document.documentElement.dataset.theme") == 'light'
            assert await pg.evaluate(BG) == 'rgb(243, 238, 227)', await pg.evaluate(BG)
            go = await pg.evaluate("getComputedStyle(document.getElementById('go')).backgroundColor"); assert go == 'rgb(229, 138, 51)', go
            await pg.screenshot(path=W + 't7_hell_%d.png' % w, full_page=True)
            await pg.click('#home .themebtn'); await pg.reload()
            assert await pg.evaluate("document.documentElement.dataset.theme") == 'dark'
            assert await pg.evaluate(BG) == 'rgb(17, 26, 36)'
            assert await pg.get_attribute('#home .themebtn', 'aria-label') == 'Hellen Modus einschalten'
            await pg.screenshot(path=W + 't7_dunkel_%d.png' % w, full_page=True)
            # im Reisepass zurück auf Hell
            await pg.click('#passBtn'); await pg.click('#pass .themebtn')
            assert await pg.evaluate("localStorage.getItem('orbista.theme')") == 'light' and await pg.evaluate(BG) == 'rgb(243, 238, 227)'
            await pg.click('[data-tab="home"]'); await pg.click('#go')
            await pg.click('.opt >> nth=0'); nx = await pg.evaluate("getComputedStyle(document.getElementById('nx')).backgroundColor"); assert nx == 'rgb(229, 138, 51)', nx
            await pg.screenshot(path=W + 't7_frage_%d.png' % w)
            assert not errs, errs
            await ctx.close()
        await b.close()
    print('t7 ok')
asyncio.run(main())

# Playwright bei 390 px: alle drei Spielarten einmal durchspielen, Übernahme des Flaggo-Stands, kein Querscrollen
import asyncio, os, json
from playwright.async_api import async_playwright
W = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'

async def runde(pg, mode):
    await pg.click('[data-m="%s"]' % mode)
    await pg.click('[data-r="Europa"]'); await pg.click('[data-l="10"]'); await pg.click('#go')
    for i in range(10):
        if mode == 'type':
            await pg.fill('#ti', 'Deutschland'); await pg.click('#tf button[type=submit]')
        else:
            await pg.click('.opt >> nth=0')
        await pg.click('#nx')
    assert await pg.is_visible('#result'), mode
    print(mode, await pg.inner_text('#result .score'))
    await pg.click('#home')

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
        lab = await pg.text_content('#mastLabel'); print(lab)
        assert lab.startswith('Sicher gekonnt: 2 von'), lab
        assert await pg.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'Querscrollen'
        assert await pg.evaluate("[...document.images].every(i=>i.complete&&i.naturalWidth>0)"), 'Bild fehlt'
        await pg.screenshot(path=W + 't1_start.png', full_page=True)
        for m in ('f2l', 'l2f', 'type'):
            await runde(pg, m)
        await pg.screenshot(path=W + 't1_ende.png', full_page=True)
        assert await pg.evaluate("!!localStorage.getItem('orbista.mastery')")
        assert not errs, errs
        print('ok')
        await b.close()
asyncio.run(main())

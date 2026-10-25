# Playwright bei 390 px: alle Spielarten aller Themen einmal durchspielen, Hauptstädte richtig tippen, Übernahme des Flaggo-Stands, kein Querscrollen
import asyncio, os, json
from playwright.async_api import async_playwright
W = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'

# Kürzel der gezeigten Flagge, daraus die Hauptstadt (klein und ohne Akzente getippt, prüft die Schreibweisen-Toleranz)
CAP_JS = """() => { const src = document.querySelector('#q img.flag').src;
  const code = Object.keys(ORBISTA_FLAGS).find(k => ORBISTA_FLAGS[k] === src);
  return ORBISTA_DATA.CAPITAL[code].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }"""

async def runde(pg, topic, mode, richtig=False):
    await pg.click('[data-t="%s"]' % topic)
    await pg.click('[data-m="%s"]' % mode)
    await pg.click('[data-r="Europa"]'); await pg.click('[data-l="10"]'); await pg.click('#go')
    for i in range(10):
        if richtig:
            await pg.fill('#ti', await pg.evaluate(CAP_JS)); await pg.click('#tf button[type=submit]')
        elif mode.endswith('type'):
            await pg.fill('#ti', 'Deutschland'); await pg.click('#tf button[type=submit]')
        else:
            await pg.click('.opt >> nth=0')
        await pg.click('#nx')
    assert await pg.is_visible('#result'), mode
    score = await pg.inner_text('#result .score'); print(topic, mode, score)
    if richtig: assert score == '10 / 10', score
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
        for t, m in (('flag', 'f2l'), ('flag', 'l2f'), ('flag', 'type'), ('cap', 'l2c'), ('cap', 'c2l'),
                     ('cap', 'ctype'), ('both', 'f2c'), ('both', 'fctype')):
            await runde(pg, t, m)
        await runde(pg, 'cap', 'ctype', richtig=True)
        await runde(pg, 'both', 'fctype', richtig=True)
        caps = await pg.evaluate("JSON.parse(localStorage.getItem('orbista.capitals'))")
        assert sum(v['r'] for v in caps.values()) >= 20, caps
        await pg.click('[data-t="cap"]')
        assert (await pg.text_content('#mastTitle')) == 'Hauptstädte'
        await pg.click('[data-t="flag"]')
        await pg.screenshot(path=W + 't1_ende.png', full_page=True)
        assert await pg.evaluate("!!localStorage.getItem('orbista.mastery')")
        assert not errs, errs
        print('ok')
        await b.close()
asyncio.run(main())

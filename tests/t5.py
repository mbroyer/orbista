# Playwright: Spielstand sichern und auf einem anderen Gerät wiederherstellen, Hinweis auf den Home-Bildschirm nur auf iPhone und iPad
import asyncio, os, json
from playwright.async_api import async_playwright
W = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

async def neu(b, init=None, **kw):
    pg = await (await b.new_context(viewport={'width': 390, 'height': 844}, **kw)).new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    if init: await pg.add_init_script(init)
    await pg.goto('file://' + W + 'orbista.html'); await pg.wait_for_timeout(200)
    return pg, errs

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('PW_CHROMIUM'))
        # Gerät A: Stand mit Sternen und XP, Code erzeugen
        store = {'orbista.mastery': {'DE': {'r': 3, 'w': 0, 's': 2, 'due': 99999}}, 'orbista.capitals': {'FR': {'r': 1, 'w': 0, 's': 1, 'due': 99999}},
                 'orbista.profile': {'topic': 'both', 'xp': 450, 'goal': 100}}
        a, errs = await neu(b, "if(!localStorage.getItem('orbista.profile')){const S=%s;for(const k in S)localStorage.setItem(k,JSON.stringify(S[k]))}" % json.dumps(store), permissions=['clipboard-read', 'clipboard-write'])
        assert await a.is_hidden('#homeHint'), 'Hinweis nur auf iPhone und iPad'
        await a.click('#passBtn'); await a.click('#copyCode')
        code = await a.input_value('#codeIn')
        if not code: code = await a.evaluate('navigator.clipboard.readText()')
        assert code.startswith('ORBISTA1:'), code[:20]
        assert not errs, errs

        # Gerät B (iPhone): Hinweis sichtbar, falscher Code abgelehnt, richtiger Code nach Bestätigung übernommen
        bb, errs = await neu(b, "localStorage.getItem('orbista.profile')||localStorage.setItem('orbista.profile','{\"topic\":\"flag\"}')", user_agent=IPHONE, has_touch=True)
        assert await bb.is_visible('#homeHint'); await bb.click('#hintOk'); assert await bb.is_hidden('#homeHint')
        await bb.click('#passBtn')
        await bb.fill('#codeIn', 'irgendwas'); await bb.click('#restore')
        assert 'kein Orbista-Code' in await bb.inner_text('#saveMsg')
        await bb.fill('#codeIn', code[:-8]); await bb.click('#restore'); await bb.click('#restore')
        assert 'beschädigt' in await bb.inner_text('#saveMsg')
        await bb.fill('#codeIn', code); await bb.click('#restore')
        assert 'ersetzt' in await bb.inner_text('#saveMsg')
        await bb.click('#restore'); await bb.wait_for_timeout(1200)
        P = await bb.evaluate("JSON.parse(localStorage.getItem('orbista.profile'))")
        assert P['xp'] == 450 and P['topic'] == 'both', P
        assert (await bb.inner_text('#lvlPill')).startswith('Level 3'), await bb.inner_text('#lvlPill')
        assert '1 von 197 gekonnt' in await bb.inner_text('#paths')
        assert await bb.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'Querscrollen'
        assert not errs, errs
        print('ok')
        await b.close()
asyncio.run(main())

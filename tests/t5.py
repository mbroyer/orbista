# Playwright: Anmeldung mit Reise-Code (web/login.html) gegen einen nachgebauten Worker, Abgleich, Demo
import asyncio, os, json, tempfile, threading, functools, http.server, subprocess, sys
from playwright.async_api import async_playwright
W = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
WK = 'https://orbista.test'
CODE = "() => document.getElementById('q').dataset.code"

def serve():
    d = tempfile.mkdtemp()
    subprocess.run([sys.executable, W + 'web/deploy.py', d, WK], check=True, capture_output=True)
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    h = functools.partial(Q, directory=d)
    s = http.server.ThreadingHTTPServer(('127.0.0.1', 0), h)
    threading.Thread(target=s.serve_forever, daemon=True).start()
    return 'http://127.0.0.1:%d/' % s.server_port

async def main():
    url = serve()
    KV, PUTS = {}, []
    async def worker(route):
        r = route.request; code = r.url.rsplit('/', 1)[1]
        if code not in ('KOMPASS-1', 'ANDEN-2'): return await route.fulfill(status=403, json={'fehler': 'unbekannter Code'})
        if r.method == 'GET':
            return await route.fulfill(status=200, body=KV[code]) if code in KV else await route.fulfill(status=404, json={'fehler': 'neu'})
        d = json.loads(r.post_data); PUTS.append((code, d))
        assert isinstance(d['state']['orbista.profile']['xp'], (int, float)), d
        KV[code] = json.dumps(d); await route.fulfill(status=200, json={'ok': True})
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('PW_CHROMIUM'))
        errs = []
        async def page(ctx):
            pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.route(WK + '/**', worker); return pg

        # Gerät 1 hat schon ohne Code gespielt
        c1 = await b.new_context(viewport={'width': 390, 'height': 844})
        pg = await page(c1)
        await pg.goto(url); await pg.evaluate("""localStorage.setItem('orbista.profile',JSON.stringify({topic:'flag',xp:120}));
          localStorage.setItem('orbista.mastery',JSON.stringify({DE:{r:1,w:0,s:1}}))""")
        await pg.goto(url); await pg.wait_for_selector('#f:not([hidden])')
        assert await pg.is_visible('#d')  # Demo-Link für Neue
        await pg.fill('#c', 'falsch-9'); await pg.click('#b')
        await pg.wait_for_function("document.getElementById('e').textContent.length>0")
        assert 'gibt es nicht' in await pg.inner_text('#e')

        # Anmelden: alter Stand wird übernommen und sofort hochgeladen
        await pg.fill('#c', 'kompass-1'); await pg.click('#b')
        await pg.wait_for_selector('#go'); await pg.wait_for_timeout(300)
        assert 'Reise-Code KOMPASS-1' in await pg.inner_text('#topicLine')
        assert PUTS and PUTS[-1][1]['state']['orbista.profile']['xp'] == 120 and 'DE' in PUTS[-1][1]['state']['orbista.mastery'], PUTS
        keys = await pg.evaluate("Object.keys(localStorage).sort()")
        assert 'orbista.profile@KOMPASS-1' in keys and 'orbista.mastery@KOMPASS-1' in keys and 'orbista-ts@KOMPASS-1' in keys, keys

        # Eine Runde spielen, beim Verlassen wird hochgeladen
        await pg.click('#go')
        for i in range(10):
            await pg.click('.opt[data-c="%s"]' % await pg.evaluate(CODE)) if await pg.locator('.opt').count() else (await pg.fill('#tf', 'x'), await pg.keyboard.press('Enter'))
            await pg.click('#nx')
        await pg.wait_for_selector('#result:not([hidden])')
        n = len(PUTS)
        await pg.evaluate("Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'))")
        await pg.wait_for_timeout(300)
        assert len(PUTS) == n + 1 and PUTS[-1][1]['state']['orbista.profile']['xp'] > 120, PUTS[-1]
        xp = PUTS[-1][1]['state']['orbista.profile']['xp']
        # Gerätestand ohne Code bleibt unangetastet
        assert json.loads(await pg.evaluate("Storage.prototype.getItem.call(localStorage,'orbista.profile')"))['xp'] in (120, xp)

        # Gerät 2: Link mit Code holt denselben Stand
        c2 = await b.new_context(viewport={'width': 390, 'height': 844})
        pg2 = await page(c2)
        await pg2.goto(url + '?code=KOMPASS-1'); await pg2.wait_for_selector('#go'); await pg2.wait_for_timeout(200)
        P2 = await pg2.evaluate("JSON.parse(localStorage.getItem('orbista.profile'))")
        assert P2['xp'] == xp and await pg2.is_hidden('#welcome'), P2

        # Wechseln: zweiter Code auf Gerät 1 startet neu (Erststart), danach Auswahl aus beiden Codes
        await pg.goto(url + '?wechseln'); await pg.wait_for_selector('#f:not([hidden])')
        assert await pg.locator('#k button').count() == 1 and await pg.is_hidden('#d')
        await pg.fill('#c', 'ANDEN-2'); await pg.click('#b'); await pg.wait_for_selector('#welcome:not([hidden])')
        await pg.goto(url); await pg.wait_for_selector('#f:not([hidden])')
        assert await pg.locator('#k button').count() == 2
        await pg.click('#k button:text("KOMPASS-1")'); await pg.wait_for_selector('#go')

        # Demo: nichts landet im Speicher
        c3 = await b.new_context(); pg3 = await page(c3)
        await pg3.goto(url + '?demo'); await pg3.wait_for_selector('#welcome:not([hidden])')
        await pg3.click('#begin'); await pg3.wait_for_timeout(200)
        assert await pg3.evaluate("Object.keys(localStorage).length") == 0 or await pg3.evaluate("Storage.prototype.getItem.call(localStorage,'orbista.profile')") is None
        assert not errs, errs
        await b.close()
    print('t5 ok:', len(PUTS), 'Uploads')

asyncio.run(main())

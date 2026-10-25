# Playwright: Sterne, Fälligkeit, XP, Level, Tagesziel und Serie mit Ruhetag
import asyncio, os, json
from playwright.async_api import async_playwright
W = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
TODAY = "(()=>{const d=new Date();return Math.floor((d-d.getTimezoneOffset()*6e4)/864e5)})()"
CODE = "() => document.getElementById('q').dataset.code"
MODE = "() => document.getElementById('q').dataset.mode"

async def neu(b, store=None):
    pg = await (await b.new_context(viewport={'width': 390, 'height': 844})).new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    # Thema Flaggen ist gewählt, der erste Start ist erledigt (ein Profil im Store ergänzt das Thema)
    await pg.add_init_script("if(!localStorage.getItem('orbista.profile'))localStorage.setItem('orbista.profile','{\"topic\":\"flag\"}')")
    if store:
        await pg.add_init_script("const T=%s;const S=%s;for(const k in S)localStorage.setItem(k,JSON.stringify(S[k]))"
                                 % (TODAY, store))
    await pg.goto('file://' + W + 'orbista.html'); await pg.wait_for_timeout(200)
    return pg, errs

async def richtig(pg, n):
    # Auswahlfrage: die Option des gefragten Landes antippen
    for i in range(n):
        code = await pg.evaluate(CODE)
        await pg.click('.opt[data-c="%s"]' % code); await pg.click('#nx')

async def get(pg, k):
    return await pg.evaluate("JSON.parse(localStorage.getItem('%s'))" % k)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('PW_CHROMIUM'))
        T = None
        # 1. Neue Runde, 10 richtig: 10 Grund + 70 Serienbonus + 200 neue Sterne + 30 perfekte Runde = 400 XP, Level 3
        pg, errs = await neu(b)
        T = await pg.evaluate(TODAY)
        sub = await pg.inner_text('#goSub'); assert sub == '10 Fragen · Europa', sub
        await pg.click('#go'); await richtig(pg, 10)
        P = await get(pg, 'orbista.profile'); print('XP', P['xp'], 'Serie', P['streak'])
        assert P['xp'] == 400 and P['streak'] == 1 and P['goalDay'] == T, P
        txt = await pg.inner_text('#result'); assert '+400 XP' in txt and 'Level 3 erreicht' in txt and 'Tagesziel geschafft' in txt, txt
        M = await get(pg, 'orbista.mastery'); assert len(M) == 10 and all(m['s'] == 1 and m['due'] == T + 1 for m in M.values()), M
        await pg.click('#homeBtn'); assert (await pg.text_content('#lvlPill')) == 'Level 3 · Tourist'
        await pg.screenshot(path=W + 't2_start.png', full_page=True)
        assert not errs, errs

        # 2. Serie: gestern geschafft → 5; vorgestern mit freiem Ruhetag → 5 und Ruhetag verbraucht; länger her → 0, dann 1
        for goalDay, rest, vorher, nachher in (('T-1', -1, 4, 5), ('T-2', -1, 4, 5), ('T-3', -1, 0, 1)):
            store = '{"orbista.profile":{topic:"flag",xp:0,day:T-1,dayXp:60,goal:30,streak:4,goalDay:%s,restWeek:%d}}' % (goalDay, rest)
            pg, errs = await neu(b, store)
            sk = int((await pg.inner_text('.streak b')).strip()); assert sk == vorher, (goalDay, sk)
            await pg.click('#go'); await richtig(pg, 5)
            P = await get(pg, 'orbista.profile'); print('Serie', goalDay, sk, '→', P['streak'])
            assert P['streak'] == nachher and P['goalDay'] == T, (goalDay, P)
            if goalDay == 'T-2': assert P['restWeek'] != -1
            assert P['goalQ'] == 5 and 'goal' not in P, P  # altes Ziel 30 XP → 5 Fragen
            assert not errs, errs

        # 3. Sterne: zweiter Stern erst an einem neuen Tag, dritter nach getippter Antwort und 7 Tagen; Fehler kostet einen Stern
        def karten(w):
            return json.dumps({c: w for c in 'AL AD AT BY BE BA BG HR CY CZ DK EE FI FR DE GR HU IS IE IT XK LV LI LT LU MT MD MC ME NL MK NO PL PT RO RU SM RS SK SI ES SE CH UA GB VA'.split()})
        for start, ok, soll in (({'r': 1, 'w': 0, 's': 1, 'd1': 'T-1', 'due': 'T'}, True, 2),
                                ({'r': 1, 'w': 0, 's': 1, 'd1': 'T', 'due': 'T'}, True, 1),
                                ({'r': 3, 'w': 0, 's': 2, 'd2': 'T-8', 't': 1, 'due': 'T'}, True, 3),
                                ({'r': 3, 'w': 0, 's': 2, 'd2': 'T-8', 'due': 'T'}, True, 2),
                                ({'r': 3, 'w': 0, 's': 2, 'd2': 'T-8', 't': 1, 'due': 'T'}, False, 1)):
            store = '{"orbista.mastery":%s}' % karten(start).replace('"T-1"', 'T-1').replace('"T-8"', 'T-8').replace('"T"', 'T')
            pg, errs = await neu(b, store)
            await pg.click('[data-p="f"]'); await pg.click('#regions [data-r="Europa"]'); await pg.click('#setupGo')
            code = await pg.evaluate(CODE)
            if ok: await pg.click('.opt[data-c="%s"]' % code)
            else: await pg.click('.opt:not([data-c="%s"]) >> nth=0' % code)
            m = (await get(pg, 'orbista.mastery'))[code]; print('Sterne', start['s'], ok, '→', m['s'])
            assert m['s'] == soll, (start, ok, m)
            assert not errs, errs

        # 4. Fälligkeit: nur ein Land ist fällig, es kommt zuerst dran
        store = '{"orbista.mastery":%s}' % karten({'r': 5, 'w': 0, 's': 3, 'due': 'T+10'}).replace('"T+10"', 'T+10')
        store = store.replace('"FR": {"r": 5, "w": 0, "s": 3, "due": T+10}', '"FR": {"r": 5, "w": 2, "s": 1, "due": T}')
        assert '"due": T}' in store
        pg, errs = await neu(b, store)
        await pg.click('[data-p="f"]'); await pg.click('#regions [data-r="Europa"]'); await pg.click('#setupGo')
        code = await pg.evaluate(CODE); print('zuerst', code); assert code == 'FR', code
        await pg.click('#quit'); assert '1 zum Wiederholen' in await pg.inner_text('#goSub')
        await pg.click('#go'); code = await pg.evaluate(CODE); assert code == 'FR', code
        assert not errs, errs

        # 5. Weiterreisen: Karten mit zwei Sternen werden getippt
        store = '{"orbista.mastery":%s}' % karten({'r': 3, 'w': 0, 's': 2, 'd2': 'T-1', 'due': 'T'}).replace('"T-1"', 'T-1').replace('"T"', 'T')
        pg, errs = await neu(b, store)
        assert (await pg.inner_text('#goSub')) == '10 Wiederholungen'
        await pg.click('#go'); m = await pg.evaluate(MODE); print('Spielart', m); assert m == 'type', m
        assert not errs, errs
        print('ok')
        await b.close()
asyncio.run(main())

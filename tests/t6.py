# Playwright: Landkarte („Wo liegt …?“ mit echten Klicks, markiertes Land, Zoom, Verschieben), eigene Karte orbista.map, Reisepass, Desktop
import asyncio, os, json
from playwright.async_api import async_playwright
W = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
Q = "() => ({c: document.getElementById('q').dataset.code, m: document.getElementById('q').dataset.mode})"
# eine Stelle auf dem Bildschirm, an der wirklich das gesuchte Land liegt (nicht ein Nachbar oder ein Kreis)
SPOT = """c => { const el = document.querySelector(`#map path[data-c="${c}"]`); if (!el) return null; const r = el.getBoundingClientRect();
  for (let i = 1; i < 12; i++) for (let j = 1; j < 12; j++) { const x = r.left + r.width * i / 12, y = r.top + r.height * j / 12;
    const t = document.elementFromPoint(x, y); if (t && t.closest && t.closest('[data-c]') === el) return [x, y]; } return null; }"""

async def setup(pg, region, typing):
    await pg.click('[data-p="m"]'); await pg.click('#regions [data-r="%s"]' % region)
    await pg.click('#answers [data-a="%d"]' % typing); await pg.click('#setupGo')

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('PW_CHROMIUM'))
        pg = await (await b.new_context(viewport={'width': 390, 'height': 844})).new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.add_init_script("if(!localStorage.getItem('orbista.profile'))localStorage.setItem('orbista.profile','{\"topic\":\"map\",\"xp\":0}')")
        await pg.goto('file://' + W + 'orbista.html'); await pg.wait_for_timeout(200)

        # Kartendaten: jedes Land hat Umriss oder Kreis und liegt im Ausschnitt seiner Region (Ozeanien über die Datumsgrenze hinweg)
        bad = await pg.evaluate("""() => { const M = ORBISTA_MAP, D = ORBISTA_DATA, out = [];
          for (const [r, l] of Object.entries(D.REGIONS)) for (const c of l.split(' ')) { const b = M.box[c], v = M.view[r];
            if (!b || (c !== 'RU' && !(b[0] > v[0] && b[0] < v[0] + v[2] && b[1] > v[1] && b[1] < v[1] + v[3]))) out.push(c); } return out; }""")
        assert bad == [], bad
        assert 'Landkarte' in await pg.inner_text('#paths') and 'Länder auf der Landkarte' in await pg.inner_text('#topicLine')

        # 1. Gezielt üben, Europa, Auswählen: nur loc und mark; loc mit echtem Klick ins Land, einmal falsch, sonst richtig
        await setup(pg, 'Europa', 0)
        seen, wrong, panned = set(), False, False
        for i in range(10):
            q = await pg.evaluate(Q); seen.add(q['m'])
            assert await pg.is_visible('#map'), q
            if q['m'] == 'loc':
                assert await pg.locator('#map.tap').count() == 1 and await pg.locator('.maphead .flag').count() == 1
                if not panned:  # Verschieben antwortet nicht
                    vb = await pg.get_attribute('#map svg', 'viewBox'); box = await pg.locator('#map svg').bounding_box()
                    await pg.mouse.move(box['x'] + 150, box['y'] + 120); await pg.mouse.down()
                    await pg.mouse.move(box['x'] + 200, box['y'] + 160, steps=5); await pg.mouse.up()
                    assert await pg.get_attribute('#map svg', 'viewBox') != vb and await pg.is_hidden('#nx'); panned = True
                    await pg.click('#map .zoom [data-z="1.66"]')
                other = 'DE' if q['c'] != 'DE' else 'FR'
                target = other if not wrong else q['c']
                spot = await pg.evaluate(SPOT, target)
                if spot is None:  # zu klein für einen Klick: heranzoomen hilft, sonst über den Kreis
                    await pg.locator('#map circle[data-c="%s"]' % target).dispatch_event('pointerup')
                else:
                    await pg.mouse.click(*spot)
                if not wrong:
                    assert await pg.locator('#map .bad[data-c="%s"]' % other).count() >= 1 and await pg.locator('#map .ok[data-c="%s"]' % q['c']).count() >= 1
                    assert 'Das war' in await pg.inner_text('#fb'); wrong = True
            else:
                assert q['m'] == 'mark' and await pg.locator('#map .hi[data-c="%s"]' % q['c']).count() >= 1
                await pg.click('.opt[data-c="%s"]' % q['c'])
                assert await pg.locator('#map .ok[data-c="%s"]' % q['c']).count() >= 1
            if i == 0: await pg.screenshot(path=W + 't6_frage.png')
            await pg.click('#nx')
        print('Europa', sorted(seen), await pg.inner_text('#result .score'))
        assert seen <= {'loc', 'mark'}
        Mm = await pg.evaluate("JSON.parse(localStorage.getItem('orbista.map'))")
        assert len(Mm) == 10 and await pg.evaluate("!localStorage.getItem('orbista.mastery')"), Mm
        await pg.click('#homeBtn')

        # 2. Eintippen: markiertes Land, Name tippen (auch „Holland“)
        await setup(pg, 'Europa', 1)
        for i in range(10):
            q = await pg.evaluate(Q); assert q['m'] == 'mtype', q
            name = await pg.evaluate("c => ORBISTA_DATA.NAME_FIX[c] || new Intl.DisplayNames(['de'], {type: 'region'}).of(c)", q['c'])
            await pg.fill('#ti', 'holland' if q['c'] == 'NL' else name); await pg.click('#tf button[type=submit]')
            assert 'Richtig' in await pg.inner_text('#fb'), (q, name)
            await pg.click('#nx')
        assert await pg.inner_text('#result .score') == '10 / 10'
        await pg.click('#homeBtn')

        # 3. Ozeanien: Samoa und Tonga liegen rechts von Australien auf derselben Karte
        await setup(pg, 'Ozeanien', 0)
        x = await pg.evaluate("() => ['AU','WS','TO','FJ'].map(c => document.querySelector(`#map [data-c=\"${c}\"]`).getBoundingClientRect().left)")
        assert x[0] < x[3] < x[1] and x[0] < x[2], x
        await pg.screenshot(path=W + 't6_ozeanien.png')
        await pg.click('#quit')

        # 4. Reisepass: drei Visa je Region, Album mit Tab Landkarte
        await pg.click('#passBtn')
        assert await pg.locator('.stamp').count() == 18 and await pg.locator('.stamp.m').count() == 6
        await pg.click('#passKinds [data-k="m"]'); assert await pg.locator('.album .slot:not(.empty)').count() >= 10
        assert await pg.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'Querscrollen'
        await pg.screenshot(path=W + 't6_pass.png', full_page=True)

        # 5. Desktop: Karte links, Frage und Antworten rechts, nichts ragt heraus
        pg2 = await (await b.new_context(viewport={'width': 1280, 'height': 800})).new_page()
        pg2.on('pageerror', lambda e: errs.append(str(e)))
        await pg2.add_init_script("localStorage.setItem('orbista.profile','{\"topic\":\"map\",\"xp\":0}')")
        await pg2.goto('file://' + W + 'orbista.html'); await pg2.wait_for_timeout(200)
        await setup(pg2, 'Afrika', 0)
        m, h = await pg2.locator('#map').bounding_box(), await pg2.locator('#q h2').bounding_box()
        assert m['x'] + m['width'] <= h['x'] and m['y'] + m['height'] <= 800, (m, h)
        await pg2.screenshot(path=W + 't6_desktop.png')
        assert not errs, errs
        print('t6 ok')
        await b.close()
asyncio.run(main())

# Playwright: Handy – Weiter-Knopf nach der Antwort im sichtbaren Bereich; Landkarte zoomt per Zwei-Finger-Geste
import asyncio, os
from playwright.async_api import async_playwright
W = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'
URL = 'file://' + W + 'web/orbista/index.html'
TAP = "c=>{const e=document.querySelector('.mapbox [data-c='+JSON.stringify(c)+']');for(const t of ['pointerdown','pointerup'])e.dispatchEvent(new PointerEvent(t,{bubbles:true,pointerId:1}))}"
PINCH = """f=>{const s=document.querySelector('.mapbox svg'),r=s.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,
  ev=(t,id,x)=>s.dispatchEvent(new PointerEvent(t,{bubbles:true,pointerId:id,clientX:x,clientY:cy}));
  ev('pointerdown',1,cx-40);ev('pointerdown',2,cx+40);ev('pointermove',1,cx-40*f);ev('pointermove',2,cx+40*f);ev('pointerup',1,cx-40*f);ev('pointerup',2,cx+40*f);
  return +s.getAttribute('viewBox').split(' ')[2]}"""
VBW = "+document.querySelector('.mapbox svg').getAttribute('viewBox').split(' ')[2]"

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('PW_CHROMIUM'))
        for topic in ('map', 'flag', 'cap'):
            for w, h in ((375, 560), (390, 664)):
                ctx = await b.new_context(viewport={'width': w, 'height': h}); pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
                await pg.goto(URL); await pg.evaluate("t=>localStorage.setItem('orbista.profile', JSON.stringify({topic:t, goalQ:10}))", topic); await pg.reload()
                await pg.click('#go')
                for i in range(5):
                    if topic == 'map' and i == 0:
                        w0 = await pg.evaluate(VBW); w1 = await pg.evaluate(PINCH, 2)
                        assert abs(w1 - w0 / 2) < w0 * .02, (w0, w1)  # Finger auseinander = doppelt so nah
                        w2 = await pg.evaluate(PINCH, .5); assert abs(w2 - w0) < w0 * .02, (w0, w2)
                    if await pg.is_visible('.opt >> nth=0'): await pg.click('.opt >> nth=1')
                    elif await pg.is_visible('#skip'): await pg.click('#skip')
                    else: await pg.evaluate(TAP, await pg.get_attribute('#q', 'data-code'))
                    await pg.wait_for_selector('#nx', timeout=3000)
                    bot = await pg.evaluate("document.getElementById('nx').getBoundingClientRect().bottom")
                    assert bot <= h, (topic, w, await pg.get_attribute('#q', 'data-mode'), bot, h)
                    if i == 0: await pg.screenshot(path=W + 't8_%s_%d.png' % (topic, w))
                    await pg.click('#nx')
                assert not errs, errs
                await ctx.close()
        await b.close()
    print('t8 ok')
asyncio.run(main())

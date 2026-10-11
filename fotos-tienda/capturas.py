import asyncio, re
from playwright.async_api import async_playwright
B="https://www.lumifiesta.com"; T="preview_theme_id=207987900753"; D="fotos-tienda/capturas/"
async def main():
    log=open(D+"log.txt","w")
    def L(*a): log.write(" ".join(str(x) for x in a)+"\n"); log.flush()
    async with async_playwright() as p:
        b=await p.chromium.launch()
        ctx=await b.new_context(viewport={"width":390,"height":844}, locale="es-ES", has_touch=True, is_mobile=True, timezone_id="Europe/Madrid")
        pg=await ctx.new_page(); errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)[:300]))
        await pg.goto(B+"/products/lampara-proyectora-de-luna-usb-halloween-y-navidad?"+T, timeout=90000, wait_until="load"); await pg.wait_for_timeout(5000)
        acc=pg.locator("button:has-text('Aceptar')").first
        if await acc.count(): await acc.click(); await pg.wait_for_timeout(800)
        t=await pg.evaluate("document.body.innerText")
        L("menciones AliExpress en ficha:",[l.strip()[:120] for l in t.splitlines() if 'AliExpress' in l])
        L("resumen:",await pg.evaluate("(document.querySelector('.lf-rv-sum')||{}).innerText"))
        L("chat oculto arriba:",await pg.evaluate("getComputedStyle(document.querySelector('.lf-help')).opacity"))
        await pg.goto(B+"/collections/all?"+T, timeout=90000, wait_until="load"); await pg.wait_for_timeout(4000)
        L("tarjetas:",await pg.evaluate("[...document.querySelectorAll('.lf-rating')].slice(0,4).map(e=>e.innerText.replace(/\\s+/g,' '))"))
        y=await pg.evaluate("document.querySelector('product-card').getBoundingClientRect().top+window.scrollY")
        await pg.evaluate(f"window.scrollTo(0,{y}-80)"); await pg.wait_for_timeout(1200); await pg.screenshot(path=D+"v19_cards.png")
        L("errores js:",errs); await b.close()
asyncio.run(main())

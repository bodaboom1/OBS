import asyncio, re
from playwright.async_api import async_playwright
B="https://www.lumifiesta.com"
D="fotos-tienda/capturas/"
async def main():
    log=open(D+"log.txt","w")
    def L(*a): log.write(" ".join(str(x) for x in a)+"\n"); log.flush()
    async with async_playwright() as p:
        b=await p.chromium.launch()
        ctx=await b.new_context(viewport={"width":390,"height":844}, locale="es-ES", has_touch=True, is_mobile=True, timezone_id="Europe/Madrid")
        pg=await ctx.new_page(); errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)[:300]))
        for path,n,maxs in [("/","home",12),("/products/lampara-proyectora-de-luna-usb-halloween-y-navidad","prod",12),("/collections/all","col",6)]:
            await pg.goto(B+path, timeout=90000, wait_until="load"); await pg.wait_for_timeout(5000)
            H=await pg.evaluate("document.documentElement.scrollHeight"); L(n,"altura",H)
            y=0;i=0
            while y<H and i<maxs:
                await pg.evaluate(f"window.scrollTo(0,{y})"); await pg.wait_for_timeout(1300)
                await pg.screenshot(path=D+f"s_{n}_{i:02d}.png"); y+=780; i+=1
        L("errores js:",errs)
        await b.close()
asyncio.run(main())

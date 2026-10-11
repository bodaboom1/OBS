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
        pg=await ctx.new_page(); errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)[:200]))
        for path,n in [("/","home"),("/products/red-de-telarana-led-para-halloween-8-modos","telarana"),("/products/lampara-proyectora-de-luna-usb-halloween-y-navidad","proyector")]:
            await pg.goto(B+path, timeout=90000, wait_until="load"); await pg.wait_for_timeout(5000)
            await pg.screenshot(path=D+f"m_{n}.png")
            txt=await pg.evaluate("document.body.innerText")
            L("==",n); L("halloween/10 oct:",[l.strip() for l in txt.splitlines() if re.search(r"(?i)halloween|10 de oct|antes del|llega|recíbelo|entre el",l)][:15])
            L("primeras lineas:",[l.strip() for l in txt.splitlines() if l.strip()][:25])
        L("errores:",errs)
        await b.close()
asyncio.run(main())

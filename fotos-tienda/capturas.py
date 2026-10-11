import asyncio, re
from playwright.async_api import async_playwright
B="https://www.lumifiesta.com"
D="fotos-tienda/capturas/"
async def main():
    log=open(D+"log.txt","w")
    def L(*a): log.write(" ".join(str(x) for x in a)+"\n"); log.flush()
    async with async_playwright() as p:
        b=await p.chromium.launch()
        ctx=await b.new_context(viewport={"width":390,"height":844}, locale="es-ES", has_touch=True, is_mobile=True, timezone_id="Europe/Madrid", device_scale_factor=2)
        pg=await ctx.new_page(); errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)[:300])); cons=[]
        pg.on("console", lambda m: cons.append(m.type+": "+m.text[:200]) if m.type in ("error","warning") else None)
        await pg.goto(B+"/", timeout=90000, wait_until="load"); await pg.wait_for_timeout(6000)
        await pg.screenshot(path=D+"m_01_home_top.png")
        # cerrar popups visibles
        L("popups:", await pg.evaluate("[...document.querySelectorAll('dialog[open],[class*=popup],[class*=modal]')].filter(e=>e.offsetParent).map(e=>e.className.toString().slice(0,60))"))
        await pg.screenshot(path=D+"m_02_home_full.png", full_page=True)
        # botones del header
        L("header buttons:", await pg.evaluate("[...document.querySelectorAll('header button, header a, header summary')].filter(e=>e.offsetParent).map(e=>(e.getAttribute('aria-label')||e.innerText||e.tagName).trim().slice(0,30)+' @'+Math.round(e.getBoundingClientRect().left))"))
        menu=pg.locator("header summary, header button[aria-label*=men i], header [class*=menu-drawer] summary").first
        L("menu count:", await menu.count())
        if await menu.count():
            await menu.click(); await pg.wait_for_timeout(1500)
            await pg.screenshot(path=D+"m_03_menu.png")
            L("menu texto:", re.sub(r"\s+"," ",await pg.evaluate("(document.querySelector('.menu-drawer, [class*=drawer][open], details[open]')||document.body).innerText"))[:1500])
            # abrir submenus
            subs=pg.locator(".menu-drawer details summary, .menu-drawer button[aria-expanded]")
            n=await subs.count(); L("submenus:",n)
            for i in range(min(n,3)):
                try:
                    await subs.nth(i).click(); await pg.wait_for_timeout(1000); await pg.screenshot(path=D+f"m_04_sub{i}.png")
                    await pg.go_back() if False else None
                except Exception as e: L("sub err",i,str(e)[:150])
        L("errores js:",errs); L("consola:",cons[:30])
        for path,n in [("/products/lampara-proyectora-de-luna-usb-halloween-y-navidad","proyector"),("/collections/all","coleccion"),("/cart","cart")]:
            await pg.goto(B+path, timeout=90000, wait_until="load"); await pg.wait_for_timeout(5000)
            await pg.screenshot(path=D+f"m_10_{n}_full.png", full_page=True)
        L("errores js 2:",errs)
        await b.close()
asyncio.run(main())

import asyncio
from playwright.async_api import async_playwright
B="https://ypnmwd-as.myshopify.com"
T="preview_theme_id=207951528273"
HOME=B+"/?"+T
COOK=[{"name":"localization","value":"ES","domain":"ypnmwd-as.myshopify.com","path":"/"},{"name":"cart_currency","value":"EUR","domain":"ypnmwd-as.myshopify.com","path":"/"}]
INIT="try{sessionStorage.setItem('lfIntro','1');localStorage.setItem('lfPop',JSON.stringify({closed:Date.now()}))}catch(e){}"
INIT2="try{localStorage.setItem('lfPop',JSON.stringify({closed:Date.now()}))}catch(e){}"
CLEAN="document.querySelectorAll('#shopify-pc__banner, .shopify-pc__banner__dialog, #preview-bar-iframe, #PBarNextFrameWrapper').forEach(e=>e.remove())"
D="fotos-tienda/capturas/"
async def ctxp(b,w,h,touch=False,init=INIT):
    ctx=await b.new_context(viewport={"width":w,"height":h}, locale="es-ES", has_touch=touch, is_mobile=touch)
    await ctx.add_cookies(COOK); await ctx.add_init_script(init)
    pg=await ctx.new_page(); errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)[:200]))
    return ctx,pg,errs
async def go(pg,url,wait=5000):
    await pg.goto(url, timeout=90000, wait_until="load"); await pg.wait_for_timeout(wait); await pg.evaluate(CLEAN)
async def main():
    log=open(D+"log.txt","w")
    def L(*a): log.write(" ".join(str(x) for x in a)+"\n"); log.flush()
    async with async_playwright() as p:
        b=await p.chromium.launch()
        try:
            ctx,pg,errs=await ctxp(b,1440,900,False,INIT2)
            await pg.goto(HOME, timeout=90000, wait_until="domcontentloaded"); await pg.wait_for_timeout(1600)
            await pg.screenshot(path=D+"intro.png"); await ctx.close()
        except Exception as e: L("intro ERROR",str(e)[:200])
        ctx,pg,errs=await ctxp(b,1440,900); await go(pg,HOME)
        try:
            await pg.click(".lf-help__btn",timeout=8000); await pg.wait_for_timeout(600)
            await pg.click(".lf-chip[data-topic=track]"); await pg.wait_for_timeout(1300)
            await pg.screenshot(path=D+"d_chat.png")
            L("chat ok, form:",await pg.evaluate("!!document.querySelector('[data-lf-help-log] form')"))
            await pg.keyboard.press("Escape"); await pg.wait_for_timeout(300)
        except Exception as e: L("chat ERROR",str(e)[:400])
        try:
            btn=None
            for c in await pg.locator("header button, header summary").all():
                if await c.is_visible() and "EUR" in (await c.inner_text()): btn=c; break
            await btn.click(); await pg.wait_for_timeout(1000)
            await pg.screenshot(path=D+"d_country.png")
            L("paises visibles:",await pg.evaluate("[...document.querySelectorAll('header li, [role=option]')].filter(e=>e.offsetParent&&/EUR/.test(e.innerText)).map(e=>e.innerText.replace(/\\s+/g,' ').trim()).slice(0,40).join(' ; ')"))
            L("hay US:",await pg.evaluate("/United States|Estados Unidos/.test([...document.querySelectorAll('header li')].map(e=>e.innerText).join(' '))"))
        except Exception as e: L("selector ERROR",str(e)[:300])
        L("errores:",errs); await ctx.close()
        ctx,pg,errs=await ctxp(b,390,844,True); await go(pg,HOME)
        await pg.screenshot(path=D+"m_home.png")
        await pg.evaluate("document.querySelector('[data-lf-fin]').scrollIntoView({block:'start'})"); await pg.evaluate("window.scrollBy(0,-160)"); await pg.wait_for_timeout(2500)
        await pg.screenshot(path=D+"m_finale.png")
        await pg.evaluate("window.scrollBy(0,700)"); await pg.wait_for_timeout(1200); await pg.screenshot(path=D+"m_footer.png")
        try:
            await pg.click(".lf-help__btn",timeout=8000); await pg.wait_for_timeout(600); await pg.click(".lf-chip[data-topic=ship]"); await pg.wait_for_timeout(1300)
            await pg.screenshot(path=D+"m_chat.png")
        except Exception as e: L("chat movil ERROR",str(e)[:300])
        L("errores movil:",errs); await ctx.close()
        await b.close()
asyncio.run(main())

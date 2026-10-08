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
        ctx,pg,errs=await ctxp(b,390,844,True); await go(pg,HOME)
        H=await pg.evaluate("document.documentElement.scrollHeight")
        for y in range(0,H,500):
            await pg.evaluate(f"window.scrollTo(0,{y})"); await pg.wait_for_timeout(150)
        top=await pg.evaluate("document.querySelector('[data-lf-fin]').getBoundingClientRect().top+window.scrollY")
        await pg.evaluate(f"window.scrollTo(0,{top}-120)"); await pg.wait_for_timeout(2500)
        L("scrollY",await pg.evaluate("window.scrollY"),"fin top",top)
        await pg.screenshot(path=D+"m_finale.png")
        await pg.evaluate("window.scrollBy(0,700)"); await pg.wait_for_timeout(1200); await pg.screenshot(path=D+"m_footer.png")
        L("errores movil:",errs); await ctx.close()
        await b.close()
asyncio.run(main())

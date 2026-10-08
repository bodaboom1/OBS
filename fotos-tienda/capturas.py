import asyncio, json
from playwright.async_api import async_playwright
B="https://ypnmwd-as.myshopify.com"
T="preview_theme_id=207963914577"
COOK=[{"name":"localization","value":"ES","domain":"ypnmwd-as.myshopify.com","path":"/"},{"name":"cart_currency","value":"EUR","domain":"ypnmwd-as.myshopify.com","path":"/"}]
INIT="try{sessionStorage.setItem('lfIntro','1');localStorage.setItem('lfPop',JSON.stringify({closed:Date.now()}))}catch(e){}"
CLEAN="document.querySelectorAll('#shopify-pc__banner, .shopify-pc__banner__dialog, #preview-bar-iframe, #PBarNextFrameWrapper').forEach(e=>e.remove())"
D="fotos-tienda/capturas/"
CARDS="""()=>[...document.querySelectorAll('product-card')].map(c=>{const t=(c.querySelector('.contents, [class*=product-title]')||{}).innerText||'';return JSON.stringify({t:t.trim().slice(0,40),price:((c.querySelector('product-price .price')||{}).innerText||'').trim(),cap:((c.querySelector('.compare-at-price')||{}).innerText||'').trim(),ref:((c.querySelector('.lf-ref')||{}).innerText||'').replace(/\\s+/g,' ').trim(),badges:((c.querySelector('.product-badges')||{}).innerText||'').replace(/\\s+/g,' ').trim(),pct:/%/.test(c.innerText)})})"""
async def ctxp(b,w,h,touch=False):
    ctx=await b.new_context(viewport={"width":w,"height":h}, locale="es-ES", has_touch=touch, is_mobile=touch)
    await ctx.add_cookies(COOK); await ctx.add_init_script(INIT)
    pg=await ctx.new_page(); errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)[:200]))
    return ctx,pg,errs
async def go(pg,url):
    await pg.goto(url, timeout=90000, wait_until="load"); await pg.wait_for_timeout(4500); await pg.evaluate(CLEAN)
async def main():
    log=open(D+"log.txt","w")
    def L(*a): log.write(" ".join(str(x) for x in a)+"\n"); log.flush()
    async with async_playwright() as p:
        b=await p.chromium.launch()
        ctx,pg,errs=await ctxp(b,390,844,True); await go(pg,B+"/collections/all?"+T)
        y=await pg.evaluate("document.querySelector('product-card').getBoundingClientRect().top+window.scrollY")
        await pg.evaluate(f"window.scrollTo(0,{y}-70)"); await pg.wait_for_timeout(1000)
        await pg.screenshot(path=D+"m_tarjetas.png")
        L("ref movil alturas:",await pg.evaluate("[...document.querySelectorAll('.lf-ref')].slice(0,4).map(e=>Math.round(e.getBoundingClientRect().height)+'px '+e.innerText.replace(/\\s+/g,' ')).join(' | ')"))
        await go(pg,B+"/products/red-de-telarana-led-para-halloween-8-modos?"+T)
        y=await pg.evaluate("document.querySelector('.lf-tiers').getBoundingClientRect().top+window.scrollY")
        await pg.evaluate(f"window.scrollTo(0,{y}-200)"); await pg.wait_for_timeout(800); await pg.screenshot(path=D+"m_ficha.png")
        L("tier1 deco:",await pg.evaluate("getComputedStyle(document.querySelector('.lf-tier span.lf-tier__old')).textDecorationLine"))
        L("errores:",errs)
        await b.close()
asyncio.run(main())

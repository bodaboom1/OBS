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
        ctx,pg,errs=await ctxp(b,1440,900); await go(pg,B+"/collections/all?"+T)
        for r in await pg.evaluate(CARDS): L("CARD",r)
        L("pagina con %:",await pg.evaluate("[...document.querySelectorAll('main *')].filter(e=>e.children.length==0&&/\\d\\s?%/.test(e.innerText||'')&&e.offsetParent).map(e=>e.innerText.trim()).slice(0,10).join(' | ')"))
        await pg.evaluate("document.querySelector('product-card').scrollIntoView({block:'center'})"); await pg.wait_for_timeout(800)
        await pg.screenshot(path=D+"d_coleccion.png")
        L("errores col:",errs); await ctx.close()
        for handle in ["red-de-telarana-led-para-halloween-8-modos","guirnalda-led-impermeable-para-navidad-1-m","proyector-de-copos-de-nieve-led-giratorio-para-navidad"]:
            ctx,pg,errs=await ctxp(b,1440,900); await go(pg,B+"/products/"+handle+"?"+T)
            L("PDP",handle,"precio:",await pg.evaluate("(document.querySelector('.product-information product-price .price')||{}).innerText"),"| tiers:",await pg.evaluate("[...document.querySelectorAll('.lf-tier')].map(t=>t.innerText.replace(/\\s+/g,' ').trim()).join(' || ')"),"| deal:",await pg.evaluate("!!document.querySelector('.lf-deal')"),"| % visibles:",await pg.evaluate("[...document.querySelectorAll('.product-information *')].filter(e=>e.children.length==0&&/\\d\\s?%/.test(e.innerText||'')&&e.offsetParent).map(e=>e.innerText.trim()).slice(0,6).join(' | ')"))
            if handle.startswith("red"): await pg.screenshot(path=D+"d_ficha.png")
            L("errores:",errs); await ctx.close()
        ctx,pg,errs=await ctxp(b,390,844,True); await go(pg,B+"/?"+T)
        await pg.screenshot(path=D+"m_home_top.png")
        await pg.evaluate("document.querySelector('product-card').scrollIntoView({block:'start'})"); await pg.evaluate("window.scrollBy(0,-70)"); await pg.wait_for_timeout(900)
        await pg.screenshot(path=D+"m_tarjetas.png")
        await go(pg,B+"/products/red-de-telarana-led-para-halloween-8-modos?"+T)
        await pg.evaluate("window.scrollTo(0,420)"); await pg.wait_for_timeout(800); await pg.screenshot(path=D+"m_ficha.png")
        L("errores movil:",errs); await ctx.close()
        ctx,pg,errs=await ctxp(b,820,1180,True); await go(pg,B+"/collections/all?"+T)
        await pg.evaluate("document.querySelector('product-card').scrollIntoView({block:'start'})"); await pg.evaluate("window.scrollBy(0,-80)"); await pg.wait_for_timeout(900)
        await pg.screenshot(path=D+"t_coleccion.png")
        ctx2=ctx
        ctx,pg,errs=await ctxp(b,1440,900); await go(pg,B+"/?"+T)
        L("home secciones:",await pg.evaluate("[...document.querySelectorAll('main .shopify-section')].map(s=>s.id.replace('shopify-section-template--','').slice(-18)+':'+Math.round(s.getBoundingClientRect().height)).join(' ')"))
        L("anuncio/hero:",await pg.evaluate("[...document.querySelectorAll('.hero p, [class*=announcement] p')].map(e=>e.innerText.trim()).join(' | ').slice(0,400)"))
        L("errores home:",errs)
        await b.close()
asyncio.run(main())

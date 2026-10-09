import asyncio
from playwright.async_api import async_playwright
B="https://ypnmwd-as.myshopify.com"
T="preview_theme_id=207983575377"
COOK=[{"name":"localization","value":"ES","domain":"ypnmwd-as.myshopify.com","path":"/"},{"name":"cart_currency","value":"EUR","domain":"ypnmwd-as.myshopify.com","path":"/"}]
INIT="try{sessionStorage.setItem('lfIntro','1');localStorage.setItem('lfPop',JSON.stringify({closed:Date.now()}))}catch(e){}"
CLEAN="document.querySelectorAll('#shopify-pc__banner, .shopify-pc__banner__dialog, #preview-bar-iframe, #PBarNextFrameWrapper').forEach(e=>e.remove())"
D="fotos-tienda/capturas/"
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
        L("tarjetas:",await pg.evaluate("[...document.querySelectorAll('product-card')].map(c=>((c.querySelector('[class*=product-title], .contents')||{}).innerText||'').trim().slice(0,22)+' => '+((c.querySelector('.lf-rating')||{}).innerText||'SIN').replace(/\\s+/g,' ')).join(' | ')"))
        L("demo visible:",await pg.evaluate("!!document.querySelector('.lf-demo-tag')"))
        await pg.evaluate("document.querySelector('product-card').scrollIntoView({block:'center'})"); await pg.wait_for_timeout(700)
        await pg.screenshot(path=D+"d_tarjetas.png")
        L("errores:",errs); await ctx.close()
        for h in ["red-de-telarana-led-para-halloween-8-modos","ramas-de-abedul-blanco-con-20-luces-led","guirnalda-led-impermeable-para-navidad-1-m"]:
            ctx,pg,errs=await ctxp(b,1440,900); await go(pg,B+"/products/"+h+"?"+T)
            L("PDP",h,"| resumen:",await pg.evaluate("(document.querySelector('.lf-rv-sum')||{innerText:'NO'}).innerText.replace(/\\s+/g,' ')"),"| seccion:",await pg.evaluate("(()=>{const s=document.querySelector('#lf-reviews');if(!s)return 'NO';return s.querySelector('.lf-rv__avg').innerText+' / '+s.querySelector('.lf-rv__score small').innerText+' / barras: '+[...s.querySelectorAll('.lf-rv__bars li')].map(l=>l.innerText.replace(/\\s+/g,' ')).join(', ')+' / opiniones: '+s.querySelectorAll('.lf-rv__item').length})()"))
            if h.startswith("red"):
                await pg.screenshot(path=D+"d_ficha_top.png")
                await pg.evaluate("document.querySelector('#lf-reviews').scrollIntoView({block:'start'})"); await pg.mouse.move(700,500); await pg.mouse.wheel(0,-60); await pg.wait_for_timeout(800)
                await pg.screenshot(path=D+"d_resenas.png")
            L("errores:",errs); await ctx.close()
        ctx,pg,errs=await ctxp(b,390,844,True); await go(pg,B+"/products/red-de-telarana-led-para-halloween-8-modos?"+T)
        y=await pg.evaluate("document.querySelector('#lf-reviews').getBoundingClientRect().top+window.scrollY")
        await pg.evaluate(f"window.scrollTo(0,{y}-70)"); await pg.wait_for_timeout(800); await pg.screenshot(path=D+"m_resenas.png")
        await go(pg,B+"/collections/all?"+T)
        y=await pg.evaluate("document.querySelector('product-card').getBoundingClientRect().top+window.scrollY")
        await pg.evaluate(f"window.scrollTo(0,{y}-70)"); await pg.wait_for_timeout(900); await pg.screenshot(path=D+"m_tarjetas.png")
        L("errores movil:",errs)
        await b.close()
asyncio.run(main())

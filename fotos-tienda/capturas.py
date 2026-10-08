import asyncio, json
from playwright.async_api import async_playwright
B="https://ypnmwd-as.myshopify.com"
T="preview_theme_id=207937306961"
HOME=B+"/?"+T
PROD=B+"/products/red-de-telarana-led-para-halloween-8-modos?"+T
COOK=[{"name":"localization","value":"ES","domain":"ypnmwd-as.myshopify.com","path":"/"},{"name":"cart_currency","value":"EUR","domain":"ypnmwd-as.myshopify.com","path":"/"}]
INIT="try{sessionStorage.setItem('lfIntro','1');localStorage.setItem('lfPop',JSON.stringify({closed:Date.now()}))}catch(e){}"
CLEAN="document.querySelectorAll('#shopify-pc__banner, .shopify-pc__banner__dialog, #preview-bar-iframe, #PBarNextFrameWrapper').forEach(e=>e.remove())"
D="fotos-tienda/capturas/"
async def ctxp(b,w,h,touch=False):
    ctx=await b.new_context(viewport={"width":w,"height":h}, locale="es-ES", has_touch=touch, is_mobile=touch)
    await ctx.add_cookies(COOK); await ctx.add_init_script(INIT)
    pg=await ctx.new_page(); errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    return ctx,pg,errs
async def go(pg,url):
    await pg.goto(url, timeout=60000, wait_until="load"); await pg.wait_for_timeout(5000); await pg.evaluate(CLEAN)
async def swipe(cdp,x1,x2,y):
    await cdp.send("Input.dispatchTouchEvent",{"type":"touchStart","touchPoints":[{"x":x1,"y":y}]})
    n=12
    for k in range(1,n+1):
        await cdp.send("Input.dispatchTouchEvent",{"type":"touchMove","touchPoints":[{"x":x1+(x2-x1)*k/n,"y":y+k*0.3}]})
        await asyncio.sleep(0.016)
    await cdp.send("Input.dispatchTouchEvent",{"type":"touchEnd","touchPoints":[]})
async def main():
    log=open(D+"log.txt","w")
    def L(*a): log.write(" ".join(str(x) for x in a)+"\n"); log.flush()
    async with async_playwright() as p:
        b=await p.chromium.launch()
        ctx,pg,errs=await ctxp(b,1440,900)
        await go(pg,HOME); await pg.mouse.move(700,850)
        L("hijos tarjeta:", await pg.evaluate("[...document.querySelector('.product-card__content').children].map(e=>e.tagName+'.'+String(e.className).replace(/\\s+/g,'.').slice(0,80)+' order='+getComputedStyle(e).order).join(' | ')"))
        L("deadline html:", await pg.evaluate("(document.querySelector('#lf-deadline')||{outerHTML:'no'}).outerHTML.slice(0,600)"))
        L("anim:", await pg.evaluate("[...document.querySelectorAll('#lf-deadline *')].filter(e=>getComputedStyle(e).animationName!='none').map(e=>e.className+':'+getComputedStyle(e).animationName+':'+getComputedStyle(e).animationPlayState+':'+getComputedStyle(e).transform).slice(0,6).join(' || ')"))
        await pg.wait_for_timeout(2000)
        L("anim+2s:", await pg.evaluate("[...document.querySelectorAll('#lf-deadline *')].filter(e=>getComputedStyle(e).animationName!='none').map(e=>e.className+':'+getComputedStyle(e).transform).slice(0,3).join(' || ')"))
        L("deadline visible:", await pg.evaluate("(()=>{const r=document.querySelector('#lf-deadline').getBoundingClientRect();return r.top+','+r.height+','+getComputedStyle(document.querySelector('#lf-deadline')).display})()"))
        await pg.screenshot(path=D+"d_top.png", clip={"x":0,"y":0,"width":1440,"height":200})
        await go(pg,PROD); await pg.mouse.move(700,850)
        L("pdp ss attrs:", await pg.evaluate("(()=>{const s=document.querySelector('.lf-pdp-gallery slideshow-component');return [...s.attributes].map(a=>a.name).join(',')+' | arrows: '+[...s.querySelectorAll('slideshow-arrows > *')].map(e=>e.tagName+'['+(e.getAttribute('ref')||'')+']'+(e.className||'')).join(' ; ')})()"))
        L("card ss arrows:", await pg.evaluate("[...document.querySelectorAll('[data-lf-gallery=card] slideshow-arrows > *')].slice(0,2).map(e=>e.tagName+'['+(e.getAttribute('ref')||'')+']'+e.className).join(' ; ')"))
        await ctx.close()
        ctx,pg,errs=await ctxp(b,390,844,True)
        await go(pg,PROD)
        cdp=await ctx.new_cdp_session(pg)
        g=pg.locator(".lf-pdp-gallery slideshow-slides").first; box=await g.bounding_box()
        L("pdp box", box, "touch-action:", await pg.evaluate("getComputedStyle(document.querySelector('.lf-pdp-gallery slideshow-slides')).touchAction+' ov:'+getComputedStyle(document.querySelector('.lf-pdp-gallery slideshow-slides')).overflowX+' snap:'+getComputedStyle(document.querySelector('.lf-pdp-gallery slideshow-slides')).scrollSnapType"))
        y0=await pg.evaluate("scrollY")
        await swipe(cdp, box["x"]+box["width"]*0.85, box["x"]+box["width"]*0.15, box["y"]+box["height"]/2)
        await pg.wait_for_timeout(1000)
        L("pdp tras swipe scrollLeft:", await pg.evaluate("document.querySelector('.lf-pdp-gallery slideshow-slides').scrollLeft"), "dots:", await pg.evaluate("[...document.querySelectorAll('.lf-pdp-gallery .lf-dots button')].map(b=>b.getAttribute('aria-current')==='true'?'X':'o').join('')"), "scrollY", y0, await pg.evaluate("scrollY"))
        await pg.screenshot(path=D+"m_prod_swipe.png")
        await go(pg,HOME)
        c=pg.locator("[data-lf-gallery=card] slideshow-slides").first
        await c.scroll_into_view_if_needed(); await pg.wait_for_timeout(500); box=await c.bounding_box()
        await swipe(cdp, box["x"]+box["width"]*0.9, box["x"]+box["width"]*0.1, box["y"]+box["height"]/2)
        await pg.wait_for_timeout(1000)
        L("card tras swipe scrollLeft:", await pg.evaluate("document.querySelector('[data-lf-gallery=card] slideshow-slides').scrollLeft"), "dots:", await pg.evaluate("[...document.querySelector('.card-gallery>.lf-dots').children].map(b=>b.getAttribute('aria-current')==='true'?'X':'o').join('')"), "url", pg.url)
        await pg.screenshot(path=D+"m_card_swipe.png")
        L("errores:", errs)
        await ctx.close(); await b.close()
asyncio.run(main())

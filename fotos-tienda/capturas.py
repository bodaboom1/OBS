import asyncio, json
from playwright.async_api import async_playwright
B="https://ypnmwd-as.myshopify.com"
T="preview_theme_id=207937306961"
HOME=B+"/?"+T
PROD=B+"/products/red-de-telarana-led-para-halloween-8-modos?"+T
COL=B+"/collections/navidad?"+T
COOK=[{"name":"localization","value":"ES","domain":"ypnmwd-as.myshopify.com","path":"/"},{"name":"cart_currency","value":"EUR","domain":"ypnmwd-as.myshopify.com","path":"/"}]
INIT="try{sessionStorage.setItem('lfIntro','1');localStorage.setItem('lfPop',JSON.stringify({closed:Date.now()}))}catch(e){}"
CLEAN="document.querySelectorAll('#shopify-pc__banner, .shopify-pc__banner__dialog, #preview-bar-iframe, #PBarNextFrameWrapper').forEach(e=>e.remove())"
D="fotos-tienda/capturas/"
STATE="""(sel)=>{const ss=document.querySelector(sel);if(!ss)return 'no encontrado';const sc=ss.querySelector('slideshow-slides');
const arr=[...ss.querySelectorAll('slideshow-arrows .slideshow-control')].map(b=>(b.disabled?'off':'on')+':'+getComputedStyle(b).opacity);
const g=ss.closest('.card-gallery,media-gallery')||ss;const dots=[...g.querySelectorAll('.lf-dots button')].map(b=>b.getAttribute('aria-current')==='true'?'X':'o').join('');
return JSON.stringify({scroll:Math.round(sc.scrollLeft),w:sc.clientWidth,current:ss.current??ss.getAttribute('current'),arrows:arr,dots})}"""
async def ctxp(b,w,h,touch=False):
    ctx=await b.new_context(viewport={"width":w,"height":h}, locale="es-ES", has_touch=touch, is_mobile=touch)
    await ctx.add_cookies(COOK); await ctx.add_init_script(INIT)
    pg=await ctx.new_page(); errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    return ctx,pg,errs
async def go(pg,url):
    await pg.goto(url, timeout=60000, wait_until="load"); await pg.wait_for_timeout(5000); await pg.evaluate(CLEAN)
async def main():
    log=open(D+"log.txt","w")
    def L(*a): log.write(" ".join(str(x) for x in a)+"\n"); log.flush()
    async with async_playwright() as p:
        b=await p.chromium.launch()
        # ---- ESCRITORIO: tarjetas ----
        ctx,pg,errs=await ctxp(b,1440,900)
        await go(pg,HOME)
        await pg.screenshot(path=D+"d_home_top.png")
        L("cuenta atras:", await pg.evaluate("(()=>{const t=document.querySelector('#lf-deadline [class*=track]')||document.querySelector('#lf-deadline');return t?getComputedStyle(t).animationName+' '+getComputedStyle(t).transform:'no'})()"))
        await pg.wait_for_timeout(1500)
        L("cuenta atras +1.5s:", await pg.evaluate("(()=>{const t=document.querySelector('#lf-deadline [class*=track]');return t?getComputedStyle(t).transform:'no'})()"))
        cards=pg.locator("slideshow-component[data-lf-gallery=card]")
        n=await cards.count(); L("tarjetas con galeria:", n)
        L("tarjetas con puntos:", await pg.evaluate("document.querySelectorAll('.card-gallery>.lf-dots').length"), "CTA:", await pg.evaluate("document.querySelectorAll('.lf-cta').length"))
        L("imagenes por tarjeta:", await pg.evaluate("[...document.querySelectorAll('product-card')].map(c=>c.querySelectorAll('slideshow-slide:not([hidden])').length+'/'+(c.querySelector('.lf-dots')?c.querySelector('.lf-dots').children.length:0)).join(' ')"))
        first=cards.first
        await first.scroll_into_view_if_needed(); await pg.wait_for_timeout(600)
        await pg.evaluate("window.scrollBy(0,-120)"); await pg.wait_for_timeout(400)
        sel="slideshow-component[data-lf-gallery=card]"
        L("tarjeta1 inicio:", await pg.evaluate(STATE, sel))
        await first.hover(); await pg.wait_for_timeout(500)
        L("tarjeta1 hover:", await pg.evaluate(STATE, sel))
        await pg.screenshot(path=D+"d_card_hover.png")
        nxt=first.locator("slideshow-arrows .slideshow-control").nth(1)
        await nxt.click(); await pg.wait_for_timeout(700)
        L("tarjeta1 tras flecha >:", await pg.evaluate(STATE, sel)); L("url:", pg.url)
        await pg.screenshot(path=D+"d_card_next.png")
        dots=pg.locator(".card-gallery>.lf-dots").first.locator("button")
        k=await dots.count()
        if k>0:
            await dots.nth(k-1).click(); await pg.wait_for_timeout(800)
            L("tarjeta1 tras punto ultimo:", await pg.evaluate(STATE, sel)); L("url:", pg.url)
            await pg.screenshot(path=D+"d_card_last.png")
        # CTA lleva a la ficha
        await pg.locator(".lf-cta").first.click(); await pg.wait_for_timeout(2500)
        L("tras clic Ver producto:", pg.url)
        L("errores JS escritorio home:", errs); await ctx.close()
        # ---- ESCRITORIO: ficha ----
        ctx,pg,errs=await ctxp(b,1440,900)
        await go(pg,PROD)
        s2=".lf-pdp-gallery slideshow-component"
        L("ficha inicio:", await pg.evaluate(STATE, s2))
        L("miniaturas:", await pg.evaluate("document.querySelectorAll('.lf-pdp-gallery slideshow-controls button').length"))
        await pg.screenshot(path=D+"d_prod.png")
        th=pg.locator(".lf-pdp-gallery slideshow-controls button")
        if await th.count()>2:
            await th.nth(2).click(); await pg.wait_for_timeout(800)
            L("ficha tras miniatura 3:", await pg.evaluate(STATE, s2))
            await pg.screenshot(path=D+"d_prod_thumb3.png")
        await pg.locator(".lf-pdp-gallery").first.hover(); await pg.wait_for_timeout(400)
        L("ficha hover:", await pg.evaluate(STATE, s2))
        L("errores JS ficha escritorio:", errs); await ctx.close()
        # ---- MOVIL: swipe ----
        ctx,pg,errs=await ctxp(b,390,844,True)
        await go(pg,HOME)
        await pg.screenshot(path=D+"m_home_top.png")
        first=pg.locator("slideshow-component[data-lf-gallery=card]").first
        await first.scroll_into_view_if_needed(); await pg.wait_for_timeout(600)
        await pg.screenshot(path=D+"m_cards.png")
        L("movil tarjeta inicio:", await pg.evaluate(STATE, sel))
        box=await first.bounding_box(); y0=await pg.evaluate("scrollY")
        cdp=await ctx.new_cdp_session(pg)
        x1=box["x"]+box["width"]*0.85; x2=box["x"]+box["width"]*0.1; yy=box["y"]+box["height"]/2
        await cdp.send("Input.synthesizeScrollGesture",{"x":int(x1),"y":int(yy),"xDistance":-int(x1-x2),"yDistance":0,"gestureSourceType":"touch","speed":800})
        await pg.wait_for_timeout(900)
        L("movil tarjeta tras swipe:", await pg.evaluate(STATE, sel), "scrollY antes/despues:", y0, await pg.evaluate("scrollY"))
        await pg.screenshot(path=D+"m_card_swipe.png")
        L("errores JS movil home:", errs)
        await go(pg,PROD)
        await pg.screenshot(path=D+"m_prod.png")
        L("movil ficha inicio:", await pg.evaluate(STATE, s2))
        g=pg.locator(".lf-pdp-gallery slideshow-slides").first; box=await g.bounding_box()
        await cdp.send("Input.synthesizeScrollGesture",{"x":int(box["x"]+box["width"]*0.85),"y":int(box["y"]+box["height"]/2),"xDistance":-int(box["width"]*0.7),"yDistance":0,"gestureSourceType":"touch","speed":800})
        await pg.wait_for_timeout(900)
        L("movil ficha tras swipe:", await pg.evaluate(STATE, s2))
        await pg.screenshot(path=D+"m_prod_swipe.png")
        # carrito
        try:
            await pg.locator("product-form-component button[name=add], .product-information .add-to-cart-button").first.click(timeout=10000)
            await pg.wait_for_timeout(1500)
            L("toast:", await pg.evaluate("(document.querySelector('.lf-toast')||{}).className||'sin toast'"))
            L("carrito:", await pg.evaluate("fetch('/cart.js').then(r=>r.json()).then(j=>j.item_count+' items, total '+j.total_price+' '+j.currency)"))
        except Exception as e: L("carrito ERROR", e)
        L("errores JS movil ficha:", errs)
        await go(pg,COL); await pg.screenshot(path=D+"m_col.png")
        L("coleccion tarjetas:", await pg.evaluate("document.querySelectorAll('product-card').length"), "errores:", errs)
        await ctx.close(); await b.close()
asyncio.run(main())

import asyncio
from playwright.async_api import async_playwright
B="https://ypnmwd-as.myshopify.com"
T="preview_theme_id=207951528273"
HOME=B+"/?"+T
PROD=B+"/products/red-de-telarana-led-para-halloween-8-modos?"+T
PROD2=B+"/products/proyector-nevada-magica?"+T
def cook(c="ES"): return [{"name":"localization","value":c,"domain":"ypnmwd-as.myshopify.com","path":"/"},{"name":"cart_currency","value":"EUR","domain":"ypnmwd-as.myshopify.com","path":"/"}]
INIT="try{sessionStorage.setItem('lfIntro','1');localStorage.setItem('lfPop',JSON.stringify({closed:Date.now()}))}catch(e){}"
CLEAN="document.querySelectorAll('#shopify-pc__banner, .shopify-pc__banner__dialog, #preview-bar-iframe, #PBarNextFrameWrapper').forEach(e=>e.remove())"
D="fotos-tienda/capturas/"
STICK="""()=>{const b=document.querySelector('sticky-add-to-cart [ref=stickyBar]');if(!b)return 'no bar';const r=b.getBoundingClientRect(),g=document.querySelector('.product-information media-gallery'),gr=g?g.getBoundingClientRect():null,c=getComputedStyle(b);const atc=document.querySelector('product-form-component [ref=addToCartButton]').getBoundingClientRect();
return 'stuck='+b.dataset.stuck+' op='+c.opacity+' bar x='+Math.round(r.left)+'..'+Math.round(r.right)+' y='+Math.round(r.top)+'..'+Math.round(r.bottom)+' | gal x='+(gr?Math.round(gr.left)+'..'+Math.round(gr.right)+' y='+Math.round(gr.top)+'..'+Math.round(gr.bottom):'-')+' | atc y='+Math.round(atc.top)+'..'+Math.round(atc.bottom)+' docked='+document.querySelector('sticky-add-to-cart').dataset.docked}"""
async def ctxp(b,w,h,touch=False,c="ES"):
    ctx=await b.new_context(viewport={"width":w,"height":h}, locale="es-ES", has_touch=touch, is_mobile=touch)
    await ctx.add_cookies(cook(c)); await ctx.add_init_script(INIT)
    pg=await ctx.new_page(); errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)[:200]))
    return ctx,pg,errs
async def go(pg,url):
    await pg.goto(url, timeout=90000, wait_until="load"); await pg.wait_for_timeout(5000); await pg.evaluate(CLEAN)
async def wheel_to(pg,y,desk):
    if desk:
        cur=await pg.evaluate("document.querySelector('.page-wrapper').scrollTop")
        await pg.mouse.move(700,500); await pg.mouse.wheel(0,y-cur)
    else:
        await pg.evaluate(f"window.scrollTo(0,{y})")
    await pg.wait_for_timeout(700)
async def sticky_test(b,name,w,h,touch,L):
    ctx,pg,errs=await ctxp(b,w,h,touch); await go(pg,PROD)
    desk=not touch and w>=750
    L(f"== sticky {name} {w}x{h}")
    first=None
    for y in range(0,3000,150):
        await wheel_to(pg,y,desk); s=await pg.evaluate(STICK)
        L(f"y={y} "+s)
        if 'stuck=true' in s and first is None:
            first=y; await pg.screenshot(path=D+f"sticky_{name}.png")
    # resize check
    if w>=750:
        await pg.set_viewport_size({"width":w-200,"height":h}); await pg.wait_for_timeout(800)
        L("tras resize "+str(w-200)+": "+await pg.evaluate(STICK))
    L("errores:",errs); await ctx.close()
async def main():
    log=open(D+"log.txt","w")
    def L(*a): log.write(" ".join(str(x) for x in a)+"\n"); log.flush()
    async with async_playwright() as p:
        b=await p.chromium.launch()
        # HOME escritorio
        ctx,pg,errs=await ctxp(b,1440,900); await go(pg,HOME)
        await pg.screenshot(path=D+"d_home_1.png")
        L("logo:",await pg.evaluate("(()=>{const w=document.querySelector('.lf-logo__word');return w?getComputedStyle(w).fontFamily+' '+getComputedStyle(w).fontSize:'no'})()"))
        L("hero img:",await pg.evaluate("(()=>{const i=document.querySelector('.hero img');return i?i.currentSrc.split('?')[0].split('/').pop()+' '+i.naturalWidth+'x'+i.naturalHeight:'no'})()"))
        await pg.mouse.move(700,500)
        for k in range(1,3):
            await pg.mouse.wheel(0,800); await pg.wait_for_timeout(1200); await pg.screenshot(path=D+f"d_home_{k+1}.png")
        L("badges:",await pg.evaluate("[...document.querySelectorAll('product-card .product-badges')].slice(0,10).map(b=>b.innerText.replace(/\\s+/g,' ')).join(' | ')"))
        L("ofertas:",await pg.evaluate("[...document.querySelectorAll('product-card .lf-offer:not([hidden])')].slice(0,10).map(b=>b.innerText.replace(/\\s+/g,' ')).join(' | ')"))
        # final
        await pg.evaluate("document.querySelector('.page-wrapper').scrollTo(0,document.querySelector('.page-wrapper').scrollHeight)"); await pg.wait_for_timeout(600)
        await pg.evaluate("document.querySelector('[data-lf-fin]').scrollIntoView({block:'start'})"); await pg.mouse.wheel(0,-300); await pg.wait_for_timeout(2500)
        await pg.screenshot(path=D+"d_finale_1.png")
        L("finale:",await pg.evaluate("(()=>{const s=document.querySelector('[data-lf-fin]');return s.className+' p='+s.style.getPropertyValue('--p')})()"))
        await pg.mouse.wheel(0,600); await pg.wait_for_timeout(1500); await pg.screenshot(path=D+"d_finale_2.png")
        await pg.mouse.wheel(0,1500); await pg.wait_for_timeout(1000); await pg.screenshot(path=D+"d_footer.png")
        L("finale p tras scroll:",await pg.evaluate("document.querySelector('[data-lf-fin]').style.getPropertyValue('--p')"))
        # chat
        try:
          await pg.click(".lf-help__btn",timeout=8000); await pg.wait_for_timeout(600)
          await pg.click(".lf-chip[data-topic=track]"); await pg.wait_for_timeout(1300)
          await pg.screenshot(path=D+"d_chat.png")
          L("chat:",await pg.evaluate("document.querySelector('[data-lf-help-log]').innerText.slice(0,400)"), "form:",await pg.evaluate("!!document.querySelector('[data-lf-help-log] form')"))
          await pg.click(".lf-help__close"); await pg.wait_for_timeout(300)
        except Exception as e: L("chat ERROR",str(e)[:300])
        await pg.evaluate("document.querySelector('.page-wrapper').scrollTo(0,0)"); await pg.wait_for_timeout(500)
        try:
            await pg.locator("header localization-form-component button, header .localization-form__toggle, header [class*=localization] button, header dropdown-localization-component button").first.click(timeout=5000)
            await pg.wait_for_timeout(800); await pg.screenshot(path=D+"d_country.png")
            L("paises:",await pg.evaluate("[...document.querySelectorAll('[class*=localization] li, [class*=country-list] li')].map(e=>e.innerText.replace(/\\s+/g,' ').trim()).filter(Boolean).slice(0,40).join(' ; ')"))
        except Exception as e: L("selector ERROR",str(e)[:200])
        L("errores home desk:",errs); await ctx.close()
        # HOME movil
        ctx,pg,errs=await ctxp(b,390,844,True); await go(pg,HOME)
        await pg.screenshot(path=D+"m_home_1.png")
        await pg.evaluate("window.scrollTo(0,900)"); await pg.wait_for_timeout(1200); await pg.screenshot(path=D+"m_home_2.png")
        await pg.evaluate("document.querySelector('[data-lf-fin]').scrollIntoView({block:'start'})"); await pg.evaluate("window.scrollBy(0,-200)"); await pg.wait_for_timeout(2500)
        await pg.screenshot(path=D+"m_finale.png")
        await pg.evaluate("window.scrollBy(0,700)"); await pg.wait_for_timeout(1000); await pg.screenshot(path=D+"m_footer.png")
        try:
          await pg.click(".lf-help__btn",timeout=8000); await pg.wait_for_timeout(600); await pg.click(".lf-chip[data-topic=ship]"); await pg.wait_for_timeout(1200)
          await pg.screenshot(path=D+"m_chat.png")
        except Exception as e: L("chat movil ERROR",str(e)[:300])
        L("errores home movil:",errs); await ctx.close()
        # FICHA
        ctx,pg,errs=await ctxp(b,1440,900); await go(pg,PROD)
        await pg.screenshot(path=D+"d_prod.png")
        L("deal:",await pg.evaluate("(document.querySelector('.lf-deal')||{innerText:'no'}).innerText.replace(/\\s+/g,' ')"))
        try:
          await pg.click(".lf-code",timeout=8000); await pg.wait_for_timeout(300)
          L("copiar:",await pg.evaluate("document.querySelector('.lf-code').innerText"))
        except Exception as e: L("copiar ERROR",str(e)[:200])
        L("errores ficha:",errs); await ctx.close()
        ctx,pg,errs=await ctxp(b,1440,900); await go(pg,PROD2)
        await pg.screenshot(path=D+"d_prod2.png")
        L("deal2:",await pg.evaluate("(document.querySelector('.lf-deal')||{innerText:'no'}).innerText.replace(/\\s+/g,' ')"))
        await ctx.close()
        for a in [("m",390,844,True),("t",820,1180,True),("d",1440,900,False)]:
            try: await sticky_test(b,*a,L)
            except Exception as e: L("sticky ERROR",a[0],str(e)[:300])
        # movil: swipe galeria + carrito
        ctx,pg,errs=await ctxp(b,390,844,True); await go(pg,PROD)
        cdp=await ctx.new_cdp_session(pg)
        g=pg.locator(".lf-pdp-gallery slideshow-slides").first; box=await g.bounding_box()
        x1=box["x"]+box["width"]*.85; x2=box["x"]+box["width"]*.15; yy=box["y"]+box["height"]/2
        await cdp.send("Input.dispatchTouchEvent",{"type":"touchStart","touchPoints":[{"x":x1,"y":yy}]})
        for k in range(1,13):
            await cdp.send("Input.dispatchTouchEvent",{"type":"touchMove","touchPoints":[{"x":x1+(x2-x1)*k/12,"y":yy}]}); await asyncio.sleep(.016)
        await cdp.send("Input.dispatchTouchEvent",{"type":"touchEnd","touchPoints":[]}); await pg.wait_for_timeout(900)
        L("swipe ficha scrollLeft:",await pg.evaluate("document.querySelector('.lf-pdp-gallery slideshow-slides').scrollLeft"))
        await pg.locator("product-form-component [ref=addToCartButton]").first.click(); await pg.wait_for_timeout(2000)
        L("carrito:",await pg.evaluate("fetch('/cart.js').then(r=>r.json()).then(j=>j.item_count+' items '+j.total_price+' '+j.currency)"))
        L("errores movil ficha:",errs); await ctx.close()
        # Mercado UE (Francia)
        ctx,pg,errs=await ctxp(b,1440,900,False,"FR"); await go(pg,PROD)
        L("FR pais/moneda:",await pg.evaluate("(document.querySelector('header [class*=localization]')||{innerText:''}).innerText.replace(/\\s+/g,' ').slice(0,60)"),"| boton:",await pg.evaluate("document.querySelector('product-form-component [ref=addToCartButton]').innerText.trim()"),"disabled:",await pg.evaluate("document.querySelector('product-form-component [ref=addToCartButton]').disabled"))
        await ctx.close()
        await b.close()
asyncio.run(main())

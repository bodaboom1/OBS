import asyncio
from playwright.async_api import async_playwright
B="https://ypnmwd-as.myshopify.com"
T="preview_theme_id=207951528273"
HOME=B+"/?"+T
PROD=B+"/products/red-de-telarana-led-para-halloween-8-modos?"+T
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
        # intro (primera visita)
        try:
            ctx,pg,errs=await ctxp(b,1440,900,False,INIT2)
            await pg.goto(HOME, timeout=90000, wait_until="domcontentloaded"); await pg.wait_for_timeout(1500)
            await pg.screenshot(path=D+"intro.png"); await ctx.close()
        except Exception as e: L("intro ERROR",str(e)[:200])
        # chat escritorio + selector
        ctx,pg,errs=await ctxp(b,1440,900); await go(pg,HOME)
        try:
            await pg.click(".lf-help__btn",timeout=8000); await pg.wait_for_timeout(600)
            await pg.click(".lf-chip[data-topic=track]"); await pg.wait_for_timeout(1300)
            await pg.screenshot(path=D+"d_chat.png")
            L("chat:",await pg.evaluate("document.querySelector('[data-lf-help-log]').innerText.replace(/\\s+/g,' ').slice(0,500)"),"| form en chat:",await pg.evaluate("!!document.querySelector('[data-lf-help-log] form')"),"| enlace:",await pg.evaluate("(document.querySelector('[data-lf-help-log] .lf-msg__btn')||{}).href"))
            await pg.keyboard.press("Escape"); await pg.wait_for_timeout(300)
            L("cerrado con Esc:",await pg.evaluate("document.querySelector('.lf-help__panel').hidden"))
        except Exception as e: L("chat ERROR",str(e)[:400])
        L("html localizacion:",await pg.evaluate("(()=>{const e=[...document.querySelectorAll('header *')].find(x=>x.children.length<4&&/EUR \\/ ES/.test(x.innerText||''));return e?e.outerHTML.slice(0,500):'no'})()"))
        try:
            el=pg.locator("header").get_by_text("EUR / ES").first
            await el.click(timeout=6000); await pg.wait_for_timeout(1000)
            await pg.screenshot(path=D+"d_country.png")
            L("lista paises:",await pg.evaluate("(()=>{const t=[...document.querySelectorAll('[role=option], .country-filter__item, li')].map(e=>e.innerText.replace(/\\s+/g,' ').trim()).filter(t=>/EUR|USD/.test(t));return t.length+' -> '+t.slice(0,40).join(' ; ')})()"))
        except Exception as e: L("selector ERROR",str(e)[:300])
        L("errores:",errs); await ctx.close()
        # Mercado Francia: cambiar pais con el formulario de localizacion de Shopify
        try:
            ctx,pg,errs=await ctxp(b,1440,900); await go(pg,PROD,3000)
            r=await pg.evaluate("fetch('/localization',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({form_type:'localization',utf8:'✓',_method:'put',country_code:'FR',language_code:'es',return_to:'/'}).toString()}).then(r=>r.status)")
            L("POST localizacion FR:",r)
            await go(pg,PROD,4000)
            L("FR cabecera:",await pg.evaluate("(()=>{const e=[...document.querySelectorAll('header *')].find(x=>x.children.length<4&&/EUR \\/ /.test(x.innerText||''));return e?e.innerText.trim():'?'})()"),"| boton:",await pg.evaluate("document.querySelector('product-form-component [ref=addToCartButton]').innerText.trim()"),"| disabled:",await pg.evaluate("document.querySelector('product-form-component [ref=addToCartButton]').disabled"))
            await pg.locator("product-form-component [ref=addToCartButton]").first.click(); await pg.wait_for_timeout(2500)
            L("FR carrito:",await pg.evaluate("fetch('/cart.js').then(r=>r.json()).then(j=>j.item_count+' items '+j.total_price+' '+j.currency)"))
            await ctx.close()
        except Exception as e: L("FR ERROR",str(e)[:300])
        # movil: final, footer, chat
        ctx,pg,errs=await ctxp(b,390,844,True); await go(pg,HOME)
        await pg.evaluate("document.querySelector('[data-lf-fin]').scrollIntoView({block:'start'})"); await pg.evaluate("window.scrollBy(0,-160)"); await pg.wait_for_timeout(2500)
        await pg.screenshot(path=D+"m_finale.png")
        await pg.evaluate("window.scrollBy(0,650)"); await pg.wait_for_timeout(1200); await pg.screenshot(path=D+"m_footer.png")
        try:
            await pg.click(".lf-help__btn",timeout=8000); await pg.wait_for_timeout(600); await pg.click(".lf-chip[data-topic=ship]"); await pg.wait_for_timeout(1300)
            await pg.screenshot(path=D+"m_chat.png")
        except Exception as e: L("chat movil ERROR",str(e)[:300])
        L("errores movil:",errs); await ctx.close()
        await b.close()
asyncio.run(main())

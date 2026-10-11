import asyncio, re
from playwright.async_api import async_playwright
B="https://www.lumifiesta.com"
T="preview_theme_id=208168616273"
D="fotos-tienda/capturas/"
async def main():
    log=open(D+"log.txt","w")
    def L(*a): log.write(" ".join(str(x) for x in a)+"\n"); log.flush()
    async with async_playwright() as p:
        b=await p.chromium.launch()
        ctx=await b.new_context(viewport={"width":390,"height":844}, locale="es-ES", has_touch=True, is_mobile=True, timezone_id="Europe/Madrid")
        await ctx.add_init_script("try{sessionStorage.setItem('lfIntro','1')}catch(e){}")
        pg=await ctx.new_page(); errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)[:300]))
        await pg.goto(B+"/products/lampara-proyectora-de-luna-usb-halloween-y-navidad?"+T, timeout=90000, wait_until="load"); await pg.wait_for_timeout(5000)
        acc=pg.locator("button:has-text('Aceptar')").first
        if await acc.count(): await acc.click(); await pg.wait_for_timeout(1000)
        await pg.evaluate("document.querySelectorAll('#preview-bar-iframe,#PBarNextFrameWrapper').forEach(e=>e.remove())")
        await pg.screenshot(path=D+"v_prod_top.png")
        L("chat visible arriba:",await pg.evaluate("getComputedStyle(document.querySelector('.lf-help')).opacity"))
        L("precio:",await pg.evaluate("document.querySelector('.product-information product-price')?.innerText"))
        await pg.evaluate("window.scrollTo(0,1400)"); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=D+"v_prod_scroll.png")
        L("chat visible con barra:",await pg.evaluate("getComputedStyle(document.querySelector('.lf-help')).opacity"), await pg.evaluate("document.querySelector('.lf-help').getBoundingClientRect().bottom"))
        await pg.wait_for_timeout(26000)
        L("popup en ficha:",await pg.evaluate("!!document.getElementById('lf-pop') && !document.getElementById('lf-pop').hidden"))
        await pg.goto(B+"/?"+T, timeout=90000, wait_until="load"); await pg.wait_for_timeout(5000)
        await pg.evaluate("document.querySelectorAll('#preview-bar-iframe,#PBarNextFrameWrapper').forEach(e=>e.remove())")
        L("orden portada:",await pg.evaluate("[...document.querySelectorAll('product-card')].slice(0,10).map(c=>(c.innerText.split('\\n').find(l=>l.length>8&&!l.includes('AliExpress'))||'').slice(0,22)).join(' | ')"))
        y=await pg.evaluate("document.querySelector('product-card').getBoundingClientRect().top+window.scrollY")
        await pg.evaluate(f"window.scrollTo(0,{y}-80)"); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=D+"v_home_cards.png")
        L("rating tarjeta:",await pg.evaluate("[...document.querySelectorAll('.lf-rating')].slice(0,3).map(e=>e.innerText.replace(/\\s+/g,' ')+' h='+Math.round(e.getBoundingClientRect().height))"))
        await pg.evaluate("window.scrollTo(0,0)"); await pg.wait_for_timeout(800)
        await pg.locator("header summary").first.click(); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=D+"v_menu.png")
        L("menu close:",await pg.evaluate("[...document.querySelectorAll('button')].filter(b=>b.offsetParent&&/Cerrar/.test(b.getAttribute('aria-label')||'')).map(b=>b.className+' @'+JSON.stringify(b.getBoundingClientRect()))"))
        L("menu items:",await pg.evaluate("[...document.querySelectorAll('.menu-drawer a, [class*=menu-drawer] a')].filter(a=>a.offsetParent).slice(0,8).map(a=>a.innerText.trim()).join(' | ')"))
        await pg.goto(B+"/products/proyector-de-copos-de-nieve-led-giratorio-para-navidad?"+T, timeout=90000, wait_until="load"); await pg.wait_for_timeout(4000)
        await pg.locator("product-form-component button[type=submit], button[name=add]").first.click(); await pg.wait_for_timeout(3500)
        L("carrito:",await pg.evaluate("fetch('/cart.js').then(r=>r.json()).then(c=>c.item_count+' uds '+c.total_price/100)"))
        await pg.screenshot(path=D+"v_cart_drawer.png")
        L("errores js:",errs)
        await b.close()
asyncio.run(main())
# Sun Oct 11 19:42:39 UTC 2026

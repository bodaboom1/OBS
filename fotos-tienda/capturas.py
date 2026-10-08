import asyncio
from playwright.async_api import async_playwright
B="https://ypnmwd-as.myshopify.com"
T="preview_theme_id=207934030161"
PAGES={
 "home": B+"/?"+T,
 "prod": B+"/products/red-de-telarana-led-para-halloween-8-modos?"+T,
 "col": B+"/collections/navidad?"+T,
}
COOK=[{"name":"localization","value":"ES","domain":"ypnmwd-as.myshopify.com","path":"/"},{"name":"cart_currency","value":"EUR","domain":"ypnmwd-as.myshopify.com","path":"/"}]
INIT="try{sessionStorage.setItem('lfIntro','1');localStorage.setItem('lfPop',JSON.stringify({closed:Date.now()}))}catch(e){}"
CLEAN="document.querySelectorAll('#shopify-pc__banner, .shopify-pc__banner__dialog, #preview-bar-iframe, #PBarNextFrameWrapper').forEach(e=>e.remove())"
async def ctxp(b,w,h):
    ctx=await b.new_context(viewport={"width":w,"height":h}, locale="es-ES")
    await ctx.add_cookies(COOK); await ctx.add_init_script(INIT)
    pg=await ctx.new_page()
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    return ctx,pg,errs
async def main():
    log=open("fotos-tienda/capturas/log.txt","w")
    async with async_playwright() as p:
        b=await p.chromium.launch()
        for name,url in PAGES.items():
            # movil por tramos
            ctx,pg,errs=await ctxp(b,390,844)
            await pg.goto(url, timeout=60000, wait_until="networkidle"); await pg.wait_for_timeout(3500); await pg.evaluate(CLEAN)
            h=await pg.evaluate("document.documentElement.scrollHeight")
            y=0;i=0
            while y<h and i<8:
                await pg.evaluate(f"window.scrollTo(0,{y})"); await pg.wait_for_timeout(900)
                await pg.screenshot(path=f"fotos-tienda/capturas/{name}_m_{i}.png"); y+=780;i+=1
            open(f"fotos-tienda/capturas/{name}_m.txt","w").write(await pg.inner_text("body"))
            log.write(f"{name} movil errores JS: {errs}\n")
            await ctx.close()
            # escritorio: ventana alta
            ctx,pg,errs=await ctxp(b,1440,900)
            await pg.goto(url, timeout=60000, wait_until="networkidle"); await pg.wait_for_timeout(3500); await pg.evaluate(CLEAN)
            for k in range(4):
                await pg.mouse.wheel(0,820); await pg.wait_for_timeout(900)
                await pg.screenshot(path=f"fotos-tienda/capturas/{name}_d_{k}.png")
            await pg.evaluate("window.scrollTo(0,0)"); await pg.wait_for_timeout(800)
            await pg.screenshot(path=f"fotos-tienda/capturas/{name}_d_top.png")
            log.write(f"{name} escritorio errores JS: {errs}\n")
            await ctx.close()
        # prueba de carrito en la ficha
        ctx,pg,errs=await ctxp(b,390,844)
        await pg.goto(PAGES["prod"], timeout=60000, wait_until="networkidle"); await pg.wait_for_timeout(3000); await pg.evaluate(CLEAN)
        try:
            btn=pg.locator("product-form-component button[name=add], .product-information .add-to-cart-button").first
            await btn.click(timeout=10000); await pg.wait_for_timeout(1200)
            await pg.screenshot(path="fotos-tienda/capturas/cart_toast.png")
            await pg.wait_for_timeout(1500)
            await pg.screenshot(path="fotos-tienda/capturas/cart_drawer.png")
            c=await pg.evaluate("fetch('/cart.js').then(r=>r.json()).then(j=>j.item_count+' items, total '+j.total_price+' '+j.currency)")
            log.write(f"carrito: {c}\n")
        except Exception as e:
            log.write("carrito ERROR "+str(e)+"\n")
        log.write(f"carrito errores JS: {errs}\n")
        await ctx.close(); await b.close()
asyncio.run(main())

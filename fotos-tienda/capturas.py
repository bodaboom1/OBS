import asyncio, re
from playwright.async_api import async_playwright
B="https://www.lumifiesta.com"
D="fotos-tienda/capturas/"
INIT="try{sessionStorage.setItem('lfIntro','1');localStorage.setItem('lfPop',JSON.stringify({closed:Date.now()}))}catch(e){}"
async def main():
    log=open(D+"log.txt","w")
    def L(*a): log.write(" ".join(str(x) for x in a)+"\n"); log.flush()
    async with async_playwright() as p:
        b=await p.chromium.launch()
        for name,w,h,touch in [("d",1440,1000,False),("m",390,844,True)]:
            ctx=await b.new_context(viewport={"width":w,"height":h}, locale="es-ES", has_touch=touch, is_mobile=touch, timezone_id="Europe/Madrid")
            await ctx.add_init_script(INIT)
            pg=await ctx.new_page(); errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)[:200]))
            try:
                await pg.goto(B+"/products/red-de-telarana-led-para-halloween-8-modos", timeout=90000, wait_until="load"); await pg.wait_for_timeout(4000)
                L(name,"producto url:",pg.url)
                # anadir con el boton real
                btn=pg.locator("product-form-component button[type=submit], button[name=add]").first
                L(name,"boton:",await btn.inner_text() if await btn.count() else "NO HAY BOTON")
                await btn.click(); await pg.wait_for_timeout(3500)
                cart=await pg.evaluate("fetch('/cart.js').then(r=>r.json()).then(c=>c.item_count+' uds, total '+c.total_price/100+' '+c.currency)")
                L(name,"carrito:",cart)
                await pg.screenshot(path=D+f"{name}_1_carrito.png")
                await pg.goto(B+"/cart", timeout=90000); await pg.wait_for_timeout(3000)
                await pg.screenshot(path=D+f"{name}_2_cart.png", full_page=False)
                co=pg.locator("button[name=checkout], #checkout, a[href*='/checkout']").first
                L(name,"boton pagar:",await co.count())
                await co.click(); await pg.wait_for_load_state("load"); await pg.wait_for_timeout(9000)
                L(name,"checkout url:",pg.url)
                txt=await pg.evaluate("document.body.innerText")
                
                await pg.screenshot(path=D+f"{name}_3_checkout.png", full_page=True)
                if name=="d":
                    async def fill(sel,val):
                        loc=pg.locator(sel).first
                        if await loc.count(): await loc.fill(val); return True
                        return False
                    await fill("input[name=email], #email","prueba.lumifiesta@example.com")
                    await fill("input[name=firstName]","Prueba"); await fill("input[name=lastName]","Tienda")
                    await fill("input[name=address1]","Calle Mayor 1"); await fill("input[name=postalCode]","28013"); await fill("input[name=city]","Madrid")
                    z=pg.locator("select[name=zone]").first
                    if await z.count(): await z.select_option(label="Madrid")
                    await pg.keyboard.press("Tab"); await pg.wait_for_timeout(8000)
                    txt=await pg.evaluate("document.body.innerText")
                    i=txt.find("Métodos de envío"); L(name,"ENVIO:\n",re.sub(r"\n+","\n",txt[i:i+400])); j=txt.find("Resumen de costos"); L(name,"COSTES:\n",re.sub(r"\n+","\n",txt[j:j+400]))
                    await pg.screenshot(path=D+f"{name}_4_checkout_dir.png", full_page=True)
            except Exception as e:
                L(name,"FALLO:",str(e)[:400]); await pg.screenshot(path=D+f"{name}_fallo.png")
            L(name,"errores js:",errs); await ctx.close()
        await b.close()
asyncio.run(main())

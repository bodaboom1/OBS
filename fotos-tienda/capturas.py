import asyncio
from playwright.async_api import async_playwright
B="https://ypnmwd-as.myshopify.com"
T="preview_theme_id=207923544401"
PAGES={
 "home": B+"/?"+T,
 "fav": B+"/collections/mas-vendidos?"+T,
 "all": B+"/collections/all?"+T,
 "prod": B+"/products/lampara-proyectora-de-luna-usb-halloween-y-navidad?"+T,
}
async def shots(b,name,url,vw,vh,suf,n):
    ctx=await b.new_context(viewport={"width":vw,"height":vh}, locale="es-ES", device_scale_factor=1)
    await ctx.add_init_script("try{sessionStorage.setItem('lfIntro','1');localStorage.setItem('lfPop',JSON.stringify({closed:Date.now()}))}catch(e){}")
    pg=await ctx.new_page()
    try:
        await pg.goto(url, timeout=60000, wait_until="networkidle")
        await pg.wait_for_timeout(4000)
        await pg.evaluate("document.querySelectorAll('#shopify-pc__banner, .shopify-pc__banner__dialog, #preview-bar-iframe, #PBarNextFrameWrapper').forEach(e=>e.remove())")
        h=await pg.evaluate("document.documentElement.scrollHeight")
        open(f"fotos-tienda/capturas/{name}_{suf}.txt","w").write(f"height={h}\n"+await pg.inner_text("body"))
        i=0;y=0
        while y<h and i<n:
            await pg.evaluate(f"window.scrollTo(0,{y})"); await pg.wait_for_timeout(700)
            await pg.screenshot(path=f"fotos-tienda/capturas/{name}_{suf}_{i}.png")
            y+=vh-60;i+=1
    except Exception as e:
        open(f"fotos-tienda/capturas/{name}_{suf}.txt","w").write("ERROR "+str(e))
    await ctx.close()
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        for name,url in PAGES.items():
            await shots(b,name,url,390,844,"m",8)
            await shots(b,name,url,1366,860,"d",6)
        await b.close()
asyncio.run(main())

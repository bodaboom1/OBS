import asyncio
from playwright.async_api import async_playwright
B="https://ypnmwd-as.myshopify.com"
T="?preview_theme_id=207904145745"
PAGES={
 "en_us_home": B+"/en-us/"+T,
 "en_us_producto": B+"/en-us/products/red-de-telarana-led-para-halloween-8-modos"+T,
 "es_home": B+"/"+T,
 "es_producto": B+"/products/proyector-de-copos-de-nieve-led-giratorio-para-navidad"+T,
}
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        for name,url in PAGES.items():
            for vw,suf in [(1366,"pc"),(390,"movil")]:
                ctx=await b.new_context(viewport={"width":vw,"height":900}, locale="en-US" if name.startswith("en") else "es-ES")
                pg=await ctx.new_page()
                try:
                    await pg.goto(url, timeout=60000, wait_until="networkidle")
                    await pg.wait_for_timeout(5000)
                    await pg.evaluate("document.getElementById('lf-intro')&&document.getElementById('lf-intro').remove();var p=document.getElementById('lf-pop');if(p)p.hidden=true")
                    await pg.screenshot(path=f"fotos-tienda/capturas/{name}_{suf}.png", full_page=(suf=="pc"))
                    open(f"fotos-tienda/capturas/{name}_{suf}.txt","w").write(await pg.inner_text("body"))
                except Exception as e:
                    open(f"fotos-tienda/capturas/{name}_{suf}.txt","w").write("ERROR "+str(e))
                await ctx.close()
        await b.close()
asyncio.run(main())

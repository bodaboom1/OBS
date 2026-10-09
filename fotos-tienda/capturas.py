import asyncio, sys
from playwright.async_api import async_playwright
B="https://ypnmwd-as.myshopify.com"
T="preview_theme_id=207987048785"
COOK=[{"name":"localization","value":"ES","domain":"ypnmwd-as.myshopify.com","path":"/"},{"name":"cart_currency","value":"EUR","domain":"ypnmwd-as.myshopify.com","path":"/"}]
INIT="try{sessionStorage.setItem('lfIntro','1');localStorage.setItem('lfPop',JSON.stringify({closed:Date.now()}))}catch(e){}"
CLEAN="document.querySelectorAll('#shopify-pc__banner, .shopify-pc__banner__dialog, #preview-bar-iframe, #PBarNextFrameWrapper').forEach(e=>e.remove())"
D="fotos-tienda/capturas/"
TAG=open("fotos-tienda/capturas_tag.txt").read().strip() if __import__('os').path.exists("fotos-tienda/capturas_tag.txt") else "x"
DOM="""(()=>{const img=document.querySelector('.product-information media-gallery img, .product-information img');if(!img)return 'NOIMG';let e=img,out=[];for(let i=0;i<14&&e;i++){const r=e.getBoundingClientRect();out.push(e.tagName.toLowerCase()+'.'+[...e.classList].join('.')+' '+Math.round(r.width)+'x'+Math.round(r.height));e=e.parentElement}return out.join('\\n  ')})()"""
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
        for name,w,h,touch in [("d",1440,900,False),("t",1024,768,True),("m",390,844,True)]:
            for prod in ["lampara-proyectora-de-luna-usb-halloween-y-navidad","red-de-telarana-led-para-halloween-8-modos"]:
                ctx,pg,errs=await ctxp(b,w,h,touch); await go(pg,B+"/products/"+prod+"?"+T)
                L(name,prod,"\n  "+await pg.evaluate(DOM))
                await pg.screenshot(path=D+f"{name}_{prod[:6]}.png")
                L("errores:",errs); await ctx.close()
        await b.close()
asyncio.run(main())

import asyncio
from playwright.async_api import async_playwright
B="https://ypnmwd-as.myshopify.com"
T="preview_theme_id=207937306961"
PROD=B+"/products/red-de-telarana-led-para-halloween-8-modos?"+T
COOK=[{"name":"localization","value":"ES","domain":"ypnmwd-as.myshopify.com","path":"/"},{"name":"cart_currency","value":"EUR","domain":"ypnmwd-as.myshopify.com","path":"/"}]
INIT="try{sessionStorage.setItem('lfIntro','1');localStorage.setItem('lfPop',JSON.stringify({closed:Date.now()}))}catch(e){}"
CLEAN="document.querySelectorAll('#shopify-pc__banner, .shopify-pc__banner__dialog, #preview-bar-iframe, #PBarNextFrameWrapper').forEach(e=>e.remove())"
D="fotos-tienda/capturas/"
PROBE="""()=>{const r=e=>{if(!e)return '-';const b=e.getBoundingClientRect();return Math.round(b.top)+'..'+Math.round(b.bottom)};
const bar=document.querySelector('sticky-add-to-cart [ref=stickyBar]');
const cs=bar?getComputedStyle(bar):null;
return 'y='+Math.round(scrollY)+' stuck='+(bar&&bar.dataset.stuck)+' bar='+r(bar)+(cs?(' op='+cs.opacity+' vis='+cs.visibility+' pos='+cs.position):'')+' bb='+r(document.querySelector('.buy-buttons-block'))+' atc='+r(document.querySelector('product-form-component [ref=addToCartButton]'))+' gal='+r(document.querySelector('.product-information media-gallery'))+' hdr='+r(document.querySelector('#header-component'))+' footer='+r(document.querySelector('footer'))+' H='+document.documentElement.scrollHeight}"""
async def run(b,name,w,h,touch):
    ctx=await b.new_context(viewport={"width":w,"height":h}, locale="es-ES", has_touch=touch, is_mobile=touch)
    await ctx.add_cookies(COOK); await ctx.add_init_script(INIT)
    pg=await ctx.new_page()
    await pg.goto(PROD, timeout=60000, wait_until="load"); await pg.wait_for_timeout(5000); await pg.evaluate(CLEAN)
    log.write(f"== {name} {w}x{h}\n")
    log.write("sticky html: "+(await pg.evaluate("(document.querySelector('sticky-add-to-cart')||{outerHTML:'none'}).outerHTML.slice(0,1500)"))+"\n")
    log.write("sticky css: "+(await pg.evaluate("(()=>{const b=document.querySelector('sticky-add-to-cart [ref=stickyBar]');if(!b)return '';const c=getComputedStyle(b);return [c.position,c.bottom,c.top,c.left,c.right,c.width,c.transform,c.transition].join(' | ')})()"))+"\n")
    prev=None; shot=0
    for y in range(0,4000,120):
        await pg.evaluate(f"window.scrollTo(0,{y})"); await pg.wait_for_timeout(350)
        s=await pg.evaluate(PROBE); log.write(s+"\n")
        st='stuck=true' in s
        if st!=prev and shot<4:
            await pg.screenshot(path=D+f"{name}_{shot}_y{y}.png"); shot+=1
        prev=st
    await ctx.close()
async def main():
    global log; log=open(D+"log.txt","w")
    async with async_playwright() as p:
        b=await p.chromium.launch()
        await run(b,"m",390,844,True)
        await run(b,"t",820,1180,True)
        await run(b,"d",1440,900,False)
        await b.close()
asyncio.run(main())

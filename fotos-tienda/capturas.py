import asyncio
from playwright.async_api import async_playwright
B="https://ypnmwd-as.myshopify.com"
T="preview_theme_id=207937306961"
COOK=[{"name":"localization","value":"ES","domain":"ypnmwd-as.myshopify.com","path":"/"},{"name":"cart_currency","value":"EUR","domain":"ypnmwd-as.myshopify.com","path":"/"}]
INIT="try{sessionStorage.setItem('lfIntro','1');localStorage.setItem('lfPop',JSON.stringify({closed:Date.now()}))}catch(e){}"
D="fotos-tienda/capturas/"
SC="""()=>{const out=[];for(const e of [document.documentElement,document.body,...document.querySelectorAll('body *')]){const c=getComputedStyle(e);if((/(auto|scroll|hidden)/.test(c.overflowY)||/(auto|scroll|hidden)/.test(c.overflowX))&&e.scrollHeight>e.clientHeight+50&&e.clientHeight>300){out.push((e.tagName+'#'+e.id+'.'+String(e.className).slice(0,40))+' ox='+c.overflowX+' oy='+c.overflowY+' h='+c.height+' sh='+e.scrollHeight+' ch='+e.clientHeight)}};
const h=getComputedStyle(document.documentElement),b=getComputedStyle(document.body);return 'html ox/oy '+h.overflowX+'/'+h.overflowY+' h='+h.height+' | body ox/oy '+b.overflowX+'/'+b.overflowY+' h='+b.height+' | scrollingEl='+document.scrollingElement.tagName+'\\n'+out.slice(0,8).join('\\n')}"""
COL="""()=>{const bb=document.querySelector('.buy-buttons-block');let e=bb,out=[];while(e&&e!==document.body){const r=e.getBoundingClientRect();out.push(e.tagName+'.'+String(e.className).replace(/\\s+/g,'.').slice(0,60)+' x='+Math.round(r.left)+' w='+Math.round(r.width));e=e.parentElement}return out.join('\\n')}"""
async def main():
    log=open(D+"log.txt","w")
    async with async_playwright() as p:
        b=await p.chromium.launch()
        for w,h in [(1440,900),(390,844)]:
            ctx=await b.new_context(viewport={"width":w,"height":h}, locale="es-ES")
            await ctx.add_cookies(COOK); await ctx.add_init_script(INIT)
            pg=await ctx.new_page()
            for u in ["/","/products/red-de-telarana-led-para-halloween-8-modos"]:
                await pg.goto(B+u+"?"+T, timeout=60000, wait_until="load"); await pg.wait_for_timeout(4000)
                log.write(f"== {w} {u}\n"+await pg.evaluate(SC)+"\n")
                if "products" in u: log.write(await pg.evaluate(COL)+"\n")
            await ctx.close()
        await b.close()
asyncio.run(main())

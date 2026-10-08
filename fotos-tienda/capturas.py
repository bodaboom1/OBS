import asyncio, json
from playwright.async_api import async_playwright
B="https://ypnmwd-as.myshopify.com"
D="fotos-tienda/capturas/"
H="red-de-telarana-led-para-halloween-8-modos"
async def main():
    log=open(D+"log.txt","w")
    def L(*a): log.write(" ".join(str(x) for x in a)+"\n"); log.flush()
    async with async_playwright() as p:
        b=await p.chromium.launch()
        for cc in ["FR","DE"]:
            ctx=await b.new_context(locale="es-ES")
            await ctx.add_cookies([{"name":"localization","value":cc,"domain":"ypnmwd-as.myshopify.com","path":"/"}])
            pg=await ctx.new_page()
            await pg.goto(B+"/products/"+H, timeout=90000, wait_until="load"); await pg.wait_for_timeout(2500)
            r=await pg.evaluate("""async(cc)=>{
              const out={};
              const s=await fetch('/localization',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({form_type:'localization',_method:'put',country_code:cc,language_code:'es',return_to:'/'}).toString(),redirect:'follow'});
              out.post=s.status;
              const ctx=await (await fetch('/browsing_context_suggestions.json')).json().catch(()=>({}));
              out.detected=JSON.stringify(ctx).slice(0,160);
              const pj=await (await fetch('/products/"""+H+""".js')).json();
              out.available=pj.available; out.vavail=pj.variants.map(v=>v.available).join(','); out.price=pj.price;
              const a=await fetch('/cart/add.js',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:pj.variants[0].id,quantity:1})});
              out.add=a.status+' '+(await a.text()).slice(0,160);
              const c=await (await fetch('/cart.js')).json(); out.cart=c.item_count+' '+c.currency;
              return JSON.stringify(out)}""", cc)
            L(cc, r)
            await pg.goto(B+"/products/"+H, timeout=90000, wait_until="load"); await pg.wait_for_timeout(2500)
            L(cc,"live boton:",await pg.evaluate("(document.querySelector('product-form-component [ref=addToCartButton]')||document.querySelector('[name=add]')||{innerText:'?'}).innerText.trim()"),"| html country:",await pg.evaluate("(document.querySelector('[name=country_code]')||{value:'?'}).value"))
            for u in ["/collections/halloween","/collections/navidad","/collections/mas-vendidos","/collections/all"]:
                rr=await pg.goto(B+u, timeout=90000, wait_until="load")
                L(cc,u,rr.status,await pg.evaluate("document.querySelectorAll('product-card').length")+0)
            await ctx.close()
        await b.close()
asyncio.run(main())

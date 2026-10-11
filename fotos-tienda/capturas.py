import asyncio, re, json
from playwright.async_api import async_playwright
D="fotos-tienda/capturas/"
IDS={"telarana":"1005009648924450","calabazas":"1005009496493148","proyector":"1005009835258944","brujas":"1005009711974697","otono":"1005003253140615","micro":"1005010089232181","ramas":"1005006511511206","bolas":"1005007767236069","cinta":"1005009635702053","nevada":"1005006207241570"}
async def main():
    log=open(D+"log.txt","w")
    def L(*a): log.write(" ".join(str(x) for x in a)+"\n"); log.flush()
    async with async_playwright() as p:
        b=await p.chromium.launch()
        ctx=await b.new_context(viewport={"width":1366,"height":900}, locale="es-ES", timezone_id="Europe/Madrid",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36")
        await ctx.add_cookies([{"name":"aep_usuc_f","value":"site=esp&c_tp=EUR&region=ES&b_locale=es_ES","domain":".aliexpress.com","path":"/"},
                               {"name":"xman_us_f","value":"x_l=0&x_locale=es_ES","domain":".aliexpress.com","path":"/"}])
        for k,i in IDS.items():
            pg=await ctx.new_page()
            try:
                await pg.goto(f"https://es.aliexpress.com/item/{i}.html", timeout=60000, wait_until="domcontentloaded"); await pg.wait_for_timeout(7000)
                t=await pg.evaluate("document.body.innerText")
                title=await pg.title()
                prices=re.findall(r"\d+,\d{2}\s?€|€\s?\d+,\d{2}",t)[:8]
                ship=[l for l in t.splitlines() if re.search(r"(?i)env[ií]o|entrega",l)][:5]
                skus=[l for l in t.splitlines() if re.search(r"(?i)color|tamaño|longitud|modelo",l)][:3]
                L(k,"|",title[:70],"| precios:",prices,"| envio:",ship,"| sku:",skus)
                await pg.screenshot(path=D+f"ali_{k}.png")
            except Exception as e: L(k,"FALLO",str(e)[:200])
            await pg.close()
        await b.close()
asyncio.run(main())

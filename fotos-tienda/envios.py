import asyncio, re, json
from playwright.async_api import async_playwright
ITEMS = {
 "telarana":"1005009648924450","brujas":"1005009711974697","calabazas":"1005009496493148",
 "proyector":"1005009835258944","otono":"1005003253140615","micro":"1005010089232181",
 "ramas":"1005006511511206","bolas":"1005007767236069","cinta":"1005009635702053",
 "nevada":"1005006207241570"}
async def main():
    out = {}
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(locale="es-ES", timezone_id="Europe/Madrid",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
            viewport={"width":1366,"height":2000})
        await ctx.add_cookies([{"name":"aep_usuc_f","value":"site=esp&c_tp=EUR&region=ES&b_locale=es_ES","domain":".aliexpress.com","path":"/"}])
        for k,i in ITEMS.items():
            pg = await ctx.new_page()
            try:
                await pg.goto(f"https://es.aliexpress.com/item/{i}.html", timeout=60000)
                await pg.wait_for_timeout(9000)
                txt = await pg.inner_text("body")
                lines = [l.strip() for l in txt.splitlines() if re.search(r"(entrega|envío|envio|llega|días|Choice|desde|España)", l, re.I) and len(l.strip())<160]
                out[k] = lines[:40]
                await pg.screenshot(path=f"fotos-tienda/envios/{k}.png", clip={"x":0,"y":0,"width":1366,"height":1100})
            except Exception as e:
                out[k] = ["ERROR "+str(e)[:200]]
            await pg.close()
        await b.close()
    with open("fotos-tienda/envios/envios.json","w") as f: json.dump(out,f,ensure_ascii=False,indent=1)
asyncio.run(main())

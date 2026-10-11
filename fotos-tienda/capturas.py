import asyncio
from playwright.async_api import async_playwright
D="fotos-tienda/capturas/"
P={
"calabazas":["S2c29daf7d83b4138a8abdb67632af862g.webp","S0b21464a538349f2a1cbfd6071bcb930I.webp","S7c0604bf13164cc08587a253c3e34919h.webp","Sa53f0d953def46baa92dd82bc3b3e8b39.webp","Sa202ea4a2bf2402c8600931d91c6a4e9i.webp"],
"telarana":["Sd45684cd2d3c4bf0a27b07f5859e1906C.webp","S4a49dfec3d204fc0a53b3edb1563e83bx.webp","S9c61510834304a169d41ab27219f52bbU.webp","Sb63750755dc140c0908b3e0d2e21f322W.webp","S76287694fbc046d6904cda709b5ffba5p.webp"],
"proyector":["lumifiesta-proyector-navidad-salon.jpg","lumifiesta-proyector-halloween-luna.jpg","lumifiesta-lampara-luna-halloween-navidad.jpg","lumifiesta-lampara-luna-navidad.jpg","lumifiesta-lampara-luna-halloween.jpg","S7c16f5691e98473ba3989c3f6769bb48B.webp","Sfb4cc79e2c8f4957990a48dcf116d5e1x.webp","Se24d3429795040169490ee1c71252eeec.webp","Sadc25b296bb64d0e907cf115680b3384y.webp"],
"brujas":["S8a200c5ee29b4621abe2bc1d12299562J.webp","S3c566692ba0448f79747f8834fd11031t.webp","Sb08032e7b4574a9b9b4cac73471333162.webp","Sf03d41298e5342c3a69c0d69d15a08a8N.webp","Sf636ebac76254a889afcf6a099f0ea8cQ.webp"],
"otono":["2-3-6M-Christmas-Decoration-Artificial-Maple-Leaf-Leaves-LED-Light-String-Lantern-Garland-Home-Party_bb3fb99a-945c-4295-b949-0b873c0b85cc.webp","2-3-6M-Christmas-Decoration-Artificial-Maple-Leaf-Leaves-LED-Light-String-Lantern-Garland-Home-Party_1b323719-dc64-4fcc-b2f5-0f1e78789d94.webp","2-3-6M-Christmas-Decoration-Artificial-Maple-Leaf-Leaves-LED-Light-String-Lantern-Garland-Home-Party_fea1cc4a-d8db-4946-8e91-c98c80567491.webp","2-3-6M-Christmas-Decoration-Artificial-Maple-Leaf-Leaves-LED-Light-String-Lantern-Garland-Home-Party.webp","A324450740472464a905dc3011ad646a5F.webp","A35d1ff43b5ea433383c15056420f58ea8.webp"],
"micro":["S49d691a36b8541a79859b1bfe804926ad.webp","S72093bd370e4452aa97bb3dfd8b355f9v.webp","S5ca67d19b4da4485a951aba192db933fE.webp","S79f6e70d49604902929d921b0a029437O.webp","S2185e265beef42f3bde65c235dc14001G.webp"],
"ramas":["S5241d8c4918b409094ce72e748c0065ac.webp","S89ef51a00d6d4abe9bd780612cf9573fJ.webp","S4c7ac6119de645288025b9e8d00c3ea6p.webp","S6efb07e6ec4648fb94ac2b1488852cddG.webp","S00772b5635a3494bb09b48b22349e7139.webp"],
"bolas":["S4e64df0d5920439a9f79271f8ef4d621G.webp","S16eabf3f159b47fea816e1bac934ef856.webp","S6e3a8a5824f9429aa30ec53b391257cbn.webp","S7127b617acf44c0da4a66ca9a3ab715ap.webp","Sf29754b23006470ea9b5e228a7dcc699Q.webp"],
"cinta":["S5491c10e4478485e881c005949c3d296T.webp","S1f6257e352af4340960f64dee0ff799e0.webp","S431b54f690744c06983e07ea53c5b822b.webp","S2fed2a4ebc104e369d34f64b03b85d03O.webp","S1d1fe43b3aa84d9d97513b961e01a99fv.webp"],
"nevada":["Sd42919b6bfcf4df696bfa64c29bae74et.webp","Sf6db70ee81244c00b8fca5466e2a8a2bK.webp","Se1b4557d21f84ec69b21d6bdd9889ac9w.webp","Se0a754e211784c0c83e1390f14cfdc46x.webp","S61a8158b3f064d87a084690ea36bc7605.webp"]}
U="https://cdn.shopify.com/s/files/1/1088/7276/1681/files/"
async def main():
    rows="".join(f"<div class=r><b>{k}</b>"+"".join(f"<figure><img src='{U}{f}?width=260'><figcaption>{i}</figcaption></figure>" for i,f in enumerate(v))+"</div>" for k,v in P.items())
    html=f"<html><body style='margin:0;font:14px sans-serif'><style>.r{{display:flex;gap:6px;align-items:center;padding:4px}}.r b{{width:80px}}figure{{margin:0;text-align:center}}img{{width:180px;height:180px;object-fit:contain;background:#eee}}</style>{rows}</body></html>"
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={"width":1800,"height":800})
        await pg.set_content(html); await pg.wait_for_timeout(8000)
        await pg.screenshot(path=D+"fotos_todas.png", full_page=True); await b.close()
asyncio.run(main())

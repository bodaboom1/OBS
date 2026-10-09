# Descarga reseñas públicas de AliExpress de cada producto (mismo artículo que vende Lumifiesta)
import json, urllib.request, time, os
IDS={"telarana":"1005009648924450","calabazas":"1005009496493148","proyector-magico":"1005009835258944","brujas":"1005009711974697","otono":"1005003253140615","micro":"1005010089232181","ramas":"1005006511511206","bolas":"1005007767236069","cinta":"1005009635702053","nevada":"1005006207241570"}
D="fotos-tienda/capturas/"
log=open(D+"log.txt","w")
H={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36","Accept":"application/json, text/plain, */*","Referer":"https://www.aliexpress.com/"}
out={}
for k,pid in IDS.items():
    revs=[];info={}
    for page in range(1,6):
        url=f"https://feedback.aliexpress.com/pc/searchEvaluation.do?productId={pid}&lang=es_ES&country=ES&page={page}&pageSize=20&filter=all&sort=complex_default"
        try:
            r=urllib.request.urlopen(urllib.request.Request(url,headers=H),timeout=30).read().decode("utf-8","ignore")
            j=json.loads(r)
        except Exception as e:
            log.write(f"{k} p{page} ERROR {str(e)[:150]}\n"); break
        d=j.get("data") or {}
        if page==1:
            info={kk:d.get(kk) for kk in ["productEvaluationStatistic","totalNum","totalPage"]}
        lst=d.get("evaViewList") or []
        revs+=lst
        if len(lst)<20: break
        time.sleep(1.5)
    out[k]={"id":pid,"info":info,"reviews":revs}
    st=(info.get("productEvaluationStatistic") or {})
    log.write(f"{k} {pid}: total={info.get('totalNum')} media={st.get('evarageStar') or st.get('averageStar')} descargadas={len(revs)}\n")
    log.flush()
json.dump(out,open(D+"aliexpress-resenas.json","w"),ensure_ascii=False,indent=1)

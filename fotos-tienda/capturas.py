import subprocess
D="fotos-tienda/capturas/"
out=[]
def run(c): r=subprocess.run(c,capture_output=True,text=True); return (r.stdout+r.stderr).strip()
for u in ["https://ypnmwd-as.myshopify.com/","https://mylumifiestastore.myshopify.com/","https://lumifiesta.com/","https://www.lumifiesta.com/","https://lumifiesta.com/products/red-de-telarana-led-para-halloween-8-modos"]:
    out.append(u+"  =>  "+run(["curl","-sS","-o","/dev/null","-L","-m","30","-w","%{http_code} final=%{url_effective}",u]))
open(D+"log.txt","w").write("\n".join(out))

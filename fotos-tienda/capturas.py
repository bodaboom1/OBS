import subprocess
D="fotos-tienda/capturas/"
out=[]
for u in ["https://mylumifiestastore.myshopify.com/","https://ypnmwd-as.myshopify.com/","https://ypnmwd-as.myshopify.com/products/red-de-telarana-led-para-halloween-8-modos","http://mylumifiestastore.myshopify.com/"]:
    r=subprocess.run(["curl","-sS","-o","/dev/null","-w","%{http_code} -> %{redirect_url} | ssl_verify=%{ssl_verify_result}","-m","30",u],capture_output=True,text=True)
    out.append(u+"\n  "+r.stdout+" "+r.stderr.strip())
    r=subprocess.run(["curl","-sSv","-o","/dev/null","-m","30",u],capture_output=True,text=True)
    out.append("  "+"\n  ".join(l for l in r.stderr.splitlines() if any(k in l for k in ["SSL","subject","issuer","subjectAltName","alert","error","location:","Connected","HTTP/"]))[:1500])
for h in ["mylumifiestastore.myshopify.com","ypnmwd-as.myshopify.com"]:
    r=subprocess.run(["dig","+short",h],capture_output=True,text=True); out.append(h+" DNS: "+r.stdout.replace("\n"," "))
open(D+"log.txt","w").write("\n".join(out))

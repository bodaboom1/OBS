import subprocess
D="fotos-tienda/capturas/"
out=[]
def run(c): r=subprocess.run(c,capture_output=True,text=True); return (r.stdout+r.stderr).strip()
for h in ["lumifiesta.com","www.lumifiesta.com"]:
    for t in ["A","AAAA","CNAME","NS","CAA"]:
        out.append(f"{h} {t}: "+run(["dig","+short",t,h]).replace("\n"," "))
    out.append(h+" whois/NS @8.8.8.8: "+run(["dig","+short","NS",h,"@8.8.8.8"]).replace("\n"," "))
for u in ["https://lumifiesta.com/","https://www.lumifiesta.com/","http://lumifiesta.com/","http://www.lumifiesta.com/"]:
    r=run(["curl","-sSv","-o","/dev/null","-m","25",u])
    out.append(u+"\n  "+"\n  ".join(l for l in r.splitlines() if any(k in l for k in ["SSL","subject","issuer","alert","rror","location:","Connected","< HTTP","curl:"]))[:1500])
out.append("openssl: "+run(["bash","-c","echo | timeout 20 openssl s_client -connect lumifiesta.com:443 -servername lumifiesta.com 2>&1 | head -30"]))
open(D+"log.txt","w").write("\n".join(out))

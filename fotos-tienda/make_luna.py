import numpy as np, sys
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
def objects(im):
    a=np.asarray(im).astype(int)
    nw=(a.min(axis=2)<235); nw=ndimage.binary_closing(nw,iterations=3); nw=ndimage.binary_fill_holes(nw)
    lab,n=ndimage.label(nw); res=[]
    for i,sl in enumerate(ndimage.find_objects(lab)):
        area=(lab[sl]==i+1).sum()
        if area>20000: res.append((sl[1].start,sl[0].start,sl[1].stop,sl[0].stop,lab==i+1))
    return res
def cover(src,out,mode):
    im=Image.open(src).convert('RGB'); objs=objects(im)
    big=max(objs,key=lambda o:(o[2]-o[0])*(o[3]-o[1]))
    circles=sorted([o for o in objs if abs((o[2]-o[0])-(o[3]-o[1]))<25 and (o[2]-o[0])>150 and o[0]<300],key=lambda o:o[1])
    x0,y0,x1,y1,m=big
    mask=Image.fromarray((m*255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.2))
    proj=im.crop((x0,y0,x1,y1)); pm=mask.crop((x0,y0,x1,y1))
    W=1600; bg=Image.new('RGB',(W,W),(241,236,228))
    glow=Image.new('L',(W,W),0); ImageDraw.Draw(glow).ellipse((300,200,1500,1400),fill=255); glow=glow.filter(ImageFilter.GaussianBlur(220))
    bg=Image.composite(Image.new('RGB',(W,W),(250,247,242)),bg,glow)
    ph=1080; pw=int(proj.width*ph/proj.height); proj=proj.resize((pw,ph),Image.LANCZOS); pm=pm.resize((pw,ph),Image.LANCZOS)
    px,py=W-pw-150,(W-ph)//2+30
    sh=Image.new('L',(W,W),0); ImageDraw.Draw(sh).ellipse((px+60,py+ph-50,px+pw+20,py+ph+40),fill=120); sh=sh.filter(ImageFilter.GaussianBlur(45))
    bg.paste(Image.new('RGB',(W,W),(110,95,80)),(0,0),sh); bg.paste(proj,(px,py),pm)
    D=340; ys=[230,630,1030]
    for o,y in zip(circles,ys):
        cx0,cy0,cx1,cy1,_=o; inset=4
        c=im.crop((cx0+inset,cy0+inset,cx1-inset,cy1-inset)).resize((D,D),Image.LANCZOS)
        cm=Image.new('L',(D*4,D*4),0); ImageDraw.Draw(cm).ellipse((0,0,D*4-1,D*4-1),fill=255); cm=cm.resize((D,D),Image.LANCZOS)
        x=170
        s2=Image.new('L',(W,W),0); ImageDraw.Draw(s2).ellipse((x,y+18,x+D,y+D+18),fill=100); s2=s2.filter(ImageFilter.GaussianBlur(22))
        bg.paste(Image.new('RGB',(W,W),(110,95,80)),(0,0),s2); bg.paste(c,(x,y),cm)
    bg=bg.filter(ImageFilter.UnsharpMask(1.5,40,2))
    bg.save(out,quality=92); print(out,len(circles))
for f,o in [('luna_1','luna_navidad'),('luna_2','luna_halloween'),('luna_4','luna_halloween2'),('luna_3','luna_planetas')]:
    cover(f+'.webp','../out/'+o+'.jpg','x')

import os, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
W,H=1920,1080; TURQ=(0,206,201)
FD="/tmp/claude-0/-home-user-SistemaKA/250d33d7-094b-5ebc-8866-21bfbc4d55c3/scratchpad/fonts"
def Ft(s,w): return ImageFont.truetype(os.path.join(FD,{"eb":"Sora-ExtraBold.ttf","sb":"Sora-SemiBold.ttf","rg":"Sora-Regular.ttf"}[w]),s)
def tsz(d,t,f): b=d.textbbox((0,0),t,font=f); return b[2]-b[0],b[3]-b[1]
def bg():
    top=np.array([11,17,32]); bot=np.array([16,26,46]); g=np.zeros((H,W,3),np.uint8)
    for y in range(H): g[y,:]=(top+(bot-top)*(y/H)).astype(np.uint8)
    im=Image.fromarray(g,"RGB").convert("RGBA")
    gl=Image.new("RGBA",(W,H),(0,0,0,0)); ImageDraw.Draw(gl).ellipse([W//2-560,120,W//2+560,900],fill=(0,150,150,110))
    im.alpha_composite(gl.filter(ImageFilter.GaussianBlur(180))); return im.convert("RGB")
def ctext(d,y,t,f,fill):
    w,_=tsz(d,t,f); d.text((W/2-w/2,y),t,font=f,fill=fill)
def fit(d,t,maxw,sizes):
    for s in sizes:
        f=Ft(s,"eb")
        if tsz(d,t,f)[0]<=maxw: return f
    return Ft(sizes[-1],"eb")

os.makedirs("cards",exist_ok=True)
def title_card(name,num,title,sub=None):
    im=bg(); d=ImageDraw.Draw(im)
    ctext(d,392,num,Ft(76,"eb"),TURQ)
    f=fit(d,title,W-200,[58,54,50,46,42]); ctext(d,512,title,f,(245,247,250))
    _,th=tsz(d,title,f); uy=512+th+34
    d.rounded_rectangle([W/2-62,uy,W/2+62,uy+6],3,fill=TURQ)
    if sub: ctext(d,uy+34,sub,Ft(38,"sb"),TURQ)
    im.save(f"cards/{name}.png")
def info_card(name,items):
    im=bg(); d=ImageDraw.Draw(im)
    d.rounded_rectangle([W/2-60,352,W/2+60,358],3,fill=TURQ)
    f=Ft(46,"rg"); lh=84; total=lh*len(items); y=H/2-total/2+40
    for it in items: ctext(d,y,it,f,(236,240,248)); y+=lh
    im.save(f"cards/{name}.png")
def atividades():
    im=bg(); d=ImageDraw.Draw(im)
    ctext(d,392,"ATIVIDADES",Ft(92,"eb"),(245,247,250))
    ctext(d,392+108,"DO CONECTA",Ft(92,"eb"),(245,247,250))
    ctext(d,392+108+150,"2026",Ft(96,"eb"),TURQ)
    im.save("cards/atividades.png")

atividades()
title_card("c01","01","REUNIÕES DE ALINHAMENTO")
title_card("c02","02","VISITAS 1:1")
title_card("c03","03","VISITAS TÉCNICAS","9 realizadas")
title_card("c04","04","PITCH LIVRO · 25 TÍTULOS")
title_card("c05","05","DIVULGAÇÃO DO LIVRO")
title_card("c06","06","EXERCÍCIO DE PITCH FILMADO")
title_card("c07","07","EVENTOS EXTERNOS")
title_card("c08","08","CEO DE SI MESMO")
title_card("c09","09","CAPACITAÇÕES INTERNAS")
title_card("c10","10","SENSIBILIZAÇÃO")
title_card("c29","29","PITCH DE TRAJETÓRIA","29 participantes · 29 histórias")
info_card("reuniao",["Trilha Comunicar","Trilha Conectar","Trilha Capacitar","Coordenação","Reunião Geral"])
info_card("ckelly",["Livro da nossa nucleada","Kelly Albert"])
info_card("cpainel",["Painel da Mulher · 13/03","Rodada de Negócios ACIGRA · 23/04","Café com Negócios ACIGRA · 16/07","Almoço dos 98 anos da ACIGRA"])
info_card("cmercopar",["Mercopar · 21/10","Marcas e Líderes · 4 premiados","Lab Experiências de Moda · Sindilojas"])
info_card("caplist",["Reforma Tributária · Irajá","Comunicação e Oratória · Vox2You","Gestão Financeira · ComLucro","Imagem Pessoal · Aline Dutra","Clareza na Era da IA · KA + Witu","NR1 Riscos Psicossociais · Painel"])
print("cards gerados")

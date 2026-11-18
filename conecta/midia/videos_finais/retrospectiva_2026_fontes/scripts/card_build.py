import os, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
FD="/tmp/claude-0/-home-user-SistemaKA/250d33d7-094b-5ebc-8866-21bfbc4d55c3/scratchpad/fonts"
LOGO="/tmp/claude-0/-home-user-SistemaKA/250d33d7-094b-5ebc-8866-21bfbc4d55c3/scratchpad/conecta_logo_out/Logo Conecta (branco).png"
W,H=1920,1080; TURQ=(0,206,201)
def Ft(sz,w): return ImageFont.truetype(os.path.join(FD,{"eb":"Sora-ExtraBold.ttf","sb":"Sora-SemiBold.ttf"}[w]),sz)
def ctext(d,cx,y,t,f,fill,ls=0):
    if ls:
        ws=[d.textbbox((0,0),ch,font=f)[2] for ch in t]; full=sum(ws)+ls*(len(t)-1); x=cx-full/2
        for ch,w0 in zip(t,ws): d.text((x,y),ch,font=f,fill=fill); x+=w0+ls
    else:
        b=d.textbbox((0,0),t,font=f); d.text((cx-(b[2]-b[0])/2,y),t,font=f,fill=fill)
def make_bg():
    top=np.array([11,17,32]); bot=np.array([16,26,46]); grad=np.zeros((H,W,3),np.uint8)
    for y in range(H): grad[y,:]=(top+(bot-top)*(y/H)).astype(np.uint8)
    im=Image.fromarray(grad,"RGB").convert("RGBA")
    glow=Image.new("RGBA",(W,H),(0,0,0,0)); gd=ImageDraw.Draw(glow)
    gd.ellipse([W//2-560,120,W//2+560,900],fill=(0,150,150,120)); glow=glow.filter(ImageFilter.GaussianBlur(180))
    im.alpha_composite(glow); return im
bg=make_bg(); bg.convert("RGB").save("bg_navy_teal.png")
# card completo (capa + abertura/encerramento) com separada maior no RETROSPECTIVA
im=bg.copy(); d=ImageDraw.Draw(im)
lg=Image.open(LOGO).convert("RGBA"); lw=470; lg=lg.resize((lw,int(lg.height*lw/lg.width)),Image.LANCZOS)
fr=Ft(42,"sb"); f26=Ft(84,"eb")
hr=42; g1=64; hl=lg.height; g2=16; h26=f26.getbbox("2026")[3]
total=hr+g1+hl+g2+h26; y=H//2-total//2
ctext(d,W//2,y,"RETROSPECTIVA",fr,(232,240,248),ls=16); y+=hr+g1
im.alpha_composite(lg,(W//2-lg.width//2,y)); y+=hl+g2
ctext(d,W//2,y,"2026",f26,TURQ)
im.convert("RGB").save("card_retro.png")
im.convert("RGB").save("Capa_Retrospectiva_Conecta_2026_horizontal.jpg",quality=94)
print("ok")

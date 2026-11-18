import os, math, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
W,H=1920,1080; FPS=30
FD="/tmp/claude-0/-home-user-SistemaKA/250d33d7-094b-5ebc-8866-21bfbc4d55c3/scratchpad/fonts"
LOGO="/tmp/claude-0/-home-user-SistemaKA/250d33d7-094b-5ebc-8866-21bfbc4d55c3/scratchpad/conecta_logo_out/Logo Conecta (branco).png"
TURQ=(0,206,201)
def Ft(s,w): return ImageFont.truetype(os.path.join(FD,{"eb":"Sora-ExtraBold.ttf","sb":"Sora-SemiBold.ttf","rg":"Sora-Regular.ttf"}[w]),s)
# --- BG navy+teal ---
top=np.array([11,17,32]); bot=np.array([16,26,46]); grad=np.zeros((H,W,3),np.uint8)
for y in range(H): grad[y,:]=(top+(bot-top)*(y/H)).astype(np.uint8)
BG=Image.fromarray(grad,"RGB").convert("RGBA")
# glow layer (teal), opacity varied per frame
glow=Image.new("RGBA",(W,H),(0,0,0,0)); gd=ImageDraw.Draw(glow)
gd.ellipse([W//2-560,120,W//2+560,900],fill=(0,170,165,255)); GLOW=glow.filter(ImageFilter.GaussianBlur(190))
def glow_at(op):
    g=GLOW.copy(); a=np.asarray(g).copy(); a[:,:,3]=(a[:,:,3]*op).astype(np.uint8); return Image.fromarray(a,"RGBA")
LG=Image.open(LOGO).convert("RGBA")
def txt_png(text,font,fill,track=0):
    tmp=ImageDraw.Draw(Image.new("RGBA",(10,10)))
    if track:
        ws=[tmp.textbbox((0,0),c,font=font)[2] for c in text]; tw=sum(ws)+track*(len(text)-1); th=font.getbbox("Ag")[3]
        im=Image.new("RGBA",(tw+4,th+10),(0,0,0,0)); d=ImageDraw.Draw(im); x=0
        for c,w0 in zip(text,ws): d.text((x,0),c,font=font,fill=fill); x+=w0+track
        return im
    b=tmp.textbbox((0,0),text,font=font); im=Image.new("RGBA",(b[2]-b[0]+4,b[3]-b[1]+10),(0,0,0,0))
    ImageDraw.Draw(im).text((-b[0],-b[1]),text,font=font,fill=fill); return im
def set_alpha(im,a):
    arr=np.asarray(im).copy(); arr[:,:,3]=(arr[:,:,3]*a).astype(np.uint8); return Image.fromarray(arr,"RGBA")
def ease(t): return t*t*(3-2*t)  # smoothstep
def clamp01(x): return max(0.0,min(1.0,x))

RETRO=txt_png("RETROSPECTIVA",Ft(42,"sb"),(236,240,248,255),track=16)
N2026=txt_png("2026",Ft(84,"eb"),TURQ+(255,))

def render(frames_dir, dur, mode, phrase_lines=None):
    os.makedirs(frames_dir,exist_ok=True); N=int(dur*FPS)
    for i in range(N):
        t=i/FPS; fr=BG.copy()
        gp=0.72+0.12*math.sin(t*1.6)   # glow pulse
        fr.alpha_composite(glow_at(clamp01(gp)))
        if mode in ("intro","outro"):
            sc=0.84+0.16*ease(clamp01(t/1.2)); la=ease(clamp01(t/1.0))
            lw=int(470*sc); lg=LG.resize((lw,int(LG.height*lw/LG.width)),Image.LANCZOS)
            # bloco centralizado: RETRO(intro) + logo + 2026
            gap1=64 if mode=="intro" else 0; retH=RETRO.height if mode=="intro" else 0
            total=(retH+gap1 if mode=="intro" else 0)+lg.height+16+N2026.height
            y=H//2-total//2
            if mode=="intro":
                ra=ease(clamp01((t-0.7)/0.9)); fr.alpha_composite(set_alpha(RETRO,ra*la),(W//2-RETRO.width//2,y)); y+=retH+gap1
            fr.alpha_composite(set_alpha(lg,la),(W//2-lg.width//2,y)); y+=lg.height+16
            na=ease(clamp01((t-(1.2 if mode=="intro" else 0.8))/0.9)); fr.alpha_composite(set_alpha(N2026,na),(W//2-N2026.width//2,y))
            if mode=="outro" and t>dur-0.5:
                fo=clamp01((dur-t)/0.5); fr=Image.alpha_composite(BG.copy(),set_alpha(fr,fo)) if False else fr
        if mode=="phrase":
            f=Ft(58,"sb"); lh=f.getbbox("Ag")[3]+26; total=lh*len(phrase_lines); y0=H//2-total//2
            pa=ease(clamp01((t-0.2)/1.1)); slide=int((1-pa)*40)
            if t>dur-0.4: pa*=clamp01((dur-t)/0.4)
            for k,ln in enumerate(phrase_lines):
                tp=txt_png(ln,f,(240,245,250,255)); fr.alpha_composite(set_alpha(tp,pa),(W//2-tp.width//2,y0+k*lh+slide))
        fr.convert("RGB").save(os.path.join(frames_dir,f"f_{i:04d}.png"))
    return N

render("anim_intro",4.5,"intro")
render("anim_outro",4.5,"outro")
render("anim_phrase",4.2,"phrase",phrase_lines=["2026 foi feito de conexões","que viraram histórias."])
print("frames ok")

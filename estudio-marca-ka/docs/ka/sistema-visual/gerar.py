# -*- coding: utf-8 -*-
"""
Gerador dos cards KA (carrossel) — PORTÁTIL e FIEL ao app.

Reproduz os 7 templates da KA exatamente como `src/templates/ka/KaCards.tsx` +
`ka.css`: mesmas medidas, mesma paleta (cores.ts), mesmo contraste YIQ e a mesma
regra de destaque (aspas/asteriscos → negrito peso 900 na MESMA cor do texto).

USO:
    python3 gerar.py exemplo.json      # gera html/ + manifest.json
    node render.js                     # gera out/*.png (1080×1350 @2x)

Cada slide do JSON tem { "tipo": "...", ...campos }. Ver SISTEMA-VISUAL-KA.md.

As fontes (Playfair/Montserrat/Outfit variáveis) e os logos são lidos direto de
public/clientes/ka/ do próprio repo e embutidos no HTML — o resultado é
self-contained e renderiza em qualquer navegador headless, sem servidor.
"""
import os, re, sys, json, html, base64

BASE = os.path.dirname(os.path.abspath(__file__))
# Assets reais do app (fonte de verdade). Caminho relativo a docs/ka/sistema-visual/.
ASSETS = os.path.normpath(os.path.join(BASE, '..', '..', '..', 'public', 'clientes', 'ka'))

def _b64_font(nome):
    with open(os.path.join(ASSETS, 'fonts', nome), 'rb') as f:
        return base64.b64encode(f.read()).decode()

def _b64_img(nome):
    with open(os.path.join(ASSETS, nome), 'rb') as f:
        return 'data:image/png;base64,' + base64.b64encode(f.read()).decode()

PLAY   = _b64_font('playfair-var.woff2')
PLAY_I = _b64_font('playfair-var-italic.woff2')
MONT   = _b64_font('montserrat-var.woff2')
OUT    = _b64_font('outfit-var.woff2')
KA_BRANCO = _b64_img('ka-branco.png')
KA_PRETO  = _b64_img('ka-preto.png')

# ---- Paleta oficial (espelha cores.ts) ----------------------------------------
FUNDOS = {
    'cream': '#E7E0CD', 'bege-quente': '#C2AA8A', 'cobre': '#8B5A2B',
    'caramelo': '#C47830', 'essencia': '#3D6B7E', 'marinho': '#152535',
    'papel': '#F8F7F2', 'bege-leve': '#F7F3EA', 'bege-papel': '#E8E4DB',
    'dourado-claro': '#D4C49E', 'mostarda': '#E0B880', 'dourado': '#B89B6A',
    'preto': '#0F1923',
}
ALIAS = {'bege': 'papel', 'laranja': 'caramelo'}
COR_CARAMELO='#C47830'; COR_MOSTARDA='#E0B880'; COR_MARINHO='#152535'
COR_CLARO='#F4F1EB'; COR_PAPEL='#F8F7F2'

def hex_fundo(v):
    return FUNDOS.get(ALIAS.get(v, v), COR_PAPEL)

def yiq(hx):
    h = hx.lstrip('#'); r,g,b = int(h[0:2],16), int(h[2:4],16), int(h[4:6],16)
    return (r*299 + g*587 + b*114) / 1000

def fundo_escuro(v): return yiq(hex_fundo(v)) < 150
def cor_texto(v): return COR_CLARO if fundo_escuro(v) else COR_MARINHO

def cor_fonte(cf, fundo):
    v = str(cf or 'auto')
    return cor_texto(fundo) if v == 'auto' else hex_fundo(v)

def cor_destaque(fundo):
    yf = yiq(hex_fundo(fundo))
    if abs(yf - yiq(COR_CARAMELO)) >= 60: return COR_CARAMELO
    return COR_MOSTARDA if yf < 128 else COR_MARINHO

# ---- Destaque: aspas/asteriscos → <strong> (peso 900, MESMA cor) --------------
RE_DESTAQUE = re.compile(r'“([^”]+)”|"([^"]+)"|\*([^*]+)\*')
def com_destaque(texto):
    esc = lambda s: html.escape(s)
    out = []; ultimo = 0
    for m in RE_DESTAQUE.finditer(texto):
        if m.start() > ultimo: out.append(esc(texto[ultimo:m.start()]))
        alvo = m.group(1) or m.group(2) or m.group(3)
        out.append(f'<strong class="ka-destaque">{esc(alvo)}</strong>')
        ultimo = m.end()
    if ultimo < len(texto): out.append(esc(texto[ultimo:]))
    return ''.join(out).replace('\n', '<br>')

# ---- CSS: subconjunto FIEL de ka.css ------------------------------------------
CSS = '''
@font-face{font-family:'Playfair KA';font-weight:400 900;font-style:normal;src:url(data:font/woff2;base64,__PLAY__) format('woff2');}
@font-face{font-family:'Playfair KA';font-weight:400 900;font-style:italic;src:url(data:font/woff2;base64,__PLAYI__) format('woff2');}
@font-face{font-family:'Montserrat KA';font-weight:100 900;font-style:normal;src:url(data:font/woff2;base64,__MONT__) format('woff2');}
@font-face{font-family:'Outfit KA';font-weight:100 900;font-style:normal;src:url(data:font/woff2;base64,__OUT__) format('woff2');}
*{margin:0;padding:0;box-sizing:border-box;}
.ka-card{--serif:'Playfair KA',serif;--sans:'Montserrat KA',sans-serif;position:relative;overflow:hidden;display:flex;flex-direction:column;padding:80px;font-family:var(--sans);-webkit-font-smoothing:antialiased;}
.ka-card .ka-header,.ka-card .ka-miolo,.ka-card .ka-footer{position:relative;z-index:1;}
.ka-card .ka-header{flex:0 0 auto;align-self:center;text-align:center;white-space:nowrap;font-size:21px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;line-height:1.5;}
.ka-card .ka-header strong{font-weight:800;}
.ka-card .ka-footer{flex:0 0 auto;text-align:center;font-size:26px;font-weight:600;letter-spacing:.4em;text-indent:.4em;text-transform:uppercase;opacity:.58;}
.ka-card .ka-miolo{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;width:100%;overflow:hidden;}
.ka-card strong.ka-destaque{font-weight:900;font-style:normal;}
/* 1 Capa */
.ka-capa .titulo{font-family:var(--serif);font-size:106px;font-weight:600;line-height:1.18;white-space:pre-line;max-width:100%;overflow-wrap:break-word;}
/* 2 Texto */
.ka-texto .titulo{font-family:var(--serif);font-size:76px;font-weight:600;line-height:1.2;margin-bottom:48px;white-space:pre-line;max-width:90%;}
.ka-texto .corpo,.ka-passo .corpo,.ka-midia .texto,.ka-comentario .texto{font-size:53px;font-weight:500;line-height:1.5;white-space:pre-line;max-width:90%;overflow-wrap:break-word;}
/* 3 Passo */
.ka-passo .numero{font-family:var(--serif);font-size:200px;font-weight:700;line-height:1;margin-bottom:40px;}
/* 4 Midia */
.ka-midia .ka-miolo{gap:56px;}
.ka-midia .midia-frame{flex:0 0 auto;overflow:hidden;border-radius:18px;background:rgba(0,0,0,.12);position:relative;}
.ka-midia .midia-frame img{width:100%;height:100%;display:block;object-fit:cover;}
.ka-midia .midia-ph{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:32px;opacity:.65;}
.ka-midia .midia-ph .dim{font-size:22px;opacity:.8;}
.ka-midia.vertical .ka-miolo{flex-direction:row;align-items:center;justify-content:center;text-align:left;gap:64px;}
.ka-midia.vertical .texto{flex:1 1 0;min-width:0;max-width:none;}
/* 5 Comentario */
.ka-comentario .ka-miolo{gap:64px;}
.ka-comentario .box{width:92%;background:#fff;color:#152535;border-radius:24px;padding:56px 60px;text-align:left;box-shadow:0 10px 34px rgba(0,0,0,.12);}
.ka-comentario .box .usuario{font-size:40px;font-weight:700;margin-bottom:22px;}
.ka-comentario .box .fala{font-size:44px;font-weight:500;line-height:1.5;white-space:pre-line;overflow-wrap:anywhere;word-break:break-word;}
/* 6 CTA */
.ka-cta .frase{font-size:50px;font-weight:500;line-height:1.5;white-space:pre-line;max-width:86%;}
.ka-cta .produto{font-family:var(--serif);font-size:104px;font-weight:700;line-height:1.15;margin-top:56px;white-space:pre-line;max-width:92%;}
.ka-cta .botao{display:flex;align-items:center;justify-content:center;margin-top:72px;min-height:108px;padding:0 76px;border:4px solid #c47830;border-radius:999px;color:#c47830;font-size:40px;font-weight:600;letter-spacing:.06em;line-height:1;}
/* 7 Feedback */
.ka-fb{position:relative;overflow:hidden;display:flex;flex-direction:column;padding:80px 92px;font-family:'Outfit KA',sans-serif;}
.ka-fb .main{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;justify-content:center;}
.ka-fb .logo{height:74px;width:auto;object-fit:contain;align-self:flex-start;margin-bottom:32px;}
.ka-fb .rotulo{font-weight:700;font-size:56px;letter-spacing:13px;text-transform:uppercase;margin-bottom:44px;}
.ka-fb .box{background:#fff;border-radius:34px;padding:58px 60px;box-shadow:0 22px 60px rgba(0,0,0,.16);}
.ka-fb .head{display:flex;align-items:center;gap:26px;margin-bottom:30px;}
.ka-fb .av{width:92px;height:92px;border-radius:50%;background:linear-gradient(135deg,#c47830,#152535);flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:40px;}
.ka-fb .nm{font-weight:600;font-size:38px;color:#202124;line-height:1.15;}
.ka-fb .rl{font-weight:400;font-size:27px;color:#80868b;margin-top:5px;}
.ka-fb .stars{color:#fbbc04;font-size:46px;letter-spacing:7px;line-height:1;margin-bottom:26px;}
.ka-fb .depo{font-weight:400;font-size:33px;line-height:1.5;color:#5f6368;white-space:pre-line;overflow-wrap:anywhere;word-break:break-word;}
.ka-fb .footer{flex:0 0 auto;text-align:center;font-weight:500;font-size:27px;letter-spacing:.4em;text-indent:.4em;text-transform:uppercase;opacity:.58;padding-top:26px;}
'''
def css():
    return (CSS.replace('__PLAY__', PLAY).replace('__PLAYI__', PLAY_I)
               .replace('__MONT__', MONT).replace('__OUT__', OUT))

HDR = '<div class="ka-header"><strong>KA | Inteligência para Marcas</strong> · Branding · Posicionamento · IA</div>'
FTR = '<div class="ka-footer">Kelly Albert</div>'

def frame(classe, fundo, cor, miolo):
    return (f'<div class="ka-card {classe}" style="width:1080px;height:1350px;'
            f'background:{hex_fundo(fundo)};color:{cor}">{HDR}'
            f'<div class="ka-miolo">{miolo}</div>{FTR}</div>')

# ---- Renderizadores dos 7 cards -----------------------------------------------
def card_capa(s):
    fundo = s.get('cor_fundo', 'marinho'); cor = cor_fonte(s.get('cor_fonte'), fundo)
    return frame('ka-capa', fundo, cor, f'<div class="titulo">{com_destaque(s.get("titulo",""))}</div>')

def card_texto(s):
    fundo = s.get('cor_fundo', 'cream'); cor = cor_fonte(s.get('cor_fonte'), fundo)
    t = f'<div class="titulo">{com_destaque(s["titulo"])}</div>' if s.get('titulo') else ''
    c = f'<div class="corpo">{com_destaque(s["texto"])}</div>' if s.get('texto') else ''
    return frame('ka-texto', fundo, cor, t + c)

def card_passo(s):
    fundo = s.get('cor_fundo', 'cream'); cor = cor_fonte(s.get('cor_fonte'), fundo)
    dest = cor_destaque(fundo)
    n = f'<div class="numero" style="color:{dest}">{html.escape(str(s.get("numero","")))}</div>' if s.get('numero') not in (None,'') else ''
    c = f'<div class="corpo">{com_destaque(s["texto"])}</div>' if s.get('texto') else ''
    return frame('ka-passo', fundo, cor, n + c)

PROPORCOES = {'16:9': (920,517), '1:1': (680,680), '9:16': (450,800)}
def card_midia(s):
    fundo = s.get('cor_fundo', 'marinho'); cor = cor_fonte(s.get('cor_fonte'), fundo)
    prop = s.get('proporcao', '9:16'); w,h = PROPORCOES.get(prop, PROPORCOES['9:16'])
    vertical = ' vertical' if prop == '9:16' else ''
    texto = f'<div class="texto">{com_destaque(s["texto"])}</div>' if s.get('texto') else ''
    mid = s.get('midia')
    if mid:
        if not mid.startswith('data:'):
            with open(mid if os.path.isabs(mid) else os.path.join(BASE, mid), 'rb') as f:
                ext = 'png' if mid.lower().endswith('.png') else 'jpeg'
                mid = f'data:image/{ext};base64,' + base64.b64encode(f.read()).decode()
        inner = f'<img src="{mid}">'
    else:
        inner = f'<div class="midia-ph">Área de mídia · foto ou vídeo<span class="dim">{w}×{h}</span></div>'
    frame_el = f'<div class="midia-frame" style="width:{w}px;height:{h}px">{inner}</div>'
    ordem = (texto + frame_el) if prop == '9:16' else (texto + frame_el)
    return frame('ka-midia' + vertical, fundo, cor, ordem)

def card_comentario(s):
    fundo = s.get('cor_fundo', 'cream'); cor = cor_fonte(s.get('cor_fonte'), fundo)
    texto = f'<div class="texto">{com_destaque(s["texto"])}</div>' if s.get('texto') else ''
    box = (f'<div class="box"><div class="usuario">{html.escape(s.get("usuario",""))}</div>'
           f'<div class="fala">{com_destaque(s.get("fala",""))}</div></div>')
    return frame('ka-comentario', fundo, cor, texto + box)

def card_cta(s):
    fundo = s.get('cor_fundo', 'papel'); cor = cor_fonte(s.get('cor_fonte'), fundo)
    frase = f'<div class="frase">{com_destaque(s["frase"])}</div>' if s.get('frase') else ''
    prod = f'<div class="produto">{html.escape(s["produto"])}</div>' if s.get('produto') else ''
    botao = f'<div class="botao">{html.escape(s["botao"])}</div>' if s.get('botao') else ''
    return frame('ka-cta', fundo, cor, frase + prod + botao)

def card_feedback(s):
    fundo = s.get('cor_fundo', 'caramelo'); cor = cor_fonte(s.get('cor_fonte'), fundo)
    logo = KA_BRANCO if fundo_escuro(fundo) else KA_PRETO
    nome = s.get('nome', ''); inicial = (s.get('avatar') or (nome.strip()[:1] if nome else '?')).upper()
    n = int(s.get('estrelas', 5)); stars = '★' * max(0, min(5, n))
    rotulo = s.get('rotulo', 'FEEDBACK ;)')
    sub = s.get('sub', '')
    depo = com_destaque(s.get('depoimento', ''))
    # depoimento longo: permite reduzir a fonte do depoimento (padrão 33px).
    depo_style = f' style="font-size:{int(s["depo_tam"])}px"' if s.get('depo_tam') else ''
    inner = (f'<div class="main">'
             f'<img class="logo" src="{logo}">'
             f'<div class="rotulo">{html.escape(rotulo)}</div>'
             f'<div class="box"><div class="head">'
             f'<div class="av">{html.escape(inicial)}</div>'
             f'<div><div class="nm">{html.escape(nome)}</div>'
             + (f'<div class="rl">{html.escape(sub)}</div>' if sub else '') +
             f'</div></div>'
             f'<div class="stars">{stars}</div>'
             f'<div class="depo"{depo_style}>{depo}</div></div></div>'
             f'<div class="footer">Kelly Albert</div>')
    return (f'<div class="ka-fb" style="width:1080px;height:1350px;'
            f'background:{hex_fundo(fundo)};color:{cor}">{inner}</div>')

RENDER = {'capa': card_capa, 'texto': card_texto, 'passo': card_passo,
          'midia': card_midia, 'comentario': card_comentario, 'cta': card_cta,
          'feedback': card_feedback}

def pagina(inner):
    return f'<!doctype html><meta charset="utf-8"><style>{css()}</style>{inner}'

def main():
    if len(sys.argv) < 2:
        print('uso: python3 gerar.py <carrossel.json>'); sys.exit(1)
    with open(sys.argv[1], encoding='utf-8') as f:
        dados = json.load(f)
    slides = dados['slides'] if isinstance(dados, dict) else dados
    os.makedirs(os.path.join(BASE, 'html'), exist_ok=True)
    manifest = []
    for i, s in enumerate(slides, 1):
        tipo = s.get('tipo')
        if tipo not in RENDER:
            print(f'  slide {i}: tipo desconhecido "{tipo}" (pulado)'); continue
        nome = f'{i:02d}-{tipo}'
        fp = os.path.join(BASE, 'html', nome + '.html')
        with open(fp, 'w', encoding='utf-8') as f:
            f.write(pagina(RENDER[tipo](s)))
        manifest.append({'name': nome, 'html': fp,
                         'out': os.path.join(BASE, 'out', nome + '.png')})
    with open(os.path.join(BASE, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False)
    print(f'slides gerados: {len(manifest)} → html/  (agora: node render.js)')

if __name__ == '__main__':
    main()

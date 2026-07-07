# Sistema Visual de Publicações da Marca — KA · Memória do Projeto

> Este arquivo é a **fonte de verdade** do projeto. O Claude Code o lê
> automaticamente em qualquer sessão nova neste repositório. Se você (Kelly)
> abrir um chat novo, basta pedir "leia o CLAUDE.md" que a IA retoma tudo.
> **Mantenha este arquivo atualizado** ao concluir mudanças relevantes.

Última atualização do contexto: julho/2026.

---

## 1. O que é

**Sistema Visual de Publicações da Marca** (antes "Estúdio de Marca — KA") é
um app web **multi-cliente** da Kelly Albert (KA), designer de marca. Ele gera
peças para redes sociais (feed, story, carrossel, card) **na identidade visual
de cada cliente** e agora também **gerencia o negócio da KA**: fichas de
clientes, acessos, orçamentos, contratos e cobranças (Mercado Pago).

Modelo de uso pensado pela KA:

- **Painel da KA** (admin): lista todos os clientes; a KA cria/valida os
  templates de cada marca.
- **Painel do cliente**: cada cliente vê só a própria marca e faz o mínimo —
  **anexa foto + escreve texto + escolhe formato** (story/carrossel/card/reels).
  Todo o design (cores, fontes, formas, logo) já vem travado no template.

Clientes no sistema:

- **Shapes** (piloto) — objetos de decoração/luminárias.
- **KA | Inteligência para Marcas** — a marca da própria Kelly (carrosséis de
  branding/posicionamento/IA). Ver seção 4b.

---

## 2. Stack & arquitetura

- **Front:** React 18 + Vite + TypeScript + React Router v6 (SPA).
- **Export de imagem:** `html-to-image` (PNG em alta resolução, 2×) + `jszip`
  (carrossel em .zip).
- **Auth/DB:** Supabase (Auth + Postgres com RLS). Só chaves **públicas**
  (URL + anon/publishable) vão no front.
- **Hospedagem:** Netlify, conectado ao GitHub (build server-side).
- **Mobile (futuro):** Capacitor já configurado (iOS/Android).

O app independente vive em **`estudio-marca-ka/`**. (Na raiz do repo também há
um sistema de notícias em Python, separado, que não tem relação com este app.)

### Motor de templates (o coração do sistema)

Cada template é um objeto `Template` (ver `src/templates/types.ts`) com:

- `id`, `clienteSlug`, `clienteNome`, `nome`, `descricao`
- `formatos`: lista de tamanhos (post 1080×1350, story 1080×1920, card 1080×1080)
- `campos`: os controles que o cliente preenche. Tipos:
  `texto`, `textarea`, `estrelas`, `select`, `imagem`, `cor`, `forma`.
- `render`: componente React desenhado em **tamanho real** (1080px de largura).

O registro de todos os templates está em **`src/templates/registry.ts`**.
Hoje os templates vivem no código (rápido e fiel). No futuro (Fase 2) os
metadados virão da tabela `templates` do Supabase, mas a interface `Template`
continua a mesma.

`CamposEditor.tsx` renderiza os controles a partir de `campos`; `EditorPeca.tsx`
monta o editor de peça única; `Carrossel.tsx` monta o construtor de carrossel
(até 10 slides, cada um escolhe template + preenche, com reordenar e export .zip).

---

## 3. Rotas

- `/` e `/ka` → **AdminPanel** (painel da KA, público hoje — lista clientes)
- `/login` → Login (Supabase)
- `/admin` → AdminPanel protegido (admin)
- `/estudio` → Studio do cliente (protegido)
- `/ver/:slug` e `/:slug` → **DemoStudio** público por marca (ex.: `/shapes`)
- `*` → NotFound

Admin é reconhecido por e-mail (allowlist `VITE_ADMIN_EMAILS`, padrão
`kellyalbertka@gmail.com`) **ou** `papel='admin'` no banco — ver `AuthContext.tsx`.

---

## 4. A marca Shapes (assets em `public/clientes/shapes/`)

- **Fontes:** família **Montilla** completa, convertida para `woff2` em
  `fonts/montilla-{100..900}[i].woff2` (normal + itálico). Declarada em
  `src/templates/shapes/shapes.css`. O navegador só baixa o peso usado.
- **Logo:** `shapes-logo-branco.png` / `shapes-logo-preto.png`.
- **Fundo texturizado:** `fundo-shapes.jpg` (laranja).
- **Elementos oficiais** (vetores) em `elementos/`: logos (lockups),
  `simbolos-concha.svg`, `tagline.svg`, `cores-formas.svg`.

### Cores da marca — `src/templates/shapes/cores.ts`

- **Primárias:** Laranja `#FF7829`, Preto `#010101`, Branco `#FFFFFF`.
  - ⚠️ Divergência nos materiais: um cartão diz laranja `#E37037`, mas o vetor
    oficial diz `#FF7829` (adotado). Confirmar com a KA se quiser trocar.
- **Gama secundária:** "liberdade cromática" — o cliente escolhe **qualquer**
  cor no seletor; a paleta serve de sugestão. Hex secundários são aproximados
  do slide (ajustar se a KA passar os valores fechados).
- **Logo automático** (`corContraste`, limiar YIQ 160): em TODO card, o logo
  segue o fundo — fundo claro → logo preto; fundo escuro → logo branco.
- **Cor do texto manual**: todo card com texto tem um campo `cor_fonte`
  (padrão combinando com o fundo inicial); o cliente muda a cor do texto à
  vontade, independente do logo.

### As 3 formas orgânicas — `src/templates/shapes/formas.ts`

As fotos entram dentro de uma das 3 formas oficiais da Shapes, via
`clip-path: url(#id)` com `clipPathUnits="objectBoundingBox"` (coords 0–1).
Cada forma tem seu `d` (traçado EXATO extraído dos SVGs oficiais) e um `ratio`
(proporção nativa largura/altura):

- `shape-blob1` — pedra/ovo (732×817)
- `shape-blob2` — "guitar pick" (710×715)
- `shape-blob3` — gota/triângulo (693×677)

**Importante (bug já resolvido):** `objectBoundingBox` estica a forma para a
caixa da foto. Por isso a caixa é dimensionada na **proporção nativa da forma**
(`caixaContida`/`caixaFoto`) e centralizada — senão a forma distorce. Os defs
do clip-path são renderizados dentro de cada card (`ShapesClips.tsx`) para o
`html-to-image` resolver a `url(#...)` no export.

**Tamanho da foto:** `caixaFoto()` escala a caixa por um slider "Tamanho da
foto" (`foto_area`, 60–120%, padrão 92%). Acima de 100% a foto avança nas
margens. Enquadramento (posição/zoom) fica em `foto_x`, `foto_y`, `foto_zoom`
(ver `imagem.ts` → `estiloImagem`).

### Templates Shapes já prontos (`registry.ts`)

1. **shapes-feedback** — Card de Feedback (depoimento; fundo texturizado laranja
   OU cor escolhida; estrelas; card branco). Tem campo `cor_fundo` cuja 1ª
   amostra é a textura laranja (`url(...)`, padrão).
2. **shapes-produto** — Post de Produto (foto em forma + cor de fundo + texto).
3. **shapes-capa** — Capa (foto redimensionável revelando a cor de fundo +
   título + logo). Campos `cor_fundo` e `cor_fonte`; título e logo seguem a cor
   do texto. `foto_area` controla o tamanho (100% = tela cheia).
4. **shapes-frase** — Frase + foto (carrossel 03): fundo creme, texto em cima,
   foto no meio (redimensionável, moldura 76%×66%), texto embaixo. **Sem logo.**
   Itálico com `*asteriscos*`. Campos `cor_fundo`/`cor_fonte`. `areaPadrao: 100`.
4b. **shapes-grafismo** — Card com grafismo: fundo liso + espirais da concha nas
   laterais (`elementos/grafismo-esq/dir.png`, **recoloríveis** via canvas
   source-in em `GrafismoCard.tsx`) + texto cima/baixo + foto central
   (moldura 498px, redimensionável). Campos `cor_fundo`/`cor_grafismo`/`cor_fonte`.
   **Sem logo.**
5. **shapes-cores** — Diversas cores (fundo claro + foto em forma + rótulos).
6. **shapes-forma** — Forma função emoção (fundo escuro + foto + texto/concha).
   No feed/quadrado fica lado a lado; **no story empilha** (texto+concha em
   cima, foto embaixo, centralizado e maior) — ramo `formato.formato === 'story'`.
7. **shapes-cta** — CTA "acesse a loja": foto de fundo (sem blur) + **forma
   orgânica** semi-transparente (`fillOpacity` 0.82, 86% da largura, cor
   `#363E31` padrão, forma selecionável) + concha + botão bordado + chamadas.

> `foto_area` é semeado por `valoresPadrao` (companheiro `${id}_area`); um campo
> `imagem` pode definir `areaPadrao` para o tamanho inicial da foto.

---

## 4b. A marca KA (assets em `public/clientes/ka/`, código em `src/templates/ka/`)

Cliente = a própria **KA | Inteligência para Marcas**. Os templates reproduzem
o **padrão visual unificado dos carrosséis da KA** (documento "Sistema de
Carrosséis KA — Claude Code"; as 3 skills originais em Python ficam fora deste
app — aqui é a versão web dos mesmos cards).

- **Formato travado:** só Feed 4:5 (1080×1350), padding 80px, conteúdo
  centralizado. Todo card tem **cabeçalho** ("**KA | Inteligência para Marcas**
  · Branding · Posicionamento · IA", Montserrat maiúsculas, 1 linha, ~85% da
  largura, parte da marca em bold 800) e **rodapé** ("KELLY ALBERT",
  letter-spacing .4em, opacidade .58).
- **Fundos travados em 3 cores** (campo `select`, não `cor` livre — o oposto
  da liberdade cromática da Shapes): Bege `#F2EEE3`, Marinho `#152535`,
  Caramelo `#C47830`. A **cor do texto deriva do fundo** (bege→marinho,
  marinho→claro `#F4F1EB`, caramelo→papel) — ver `src/templates/ka/cores.ts`.
  Detalhe (nunca fundo): Essência `#3D6B7E`, Mostarda `#E0B880`.
- **Tipografia:** títulos Playfair Display, corpo Montserrat. Fontes
  **variáveis** auto-hospedadas (`public/clientes/ka/fonts/*-var.woff2`,
  3 arquivos, licença OFL, famílias 'Playfair KA'/'Montserrat KA' em `ka.css`)
  — o export embute as fontes sem depender do CSS cross-origin do Google.
- **Destaque:** `*asteriscos*` no texto viram `<strong>` peso 900 na cor de
  destaque (caramelo; papel sobre fundo caramelo). Nunca itálico. Sem
  travessões (—). Se a frase termina na palavra destacada, o ponto final entra
  dentro dos asteriscos.

### Templates KA (`registry.ts`) — os blocos dos carrosséis de 10 cards

1. **ka-capa** — Capa (gancho), título grande em Playfair (106px).
2. **ka-texto** — Desenvolvimento: título opcional + corpo Montserrat.
3. **ka-passo** — Passo numerado: número grande caramelo acima do texto.
4. **ka-midia** — Notícias/análises: texto + área de mídia em proporção fixa
   (16:9 e 1:1 → mídia abaixo do texto; **9:16 → texto à esquerda, mídia à
   direita**). O slider "Tamanho da foto" (`midia_area`) escala a área.
5. **ka-comentario** — Texto + box branco de comentário (@usuário + fala).
6. **ka-cta** — Card 10 (fecha TODO carrossel KA): fundo bege **travado**,
   frase + nome do produto grande + botão pill "Link na minha bio" com
   contorno caramelo.
7. **ka-feedback** — Card de Feedback (prova social, skill `card-feedback-ka`):
   review estilo Google — logo KA em PNG (branca/preta conforme o fundo,
   `ka-branco.png`/`ka-preto.png`), rótulo "FEEDBACK ;)" editável, box branco
   (radius 34) com avatar em gradiente caramelo→marinho (inicial do nome,
   sobrescrevível), nome + subtítulo, estrelas no dourado do Google `#FBBC04`
   e depoimento cinza `#5F6368`. **Fonte Outfit** (variável, auto-hospedada em
   `fonts/outfit-var.woff2`) — este card NÃO usa a moldura dos carrosséis
   (sem cabeçalho-fita; rodapé próprio em Outfit). Fundo padrão caramelo;
   medidas fiéis ao `gerar_feedback.py` da skill. Depoimento sempre REAL,
   sem data.

> Rota: `/ka` continua sendo o painel admin, então o estúdio público da KA é
> **`/ver/ka`** (a rota dinâmica `/:slug` vem depois de `/ka` no App.tsx).
> Para montar um carrossel completo: painel → cliente KA → Montar carrossel.

### Card ka-midia em VÍDEO com áudio

**✅ JÁ ESTÁ NO APP (jul/2026 — implementação unificada de duas sessões):**
o campo de mídia do `ka-midia` aceita vídeo (`aceitaVideo`; o arquivo vira
data URL em `valores[id]` e o card renderiza `<video>` quando é `data:video`;
`redimensionavel2d` dá sliders de Largura/Altura da área). Com vídeo, o
`EditorPeca` oferece 3 saídas:

1. **Baixar imagem (PNG)** — a arte normal.
2. **Baixar moldura (PNG)** — a arte com a janela do vídeo TRANSPARENTE
   (`baixarMolduraPng`, classe `.moldura-video` em `ka.css`), para montar no
   CapCut/Instagram — é o caminho do iPhone, que não grava vídeo no navegador.
3. **Baixar vídeo pronto (com áudio)** — `baixarVideoDoCard` em
   `src/lib/exportarVideo.ts`: moldura via `toPng` + vídeo desenhado no canvas
   (cantos 18px, cover) em TEMPO REAL com `MediaRecorder`, **preferindo MP4
   H.264+AAC** (fallback WebM). Áudio original via
   `AudioContext → MediaStreamDestination` (grafo criado UMA vez por elemento,
   `WeakMap` — 2º `createMediaElementSource` no mesmo elemento lança erro);
   durante a gravação `muted=false` e `loop=false` (mute silenciaria o áudio
   captado), restaurados no fim.

⚠️ O Chromium do sandbox não tem H.264 — para testar aqui, converter o vídeo
de teste para WebM/VP9; no Chrome real da KA o MP4 H.264 sai direto.

Receita manual equivalente (fallback/histórico — IA no sandbox):

1. Exportar o PNG do `ka-midia` (proporção 9:16) pelo próprio app via
   Playwright, preenchendo o campo de mídia com o 1º frame do vídeo
   (o campo é obrigatório; o frame também vira a "capa" estática).
2. Moldura 9:16 **medida** no card 1080×1350 (fator 100%): **x=550 y=271
   450×800**, border-radius 18px (16:9: 920×517; 1:1: 680×680, medir se usar).
3. ffmpeg completo: `pip install imageio-ffmpeg` (o ffmpeg do Playwright não
   tem libx264/aac). Compor: PNG base 1080×1350 em loop + vídeo `scale=450:800`
   + máscara PNG de cantos arredondados (PIL, radius 18) via `alphamerge` +
   `overlay=550:271`; áudio `aac 160k` com `apad` e `-t <duração do vídeo>`
   (atenção: áudio e vídeo da origem podem ter durações diferentes — usar a
   do stream de vídeo, não `-shortest`). `-c:v libx264 -crf 18 -pix_fmt yuv420p`.
4. Roadmap: botão "Exportar MP4" no template Mídia dentro do app.

---

## 4c. Gestão interna (clientes, orçamentos, contratos, cobranças)

> ⚠️ **BACKEND MIGRADO PARA O FIREBASE (jul/2026).** Depois de uma queda do
> Supabase, a KA optou pelo **Firebase** (plano grátis Spark). A camada de dados
> foi reescrita mantendo as MESMAS assinaturas de função, então as telas não
> mudaram. Detalhes:
>
> - **Config pública:** `src/lib/firebase.ts` (projeto `estudio-de-marcas-ka`).
>   As chaves do front (apiKey Firebase, anon do Supabase) são **públicas por
>   design** — a segurança vem das *Regras* do Firestore.
> - **`src/lib/api.ts` e `src/lib/gestao.ts`** agora usam **Firestore**
>   (coleções com os mesmos nomes das antigas tabelas). A lógica que era RPC no
>   servidor (responder orçamento → gera contrato + cobrança; gerar
>   mensalidades) roda no cliente; tokens dos links públicos são gerados no
>   navegador (`crypto.randomUUID`).
> - **Auth:** `src/context/AuthContext.tsx` usa **Firebase Auth** (login Google
>   1 clique + e-mail/senha). Perfil em `usuarios/{uid}`; convites pendentes em
>   `convites/{email}` vinculam o login à marca no 1º acesso.
> - **Regras do Firestore:** `estudio-marca-ka/firebase/firestore.rules` (modo
>   teste = tudo liberado; modo produção = só a KA + leitura pública por token).
>   Colar no Console → Firestore → Regras.
> - **Netlify:** o `netlify.toml` desliga a *detecção inteligente* do secret
>   scanner (`SECRETS_SCAN_SMART_DETECTION_ENABLED=false`), que bloqueava o build
>   confundindo as chaves públicas com segredos. Auto-publish ligado no branch
>   `estudiodemarca`.
> - **Mercado Pago:** link automático precisa de Cloud Function (plano Blaze);
>   por enquanto `gerarLinkMercadoPago` avisa para colar o link manualmente.
> - Supabase (`src/lib/supabase.ts`, `supabase/`) continua no repo como legado,
>   sem ser importado (tree-shaken do bundle).

O painel da KA tem **abas**: Estúdio (aberto) e Clientes & Acessos / Orçamentos
/ Contratos / Cobranças (**restritas** — exigem login admin, `GateAdmin.tsx`).

- **Banco:** `supabase/gestao.sql` (rodar após `schema.sql`). Tabelas:
  `orcamentos`, `contratos`, `cobrancas`, `modelos_contrato` + ficha do cliente
  (colunas novas em `clientes`: responsavel, telefone, endereço, observações,
  documento, mensalidade, dia_vencimento, cobranca_ativa, slug).
- **Fluxo do orçamento:** KA monta (itens + valores) → envia link público
  `/orcamento/:token` → cliente aprova (nome+CPF/CNPJ) → RPC
  `responder_orcamento` gera **contrato** (do modelo com {{placeholders}}) e
  **cobrança** automaticamente; recusa também é registrada.
- **Proposta no layout KA (jul/2026):** o editor de orçamento tem o bloco
  opcional "Proposta no layout KA" (campo `proposta: PropostaCampos` no
  orçamento; botão "Preencher com o modelo padrão" =
  `modeloPropostaPadrao()` em `gestao.ts`, baseado na proposta Schramm/Shape
  Design). Preenchido, o link público vira a **proposta comercial completa**
  (`PropostaDoc.tsx` + `styles/proposta.css`): capa creme com a logo
  `logo-ka.png`, ficha cliente/emissão/validade, seções numeradas em caramelo
  (objeto, escopo em 2 painéis + destaque, mensalidade com ✓, prazo, fases
  "Nome | descrição", investimento em 2 cards, aceite com próximos passos),
  rodapé com nº/cidade. `*asteriscos*` = negrito; seção vazia não aparece;
  impressão → PDF em A4 com quebras (`.prop-quebra`). Sem proposta, o link
  mostra o documento simples (tabela) de antes. Preview do modelo em dev:
  `/proposta-modelo` (rota só com `import.meta.env.DEV`). Aprovação/recusa
  continuam iguais (contrato + cobrança saem dos ITENS — preencha os itens
  mesmo usando a proposta).
- **Contrato:** modelo editável na aba Contratos; link público
  `/contrato/:token` com **aceite digital** (nome, documento, data/hora,
  user-agent). Impressão → PDF pelo navegador (CSS @media print).
- **Cobranças:** mensalidade por cliente (RPC `gerar_mensalidades`, idempotente
  por competência; botão no painel ou pg_cron) + avulsas (de orçamento ou
  manuais). Link de pagamento **Mercado Pago Checkout Pro** (cartão parcelado,
  boleto, PIX) via Edge Function `mp-criar-cobranca`; `mp-webhook` marca paga
  quando o MP aprova. Sem as functions publicadas, dá para colar link manual.
- **Acessos:** aba Clientes & Acessos convida por e-mail (Edge Function
  `convidar-usuario`, service_role só no servidor) e vincula/desvincula logins
  à marca (`usuarios.cliente_id`/`cliente_slug`).
- **Páginas públicas por token** usam RPCs `security definer`
  (`*_por_token`) — anon nunca lê tabelas direto.
- **Segredos** (só nas Edge Functions): `MP_ACCESS_TOKEN`, `APP_URL`. Setup
  completo em `supabase/functions/README.md`.
- Dev local: `?preview-gate` na URL pula o gate (só em `import.meta.env.DEV`).

---


## 5. Export de PNG: assinatura + SEO

- **Assinatura KA** (`src/lib/assinatura.ts`): todo PNG exportado recebe
  metadados **iTXt** limpos (Autor: *Kelly Albert / Estúdio de Marca — KA*,
  Copyright do cliente, Software, Source: `kellyalbert.com.br`). O canvas já
  descarta EXIF/C2PA/tags de IA da imagem original; a assinatura é proveniência
  **positiva** (crédito/Google Imagens). **Não** afeta alcance nas redes.
- **SEO** (`index.html`): title/description/author, canonical, Open Graph,
  Twitter card e schema.org `ProfessionalService` com a marca em
  `kellyalbert.com.br` (subdomínio como `sameAs`).

> Nota sobre "IA detectada pelas redes": o app **não gera imagem com IA** — é um
> compositor de design (tipo Canva). O PNG sai do canvas sem metadado de
> procedência de IA. Mesmo que o cliente suba uma imagem feita em outra IA, o
> canvas re-codifica e descarta o metadado (marca d'água invisível em pixels,
> tipo SynthID, é mais resistente, mas o recorte/redimensionamento degrada).

---

## 6. Como rodar / publicar

```bash
cd estudio-marca-ka
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc -b + vite build → dist/
npm run preview    # serve o build
```

**Deploy (Netlify):** conectado ao GitHub, base dir `estudio-marca-ka/`,
publish `dist`, Node 20, redirect SPA `/* → /index.html 200`.

> ⚠️ **O deploy automático NÃO estava disparando sozinho nesta conta.** Depois
> de cada push, é preciso ir no painel do Netlify e clicar em **Trigger deploy**
> manualmente para o site no ar atualizar. Se algo "continua errado no ar",
> quase sempre é isto.
>
> **Formas de publicar (jul/2026):** (1) sessões do Claude em ambiente com
> rede liberada publicam direto via conector Netlify (deploy api); (2) o
> workflow **`.github/workflows/publicar-app.yml`** builda `estudio-marca-ka/`
> e publica via `netlify-cli` — depende do segredo `NETLIFY_AUTH_TOKEN` do
> repositório, que em 03/07/2026 estava **vencido** (API respondia 401;
> renovar em Netlify → User settings → Applications → New access token e
> colar em GitHub → Settings → Secrets → Actions). Site id do app:
> `620d408e-bb8a-49fb-a1da-ccf602320142`.

**Variáveis de ambiente (Netlify + `.env.local`):**

| Variável | Função |
| --- | --- |
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | chave pública (anon/publishable `sb_publishable_...`) |
| `VITE_ADMIN_EMAILS` | e-mails admin (opcional; padrão kellyalbertka@gmail.com) |

**Segurança:** a chave da API Anthropic **NUNCA** vai no front — só numa Edge
Function do Supabase (Fase 6). service_role e senha do banco são **secretos**.

---

## 7. Domínio / DNS

- Marca oficial: **`kellyalbert.com.br`**.
- App publicado no subdomínio **`estudiodemarca.kellyalbert.com.br`**
  (e `/shapes` por cliente).
- DNS no **Registro.br** via **um único registro CNAME** para o Netlify.
- ⚠️ **NÃO migrar o DNS do domínio para o Netlify** — a KA tem e-mail em
  `mail.`/`webmail.kellyalbert.com.br` e isso quebraria. Só o CNAME do
  subdomínio.

---

## 8. Git / fluxo

- Branch de trabalho atual: **`claude/new-clients-system-enye24`**.
- Rodar `git` a partir da **raiz do repo** (`/home/user/SistemaKA`), não de
  dentro de `estudio-marca-ka/` (senão `pathspec did not match`).
- Push: `git push -u origin <branch>`.

---

## 9. Gotchas do ambiente sandbox (para a IA)

- **Egress:** depende do ambiente. No sandbox antigo era bloqueado; no ambiente
  remoto atual (Claude Code web) a rede sai por proxy e alcança, p.ex., o
  Google Fonts. Testar com `curl` antes de assumir. Verificação do deploy no ar
  continua com a KA.
- **Verificação visual:** instalar `playwright-core` temporariamente, subir
  `vite preview`, usar o Chromium em
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, tirar screenshot,
  e `npm uninstall playwright-core` antes de commitar.
- **Rasterizar SVG:** `pip install cairosvg` funciona no sandbox.
- **Converter fontes:** `pip install fonttools brotli` (OTF→woff2).
- `pkill` causa exit code 144 — evitar; matar processo por PID via `ss`.

---

## 10. Decisões & convenções

- Templates fiéis ao layout aprovado, desenhados em 1080px reais.
- Contraste automático em vez de cores de texto fixas (paleta livre).
- Caixa da foto sempre na proporção nativa da forma (clip não distorce).
- Comentários e UI em **português** (público é a KA e os clientes dela).
- Preferir cores/tokens da marca; primária = laranja `#FF7829`.
- **Painel interno em grade visual:** cards de cliente com capa/logo/paleta da
  marca (`src/templates/marcas.ts`) e cards de template com **miniatura ao
  vivo** (`MiniPreview.tsx` renderiza a arte real com os valores padrão e
  reduz com `transform: scale`). Estilos em `src/styles/painel.css`.

---

## 11. Pendências / roadmap

- [ ] Confirmar laranja oficial: `#FF7829` (vetor) vs `#E37037` (cartão).
- [ ] Hex fechados da gama secundária (hoje aproximados).
- [ ] `og:image` (imagem de capa para preview ao compartilhar o link).
- [x] Trazer 2º cliente → **KA** (carrosséis, ver seção 4b). Próximos clientes
      seguem o mesmo caminho: assets em `public/clientes/<slug>/`, código em
      `src/templates/<slug>/`, registro em `registry.ts` + `marcas.ts`.
- [ ] KA: validar os 7 cards no ar e ajustar medidas finas se a KA quiser
      (carrosséis vieram da spec do documento; o feedback veio da skill).
- [x] Gestão interna: clientes, acessos, orçamentos, contratos, cobranças (jul/2026).
- [ ] Painel Admin real (Fase 2): CRUD de templates via Supabase.
- [ ] Rodar `gestao.sql` no Supabase + publicar as 3 Edge Functions + webhook MP.
- [ ] E-mail automático com o boleto/link ao gerar cobrança (hoje: copiar link).
- [ ] Login/brand por cliente ligado ao banco (`cliente_slug` em `usuarios`).
- [ ] IA (Fase 6) só via Edge Function do Supabase (chave nunca no front).
- [ ] Mais formatos/templates conforme a KA validar.

---

## 12. Mapa rápido de arquivos

```
estudio-marca-ka/
├── index.html                      # SEO/OG/schema.org + fontes Google
├── netlify.toml, public/_redirects # config Netlify + SPA
├── supabase/                       # schema.sql, gestao.sql, functions/ (MP)
├── public/clientes/shapes/         # fontes, logos, fundo, elementos/
├── public/clientes/ka/             # fonts/ (Playfair/Montserrat/Outfit var.) + logos ka-branco/preto.png
└── src/
    ├── App.tsx                     # rotas
    ├── context/AuthContext.tsx     # sessão + admin por e-mail
    ├── lib/
    │   ├── exportar.ts             # baixarPng / baixarZip (assinado)
    │   ├── assinatura.ts           # metadados iTXt no PNG
    │   ├── supabase.ts, api.ts, storage.ts, database.types.ts
    │   ├── gestao.ts               # dados de orçamentos/contratos/cobranças
    ├── styles/
    │   ├── global.css              # tema base (KA)
    │   ├── painel.css              # grades do painel (clientes + templates)
    │   └── gestao.css              # abas, tabelas, fichas, páginas públicas
    ├── components/
    │   ├── BrandStudio.tsx         # estúdio por marca ("o que criar?")
    │   ├── MiniPreview.tsx         # miniatura ao vivo de template (scale)
    │   ├── EditorPeca.tsx          # editor de peça única
    │   ├── Carrossel.tsx           # construtor de carrossel (até 10 slides)
    │   ├── CamposEditor.tsx        # controles a partir de `campos`
    │   └── editor.css, carrossel.css
    ├── pages/
    │   ├── AdminPanel.tsx          # painel da KA (abas estúdio + gestão)
    │   ├── gestao/                 # GateAdmin, Clientes, Orçamentos,
    │   │                           #   Contratos, Cobranças (admin)
    │   ├── publico/                # OrcamentoPublico, ContratoPublico (token)
    │   ├── Studio.tsx              # área do cliente logado
    │   ├── DemoStudio.tsx          # rota pública por marca (/shapes)
    │   ├── Login.tsx, NotFound.tsx
    └── templates/
        ├── types.ts                # interface Template + valoresPadrao
        ├── registry.ts             # TODOS os templates
        ├── marcas.ts               # visual da marca p/ cards do painel
        ├── formas.ts               # 3 formas + caixaContida/caixaFoto
        ├── imagem.ts               # estiloImagem (posição/zoom)
        ├── shapes/
        │   ├── cores.ts            # paleta + corContraste
        │   ├── FeedbackCard.tsx, ProdutoCard.tsx, slides.tsx
        │   ├── ShapesClips.tsx     # defs do clip-path
        │   └── shapes.css
        └── ka/
            ├── cores.ts            # 3 fundos oficiais + texto/destaque derivados
            ├── KaCards.tsx         # moldura comum + 6 cards do padrão KA
            └── ka.css              # @font-face variáveis + estilos dos cards
```

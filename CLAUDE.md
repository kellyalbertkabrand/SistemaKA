# Estúdio de Marca — KA · Memória do Projeto

> Este arquivo é a **fonte de verdade** do projeto. O Claude Code o lê
> automaticamente em qualquer sessão nova neste repositório. Se você (Kelly)
> abrir um chat novo, basta pedir "leia o CLAUDE.md" que a IA retoma tudo.
> **Mantenha este arquivo atualizado** ao concluir mudanças relevantes.

Última atualização do contexto: julho/2026.

---

## 1. O que é

**Estúdio de Marca — KA** é um app web **multi-cliente** da Kelly Albert (KA),
designer de marca. Ele gera peças para redes sociais (feed, story, carrossel,
card) **na identidade visual de cada cliente**.

Modelo de uso pensado pela KA:

- **Painel da KA** (admin): lista todos os clientes; a KA cria/valida os
  templates de cada marca.
- **Painel do cliente**: cada cliente vê só a própria marca e faz o mínimo —
  **anexa foto + escreve texto + escolhe formato** (story/carrossel/card/reels).
  Todo o design (cores, fontes, formas, logo) já vem travado no template.

Cliente-piloto: **Shapes** (marca de objetos de decoração/luminárias).

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
- **Contraste automático** (`corContraste`): logo e texto viram preto/branco
  conforme a luminância do fundo (limiar YIQ 160 — laranja fica com tinta
  branca, como no card de feedback). Garante legibilidade em qualquer cor.

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
3. **shapes-capa** — Capa (foto tela cheia + título + logo).
4. **shapes-cores** — Diversas cores (fundo claro + foto em forma + rótulos).
5. **shapes-forma** — Forma função emoção (fundo escuro + foto + texto lateral).
6. **shapes-cta** — CTA (foto desfocada + forma colorida + "acesse a loja").

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

- Branch de trabalho atual: **`claude/internal-dashboard-visual-bzenia`**.
- Rodar `git` a partir da **raiz do repo** (`/home/user/SistemaKA`), não de
  dentro de `estudio-marca-ka/` (senão `pathspec did not match`).
- Push: `git push -u origin <branch>`.

---

## 9. Gotchas do ambiente sandbox (para a IA)

- **Egress bloqueado:** o sandbox não alcança netlify.app / supabase.co / DNS
  externo. Não dá para verificar deploy no ar daqui — a KA verifica.
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
- [ ] Trazer 2º cliente (mapear marca, cores, fontes, formas, templates).
- [ ] Painel Admin real (Fase 2): CRUD de clientes/templates via Supabase.
- [ ] Login/brand por cliente ligado ao banco (`cliente_slug` em `usuarios`).
- [ ] IA (Fase 6) só via Edge Function do Supabase (chave nunca no front).
- [ ] Mais formatos/templates conforme a KA validar.

---

## 12. Mapa rápido de arquivos

```
estudio-marca-ka/
├── index.html                      # SEO/OG/schema.org + fontes Google
├── netlify.toml, public/_redirects # config Netlify + SPA
├── public/clientes/shapes/         # fontes, logos, fundo, elementos/
└── src/
    ├── App.tsx                     # rotas
    ├── context/AuthContext.tsx     # sessão + admin por e-mail
    ├── lib/
    │   ├── exportar.ts             # baixarPng / baixarZip (assinado)
    │   ├── assinatura.ts           # metadados iTXt no PNG
    │   ├── supabase.ts, api.ts, storage.ts, database.types.ts
    ├── styles/
    │   ├── global.css              # tema base (KA)
    │   └── painel.css              # grades do painel (clientes + templates)
    ├── components/
    │   ├── BrandStudio.tsx         # estúdio por marca ("o que criar?")
    │   ├── MiniPreview.tsx         # miniatura ao vivo de template (scale)
    │   ├── EditorPeca.tsx          # editor de peça única
    │   ├── Carrossel.tsx           # construtor de carrossel (até 10 slides)
    │   ├── CamposEditor.tsx        # controles a partir de `campos`
    │   └── editor.css, carrossel.css
    ├── pages/
    │   ├── AdminPanel.tsx          # painel da KA (lista clientes)
    │   ├── Studio.tsx              # área do cliente logado
    │   ├── DemoStudio.tsx          # rota pública por marca (/shapes)
    │   ├── Login.tsx, NotFound.tsx
    └── templates/
        ├── types.ts                # interface Template + valoresPadrao
        ├── registry.ts             # TODOS os templates
        ├── marcas.ts               # visual da marca p/ cards do painel
        ├── formas.ts               # 3 formas + caixaContida/caixaFoto
        ├── imagem.ts               # estiloImagem (posição/zoom)
        └── shapes/
            ├── cores.ts            # paleta + corContraste
            ├── FeedbackCard.tsx, ProdutoCard.tsx, slides.tsx
            ├── ShapesClips.tsx     # defs do clip-path
            └── shapes.css
```

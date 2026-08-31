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

**Modernização transversal (jul/2026):**
- **Toast** (`src/components/Toast.tsx`, `ToastProvider` no `App.tsx`): avisos
  flutuantes (sucesso/erro/info) com `aria-live`, somem sozinhos. Usar
  `useToast().mostrar(texto, 'ok'|'erro'|'info')`. Já em uso em Projetos (copiar
  link) e Atividades; as outras telas ainda usam `.nota`/`.erro-msg` inline
  (migração incremental).
- **Abas por URL:** o `AdminPanel` guarda a aba ativa em `?aba=` (via
  `useSearchParams`) — "voltar" do navegador, atualizar a página e compartilhar
  o link agora funcionam (`ABAS_VALIDAS`/`irPara`).
- **Home = atalhos** (`aba='inicio'`, padrão sem `?aba`): a raiz mostra
  "quadradinhos" (`.grade-atalhos`/`.atalho-card`, `ATALHOS` no AdminPanel) —
  um por seção (Estúdio, Clientes, Projetos, Orçamentos, Contratos, Cobranças,
  Financeiro, Relatórios, Atividades, Cuidadoras). O Estúdio deixou de ser a
  home (virou um atalho); o menu suspenso continua igual.
- **Aba Relatórios 🔒** (`GestaoRelatorios.tsx` → `RelatorioFinanceiro.tsx`):
  aba própria (não é mais um segmento do Financeiro). Carrega clientes +
  cobranças + lançamentos e mostra o sub-toggle **Financeiro / Desempenho do
  site**. Está no grupo "Gestão do negócio" da home, no menu Gestão e em
  `ABAS_VALIDAS`/`CABECALHOS`. Home passou a 10 atalhos — o `@media
  (max-height:740px)` aperta mais (esconde o subtítulo, ícones/nomes menores)
  p/ caber no iPhone SE.
- **Acessibilidade/toque:** `:focus-visible` global (foco de teclado), alvos de
  toque ≥40px no celular, `prefers-reduced-motion` respeitado, `-webkit-tap-
  highlight-color` (ver fim de `global.css`/`gestao.css`).
- **Tabelas viram CARTÕES no celular** (≤640px): as tabelas de gestão
  (`.tabela`) reflowam em cartões via CSS — cada `<td>` precisa de
  `data-label="..."` e a 1ª célula usa `className="cel-nome"`. Acaba com o
  rolar-de-lado no iPhone. No desktop continuam tabelas normais.
- **Clicar no nome abre:** nas listas de Clientes, Contratos, Orçamentos e
  Cuidadoras o nome/título é um botão `.cel-abrir` que abre a ficha/documento
  (não precisa ir no botão "Abrir").
- **Overflow horizontal travado** em `html`/`body`/`#root` (`overflow-x: clip`)
  e o menu-gaveta do celular rola quando tem muitos itens (`overflow-y: auto`,
  não corta mais — ver `menu.css`).
- **Lixeira / exclusão reversível (jul/2026) — `src/lib/lixeira.ts` +
  `GestaoLixeira.tsx`.** Excluir NÃO apaga de vez: o doc ganha `excluido_em`
  (soft delete) e some das listas (filtro `!d.data().excluido_em` no cliente,
  para não quebrar docs antigos sem o campo). As `excluir*` de clientes,
  projetos, orçamentos, contratos, cobranças, caixa (lançamentos), cuidadoras e
  atividades chamam `moverParaLixeira(colecao, id)`. A aba **Lixeira 🗑️**
  (menu Gestão / `?aba=lixeira`, fora da home p/ manter 10 atalhos) lista tudo
  agrupado por tipo com **Restaurar** (`restaurarItem` → `excluido_em:null`) e
  **✕ apagar de vez** (`excluirDefinitivo` → `deleteDoc`), além de **Esvaziar
  lixeira** (`esvaziarLixeira`). Cuidadora vai p/ lixeira mantendo a subcoleção
  `documentos` (restaura completa). `site_metricas` não entra na lixeira (upsert
  por mês). `FONTES` em `lixeira.ts` mapeia coleção→rótulo.
- **Confirmação PRÓPRIA (`src/lib/confirmar.ts`):** `await confirmar(msg,
  { perigo?, confirmar? })` abre uma caixa DOM (mesmo estilo `.wa-overlay`/
  `.wa-box`, botão de perigo `.wa-btn--perigo`) no lugar de `window.confirm`.
  Motivo: o Safari do iPhone **suprime** o confirm nativo depois de alguns
  diálogos ("não mostrar mais") e ele passa a retornar `false` — as exclusões
  "não aconteciam". TODOS os `window.confirm` da gestão foram migrados.
- **Home = quadradinhos por categoria:** a raiz `/` (aba `inicio`, padrão do
  `AdminPanel`) mostra cartões elegantes agrupados em **Criação / Gestão do
  negócio / Pessoal** (`GRUPOS` + `IconeAtalho` SVG de linha na identidade da
  KA; estilos `.atalho-grupo`/`.grade-atalhos`/`.atalho-card` em `painel.css`).
  Clicar no **logotipo** (`SiteHeader`, agora `<Link to="/">`) volta pra home.
  A home é **compacta** (`.page--inicio`/`.home-atalhos`): os 9 atalhos cabem
  numa tela só, sem rolar (testado em iPhone SE/14/Pro Max).
- **Varredura de fluidez (jul/2026) — helpers compartilhados + diálogos nativos
  eliminados.** Auditoria profunda (navegação, CRUD, formulários/mobile,
  consistência). O que foi padronizado:
  - **`src/lib/ui.ts`** (`autoAltura` p/ textarea que cresce; `parseValorBR`
    p/ "1.500,00" → número), **`src/lib/rotulos.ts`** (`rotuloStatus(tipo,
    valor)` — status legível "Em andamento"/"Rascunho"/"Paga" em vez do enum
    cru), **`src/hooks/useCopiar.ts`** (`useCopiar()` = copiar + toast +
    fallback, no lugar das ~6 cópias de "copiar link" com feedback divergente).
  - **Todos os `window.prompt/confirm/alert` do Estúdio migrados** (o iPhone os
    suprime → "botão não faz nada"): `EditorPeca`/`Carrossel` usam `confirmar()`
    e toast; `CamposEditor` usa toast; **Cuidadora nova** cria direto e abre a
    ficha (sem prompt).
  - **Falhas silenciosas** viram toast (Atividades: excluir/toggle/editar/
    reordenar avisam quando o Firestore falha — acaba o "sumiu e voltou").
  - **Criar cliente sem duplicar** (`novoIdRef` — retentativa vira update) +
    toast; mensalidade aceita vírgula (campo texto + `parseValorBR`).
  - **Teclado certo no mobile**: telefone `type="tel"` (Clientes/Cuidadoras/
    Orçamentos). **Descrições** viram caixa que cresce (fase do projeto,
    cobrança). **Tabela de Projetos** vira cartão no celular (`data-label`/
    `cel-nome`) e o nome abre a ficha (como nas outras).
  - **Textos corrigidos** (pós-Firebase): convite não promete e-mail que não
    existe; erro do Mercado Pago não cita mais Supabase.
  - **Pendente (roadmap, itens maiores):** ordenação/paginação nas listas;
    migrar TODO `.nota`/`.erro-msg` inline restante para toast; guardas de
    clique-duplo (`ocupado`) nas ações de lista de Orçamentos/Contratos.
- **Ficha aberta na URL (jul/2026) — `src/hooks/useFichaUrl.ts`.** A ficha/
  detalhe/editor aberto agora vive na URL (`?aba=<x>&id=<uuid>`, ou `id=novo`;
  Contratos usa `id=modelo`; o Estúdio usa `?aba=estudio&marca=<slug>`). Assim
  **F5 reabre a ficha**, o **"voltar" do navegador a fecha** (não sai da seção)
  e a ficha vira **link compartilhável**. `abrir()` empilha histórico, `fechar()`
  substitui. Aplicado em Clientes, Projetos, Orçamentos, Contratos, Cuidadoras e
  no Estúdio (`AdminPanel`). O `sel`/`editando`/`vendo` viram valores DERIVADOS
  do parâmetro + a lista carregada (nada de `useState` de seleção). O cross-link
  do Financeiro agora usa `?aba=clientes&id=<id>` (persistente).
- **Busca nas listas (jul/2026) — `src/components/Busca.tsx`** (`<Busca>` +
  `normalizar()` sem acento/caixa). Campo de busca por texto em Clientes,
  Cuidadoras, Orçamentos, Contratos e Cobranças (filtro no cliente; some com
  "Nenhum … encontrado" quando não acha). Estilos `.busca*` em `gestao.css`.

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
Tem **criação em lote** ("Colar textos e criar vários"): cola o texto de cada
slide separado por linha em branco, escolhe UM layout e o sistema gera todos os
slides de uma vez (`quebrarEmSlides`/`campoTextoPrincipal` em `Carrossel.tsx`);
depois ajusta cada um. Também tem Desfazer/Refazer, rascunho automático
(localStorage), duplicar slide e tela cheia (ver seções de componentes).

---

## 3. Rotas

> ⚠️ **Mudança (jul/2026, a pedido da KA):** `/ka` NÃO é mais o painel admin.
> Agora `/ka` é o **estúdio da marca KA** (gerar layouts), igual a `/shapes`.
> O painel administrativo completo fica em **`/admin`** (e na raiz `/`).

- `/` → **AdminPanel** (painel da KA, público hoje — lista clientes)
- `/admin` → **AdminPanel** completo/protegido (admin) — é o hub de gestão
- `/ka` → **DemoStudio** da marca KA (cai na rota dinâmica `/:slug`)
- `/login` → Login (Supabase)
- `/estudio` → Studio do cliente (protegido)
- `/ver/:slug` e `/:slug` → **DemoStudio** público por marca (ex.: `/shapes`, `/ka`)
- `*` → NotFound

Todas as URLs (admin → aba Estúdio, `/ka`, `/shapes`) montam os layouts a
partir do **mesmo `registry.ts`** — fonte única. Mudou um layout, muda em todas
as URLs no próximo deploy (não há cópia separada nem versão "desatualizada"; o
que parece velho no ar é cache do navegador/celular — forçar recarregar).

Admin é reconhecido por e-mail (allowlist `VITE_ADMIN_EMAILS`, padrão
`kellyalbertka@gmail.com`) **ou** `papel='admin'` no banco — ver `AuthContext.tsx`.

> **URLs LIMPAS (jul/2026):** cada seção do painel tem caminho próprio
> (`/clientes`, `/projetos`, `/orcamentos`, `/contratos`, `/cobrancas`,
> `/financeiro`, `/relatorios`, `/atividades`, `/cuidadoras`, `/lixeira`,
> `/estudio`) em vez de `?aba=`. `App.tsx` registra essas rotas (todas → o mesmo
> `AdminPanel`, antes da rota dinâmica `/:slug`), e o `AdminPanel` lê a seção do
> **caminho** (`useLocation`), navegando com `useNavigate`. A **ficha** aberta
> continua em query (`/clientes?id=<uuid>`, `useFichaUrl`), e o Estúdio usa
> `/estudio?marca=<slug>`. Links antigos `?aba=` são **redirecionados** (replace)
> para o caminho limpo. A antiga área do cliente logado saiu de `/estudio` para
> **`/area-cliente`** (libera `/estudio` para a aba). SPA no Netlify já cobre
> (`/* → /index.html 200`), então recarregar `/clientes` funciona.

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

### As formas — `src/templates/shapes/formas.ts`

As fotos entram dentro de uma das formas da Shapes, via `clip-path: url(#id)`
com `clipPathUnits="objectBoundingBox"` (coords 0–1). Cada forma tem seu `d`
(traçado EXATO extraído dos SVGs oficiais) e um `ratio` (proporção nativa
largura/altura):

- `shape-blob1` — pedra/ovo (732×817)
- `shape-blob2` — "guitar pick" (710×715)
- `shape-blob3` — gota/triângulo (693×677)
- `shape-quadrado` — quadrada (cantos levemente arredondados; ratio 1), opção
  reta a pedido da KA (jul/2026), além das 3 orgânicas.

**Importante (bug já resolvido):** `objectBoundingBox` estica a forma para a
caixa da foto. Por isso a caixa é dimensionada na **proporção nativa da forma**
(`caixaContida`/`caixaFoto`) e centralizada — senão a forma distorce. Os defs
do clip-path são renderizados dentro de cada card (`ShapesClips.tsx`) para o
`html-to-image` resolver a `url(#...)` no export.

**Bug do iPhone (jul/2026 — RESOLVIDO):** vários cards na mesma página (galeria
de miniaturas, carrossel) repetiam os mesmos ids `shape-blob1/2/3`. O Chrome
tolera ids duplicados, mas o **Safari (iPhone) não resolve** e a foto saía
QUADRADA em vez de na forma orgânica. Agora cada card gera um `uid` único
(`useId` sanitizado) e os ids viram `shape-blob1-<uid>` etc. — `ShapesClips`
recebe `uid` e os cards referenciam `url(#${forma}-${uid})` (ProdutoCard,
ShapesCoresCard, ShapesFormaCard). O CTA desenha a forma inline (não usa clip).

**Tamanho da foto:** `caixaFoto()` escala a caixa por um slider "Tamanho da
foto" (`foto_area`, 60–120%, padrão 92%). Acima de 100% a foto avança nas
margens. Enquadramento (posição/zoom) fica em `foto_x`, `foto_y`, `foto_zoom`
(ver `imagem.ts` → `estiloImagem`).

### Templates Shapes já prontos (`registry.ts`)

1. **shapes-feedback** — Card de Feedback (depoimento; fundo texturizado laranja
   OU cor escolhida; estrelas; card branco). Tem campo `cor_fundo` cuja 1ª
   amostra é a textura laranja (`url(...)`, padrão).
2. **shapes-produto** — Post de Produto (foto em forma + cor de fundo + texto).
3. **shapes-capa** — Capa (foto OU **vídeo** redimensionável revelando a cor de
   fundo + título + logo). Campos `cor_fundo` e `cor_fonte`; título e logo
   seguem a cor do texto. `foto_area` controla o tamanho (100% = tela cheia).
   **Aceita vídeo** (`aceitaVideo`, jul/2026): quando é vídeo, exporta PNG,
   moldura (p/ CapCut) e MP4 com áudio (`exportarVideo.ts`). O export detecta o
   cliente pelo nó (`clienteDoNode`) e embute só a fonte necessária — Shapes =
   Montilla 500 (o peso do título/logo), para o SVG não pesar e travar o iPhone.

   > **VÍDEO EM TODOS OS CARDS COM FOTO (jul/2026):** o `aceitaVideo` foi ligado
   > em TODOS os templates da Shapes que usam foto (produto, frase, grafismo,
   > cores, forma, cta) — não só a Capa. O `exportarVideo.ts` foi generalizado
   > (`caminhoJanela`/`videoSobreposto`/`medirJanela`→`Janela{...forma}`):
   > • Cards de **vídeo-FUNDO** (capa/cta — texto/logo POR CIMA do vídeo): a
   >   moldura NÃO perfura mais a janela (era o que apagava o título/logo no
   >   MP4); o fundo do card fica transparente (`.moldura-video--sobreposto`) e o
   >   canvas pinta a cor do card atrás do vídeo. Conserta "saiu o vídeo mas sem
   >   o logo e o texto".
   > • Cards com **janela em forma orgânica** (produto/cores/forma): o recorte do
   >   vídeo e o furo da moldura seguem a forma (`Path2D`+`DOMMatrix`), lendo
   >   `data-forma` na `.foto-blob`.
   > • Cards com **janela retangular** (frase/grafismo + mídia da KA) seguem
   >   perfurando o retângulo (raio 18 na KA). `EditorPeca` detecta o vídeo de
   >   forma genérica (`data:video`/`_kind`), então os 3 botões de export
   >   aparecem em qualquer card com vídeo.
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
8. **shapes-imagem** — **Imagem inteira (tela cheia)** (`ShapesImagemCard` em
   `slides.tsx`, jul/2026): a foto/vídeo ocupa o card TODO (posição/zoom pelos
   `foto_x/foto_y/foto_zoom`, sem `foto_area`). O **texto é opcional**: vazio =
   só a imagem (ótimo p/ abrir carrossel); preenchido = aparece numa **caixa
   translúcida de cantos arredondados** (`.caixa`), posicionável em **cima/meio/
   embaixo** (`caixa_pos` → classe `pos-topo/meio/base`), com **tamanho do texto**
   (`texto_tam`, tipo `range`) e **opacidade da caixa** (`caixa_op`, 0–100 →
   `comAlpha(cor_caixa, op)`). Vídeo-fundo (é `sobreposto` no `exportarVideo.ts`,
   como capa/cta). Aceita vídeo. Vale nos 3 formatos.

> `foto_area` é semeado por `valoresPadrao` (companheiro `${id}_area`); um campo
> `imagem` pode definir `areaPadrao` para o tamanho inicial da foto.
>
> **Tipo de campo `range` (jul/2026):** slider numérico simples (`min`/`max`/
> `passo`/`padrao`) — usado no "Tamanho do texto" do **shapes-produto** (34–96,
> padrão 66; menos texto = foto maior, já que o espaço da foto é flexível) e no
> shapes-imagem. Renderizado em `CamposEditor` (`c.tipo === 'range'`).
>
> **Logo da Capa (jul/2026):** a palavra "shapes" ao lado do símbolo passou a
> seguir a **cor do LOGO** (`corLogoShapes` em `cores.ts`), não a cor do texto —
> antes o símbolo saía preto e a palavra branca ("metade preto, metade branco").

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
- **Paleta oficial da marca** (`FUNDOS_KA` em `src/templates/ka/cores.ts`,
  campo `paleta` com amostras): as 6 da marca vêm primeiro — Cream `#E7E0CD`,
  Bege Quente `#C2AA8A`, Cobre `#8B5A2B`, Caramelo `#C47830`, Azul Essência
  `#3D6B7E`, Marinho `#152535` — seguidas de extras (papel, beges, dourados,
  preto). Fundo e texto escolhem da mesma paleta; a cor do texto pode ser
  "Automático" (contraste YIQ) ou fixa. `corDestaqueKA` só é usada no número do
  card Passo (o negrito por aspas herda a cor do texto, ver seção 4b abaixo).
- **Texturas de fundo** (`src/templates/ka/texturas.ts`, campo `textura`
  `campoTexturaKA()`): padrões geométricos gerados por CSS (sem imagem) —
  Grid Quadrado, Grid Fino, Diamante, Linhas, Diagonal, Xadrez — com slider de
  **intensidade** (mais clara/escura). Renderizados em `.ka-textura` dentro do
  `KaFrame` (atrás do conteúdo, na cor do texto com alpha). Valem para os 6
  cards de carrossel (não o feedback, que não usa o KaFrame).
- **Tipografia:** títulos Playfair Display, corpo Montserrat. Fontes
  **variáveis** auto-hospedadas (`public/clientes/ka/fonts/*-var.woff2`,
  3 arquivos, licença OFL, famílias 'Playfair KA'/'Montserrat KA' em `ka.css`)
  — o export embute as fontes sem depender do CSS cross-origin do Google.
- **Destaque:** aspas (`"assim"`) e `*asteriscos*` no texto viram `<strong>`
  peso 900 **na MESMA cor do texto** (a pedido da KA, jul/2026 — o negrito NÃO
  troca a cor; se o texto é branco, o negrito é branco). Nunca itálico. Sem
  travessões (—). O número grande do card Passo continua na cor de destaque
  (`corDestaqueKA`, calculada por contraste). `comDestaque` em `KaCards.tsx`.

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
> - Supabase: o cliente JS legado (`src/lib/supabase.ts` + `src/lib/storage.ts`)
>   foi **removido** (jul/2026) — o app é 100% Firebase. A pasta `supabase/`
>   (SQL + Edge Functions) continua no repo só como referência histórica.

O painel da KA tem **abas**: Estúdio (aberto) e Clientes & Acessos / Orçamentos
/ Contratos / Cobranças (**restritas** — exigem login admin, `GateAdmin.tsx`).

- **Banco:** `supabase/gestao.sql` (rodar após `schema.sql`). Tabelas:
  `orcamentos`, `contratos`, `cobrancas`, `modelos_contrato` + ficha do cliente
  (colunas novas em `clientes`: responsavel, telefone, endereço, observações,
  documento, mensalidade, dia_vencimento, cobranca_ativa, slug).
- **Fluxo do orçamento:** KA monta (itens + valores) → envia link público
  `/orcamento/:token` → cliente aprova (nome+CPF/CNPJ) → `responderOrcamento`
  gera **só o contrato** (do modelo com {{placeholders}}); recusa registrada.
  ⚠️ **Cobrança automática DESLIGADA (KA, jul/2026):** aprovar NÃO cria mais a
  cobrança — a KA lança cada cobrança à mão (aba Cobranças). Para RELIGAR no
  futuro, ver o comentário em `responderOrcamento` (recriar a cobrança avulsa +
  gravar `cobranca_id`).
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
  - **VÁRIOS modelos de contrato (jul/2026):** a aba Contratos → **"Modelos de
    contrato"** virou um gerenciador (lista): **+ Novo modelo**, Editar, Duplicar,
    **Tornar padrão** (badge "padrão") e Excluir. `criarContratoDoModelo` aceita
    `modelo_id` (usa o escolhido; senão o padrão); `tornarModeloPadrao(id)` deixa
    só um padrão; `excluirModeloContrato` apaga de vez. No "Novo contrato" há um
    seletor **Modelo de contrato** (padrão já selecionado). Ex. de 2º modelo:
    "Gestão de sistema para arquitetura". Coleção `modelos_contrato`.
  - **Puxar dados do cliente (jul/2026):** o "Novo contrato" tem um seletor de
    **cliente** que preenche nome/documento/e-mail/telefone/razão social da ficha
    (`escolherCliente` em `NovoContrato`); `criarContratoDoModelo` aceita
    `cliente_id/cliente_email/razao_social/telefone` e preenche `{{cliente_email}}`
    /`{{razao_social}}` além dos demais; `criarContrato` grava `telefone`
    (WhatsApp). Campos continuam editáveis e podem ficar em branco p/ o cliente
    preencher ao assinar.
  - **Inteligência de CPF/CNPJ (jul/2026 — `src/lib/documento.ts`):** ao gerar,
    detecta se o documento é **CPF** (11 díg.) ou **CNPJ** (14), formata a
    máscara e escreve o rótulo certo. Placeholders novos: `{{cliente_documento}}`
    (formatado), `{{cliente_documento_tipo}}` (CPF/CNPJ), `{{cliente_documento_
    rotulado}}` ("CPF nº 123.456.789-00"), `{{contratante_nome}}` e
    `{{contratante_qualificacao}}`. Regra: **CPF** → contrato no **nome
    cadastrado**; **CNPJ** → **razão social** como CONTRATANTE + a pessoa como
    "neste ato representada por". Preenchido em `criarContratoDoModelo`,
    `responderOrcamento` e no aceite (`assinarContrato`). O modelo padrão foi
    atualizado (na coleção `modelos_contrato`) p/ usar `{{contratante_
    qualificacao}}`/`{{contratante_nome}}` — precisa do deploy do código p/
    preencher.
  - **Endereço do cliente na qualificação (jul/2026):** `qualificacaoContratante`
    aceita `endereco` opcional — CNPJ → ", com sede em {endereco}" (antes do "neste
    ato representada por"); CPF → ", com endereço em {endereco}" (NÃO diz
    "residente"/"residência", a pedido da KA — o endereço pode ser comercial). O "Novo contrato"
    tem o campo **Endereço do cliente** (puxado de `cliente.endereco` + `cidade`
    em `escolherCliente`, editável) e passa `cliente_endereco` a
    `criarContratoDoModelo`. Placeholder `{{cliente_endereco}}` também disponível.
    O modelo 02 ("Gestão de sistema para arquitetura") teve o endereço fixo da
    Schramm REMOVIDO da linha CONTRATANTE (agora vem da ficha via
    `{{contratante_qualificacao}}`).
  - **Empresa com CNPJ + representante com CPF (jul/2026):** um cliente pode ter
    DOIS documentos (o CNPJ da empresa e o CPF da pessoa). `qualificacaoContratante`
    aceita `documentoRepresentante` — no ramo CNPJ escreve "...neste ato
    representada por {nome}, inscrito(a) no CPF nº {rep}". No "Novo contrato",
    `escolherCliente` usa `acharCnpj`/`acharCpf` (`documento.ts`) p/ separar os
    dois da ficha (campos `documento`/`contrato_documento`/`fundador_cpf`): se há
    empresa (razão social e/ou CNPJ), o documento **principal** vira o CNPJ e o
    CPF vira o do representante (campo novo **"CPF do representante (se empresa)"**,
    param `cliente_documento_representante`). O **bloco de assinatura** usa
    `{{assinante_nome}}`/`{{assinante_documento_rotulado}}` = a PESSOA que assina
    (representante, ou o próprio, com o CPF) — nunca a razão social.
  - **Data automática + assinaturas bonitas (jul/2026):** `{{data}}` no contrato é
    preenchido com a data de geração **por extenso** (`formatarDataExtenso`, ex.
    "16 de julho de 2026"). O bloco de assinaturas usa o marcador **`[ASSINATURAS]`**
    no fim do modelo, uma linha por assinatura no formato `PAPEL|Nome|Documento`;
    o componente `src/components/ContratoView.tsx` (usado no público e no detalhe
    admin, no lugar do `<pre>`) desenha cada uma **centralizada, com traço maior**
    (estilos `.assinatura*` em gestao.css). Modelos SEM o marcador renderizam
    igual a antes (compatível).
  - **EDITAR o contrato (jul/2026):** botão **"✏️ Editar contrato"** na ficha e
    **"Editar"** na lista (só quando NÃO assinado/cancelado) abre um editor do
    **conteúdo** deste contrato (título + texto), salvo via `atualizarContrato`
    (não altera o modelo padrão; o token/link de assinatura continua o mesmo).
    Contrato **assinado** não é editável (preserva a validade do aceite).
  - **Assistente de IA no editor (jul/2026):** dentro do "Editar contrato" há um
    chat 🤖 (`.ia-chat`): a KA escreve um ajuste em português (ex.: "pagamento em
    3×", "cláusula de cancelamento com 30 dias") e a IA devolve o contrato
    revisado como **proposta** (prévia + "Aplicar no contrato"/"Descartar"). A
    chave da IA fica SÓ na **Netlify Function** `netlify/functions/contrato-ia.mjs`
    (env `ANTHROPIC_API_KEY`, opcional `ANTHROPIC_MODEL`, padrão `claude-sonnet-5`)
    — NUNCA no front; o front chama `/.netlify/functions/contrato-ia` com
    `{contrato, instrucao}` e recebe `{contrato, resumo}` (a função pede JSON à
    Anthropic). `netlify.toml` tem `[functions] directory=netlify/functions`.
    Sem a env configurada, a função responde um aviso amigável (o resto do app
    segue normal). Modelo de IA idêntico ao roadmap "Fase 6" (chave só no servidor).
- **Cobranças:** mensalidade por cliente (RPC `gerar_mensalidades`, idempotente
  por competência; botão no painel ou pg_cron) + avulsas (de orçamento ou
  manuais). Link de pagamento **Mercado Pago Checkout Pro** (cartão parcelado,
  boleto, PIX) via Edge Function `mp-criar-cobranca`; `mp-webhook` marca paga
  quando o MP aprova. Sem as functions publicadas, dá para colar link manual.
  - **Lançar cobrança avulsa = FORMULÁRIO** (jul/2026): o botão "+ Cobrança
    avulsa" abre um formulário inline (cliente, descrição, valor, vencimento) —
    NÃO usa mais `window.prompt` (que travava no iPhone). "Colar link" também
    virou um campo inline por linha. Feedback via toast.
  - **EDITAR cobrança** (jul/2026): botão "Editar" em cada cobrança abre o mesmo
    formulário pré-preenchido (o combinado muda — cliente paga diferente);
    `atualizarCobranca` agora aceita `descricao`/`cliente_id` além de valor/venc.
  - **FORMA de pagamento na cobrança** (jul/2026): À vista / Parcelado /
    Cobrança mensal. Em **parcelado** aparece "Em quantas vezes" + "valor de
    cada parcela"; ao salvar, o sistema cria **N cobranças** (uma por mês, a
    partir do 1º vencimento, `somarMeses`) com descrição `(k/N)`. Mensal = 1
    cobrança tipo `mensalidade`. No modo editar, parcelado transforma a atual na
    1ª parcela e cria as demais.
  - **COM NOTA × SEM NOTA (ago/2026):** a cobrança tem o campo `com_nota`
    (segmento "Sem nota / Com nota" no formulário; etiqueta no cartão). A
    escolha é **OBRIGATÓRIA** ao criar/editar: o campo nasce sem nada marcado
    (`novaComNota = null`, moldura dourada `.seg--faltando`) e salvar sem
    responder dá o aviso "Diga se esta cobrança sai COM ou SEM nota fiscal" —
    são muitas cobranças, e um padrão silencioso fazia a KA esquecer de marcar.
    Ele decide qual PIX já vem escrito na mensagem do WhatsApp: **com nota** →
    conta da EMPRESA (chave CNPJ); **sem nota** → conta PESSOAL. `pixPorNota()`
    em `src/lib/pagamento.ts` devolve as contas na ordem certa. Cobrança antiga
    (sem o campo) mantém a ordem padrão e não mostra etiqueta.
  - **CONTA DA COBRANÇA COM A VM (ago/2026) — corrigido:** `valor` é a **parte
    da KA** e `valor_vm` a **parte da VM**; o que o cliente paga é a **SOMA das
    duas**. Antes o código fazia `KA = valor − valor_vm` (uma cobrança de 600
    com 400 da VM virava "200 p/ KA + 400 p/ VM" na mensagem — errado). Por
    isso, quando a VM participa: o valor dela é **obrigatório** (não "herda o
    total"), pode ser MAIOR que o da KA (a validação antiga saiu), o rótulo do
    campo vira "Valor — parte da KA", o formulário mostra o resumo "o cliente
    paga R$ X no total" (`.cob-soma`) e o cartão da cobrança mostra
    "+ R$ Y VM · cliente paga R$ X" (`.cob-card__soma`).
  - **PIX da VM junto (ago/2026):** quando a cobrança tem `vm_participa`, o
    popup do WhatsApp ganha **duas duplas** — **"KA + VM · pessoal"** (as duas
    pessoas físicas: Kelly Albert + Gabriela Lucato Serra) e **"KA + VM ·
    empresa"** (os dois CNPJ: KA + Serena Market Ltda). A mensagem sai com o
    valor dividido — a parte da KA (`valor − valor_vm`) no PIX dela e a parte
    da VM (`valor_vm`) no PIX da VM —, cada uma com banco e favorecido. As duas
    contas andam SEMPRE juntas (nunca uma PF com uma PJ). A dupla que combina
    com a nota vem primeiro (é o texto já escrito); os chips só-da-KA (PIX
    pessoal / PIX empresa) continuam abaixo. Só os dados do PIX ficam no código
    (`PIX_PESSOAL`/`PIX_EMPRESA`/`PIX_VM_PESSOAL`/`PIX_VM_EMPRESA`) — agência,
    conta e CPF NÃO entram, porque o JavaScript do site é público.
  - **Cobranças em CARTÕES agrupados (jul/2026):** a tabela virou **cards** com
    faixa colorida por status (pendente azul, atrasada vermelha, paga verde,
    cancelada cinza), valor em destaque e ações que quebram linha (desktop e
    mobile iguais). Um seletor **"Agrupar por Mês / Cliente"** organiza a lista
    (`grupos`/`rotuloMes`/`totalEmAberto` em `GestaoCobrancas.tsx`); cada
    cabeçalho mostra a contagem + total em aberto do grupo. Quando agrupa por
    cliente, o card mostra a **data** no topo (e o nome vira o cabeçalho do
    grupo) e vice-versa. Estilos `.cob-*` em gestao.css. **EDITAR abre INLINE**
    (jul/2026): o formulário (`formCard`) é o mesmo, renderizado no TOPO ao criar
    uma nova cobrança e **logo abaixo do card** ao editar (`editandoId === c.id`,
    card em `<Fragment>` + `.cob-card--editando`). Antes abria só no topo e, no
    desktop com a lista longa, parecia que "não abria".
- **EXPORTAR o cadastro do cliente (ago/2026) — `src/lib/exportarCliente.ts` +
  `src/lib/xlsx.ts`:** na ficha do cliente há **"⤓ Baixar PDF"** (abre o cadastro
  como documento e já chama a impressão / Salvar como PDF) e **"⤓ Exportar
  cadastro"**, que mostra o mesmo documento (`CadastroExport` em
  `GestaoClientes.tsx`, estilos `.cad-*` em gestao.css) com a ficha em seções
  (Marca, Contato, Dados para o contrato, Sócios, Cobrança, Pagamentos do
  contrato, Acesso ao estúdio, Observações — seção vazia não aparece) e as 3
  saídas: **Imprimir / Salvar PDF** (`imprimirComoPdf`, `@media print` limpa a
  página), **⤓ Baixar em Excel** e **Copiar texto** (`textoDoCliente`, com
  `*negrito*` do WhatsApp). O documento reflete o que está NA TELA (inclui
  edições ainda não salvas). Na LISTA de clientes, acima dos nomes, há **"⤓
  Baixar em Excel"**, que baixa todos os cadastros filtrados pela busca
  (`clientes-AAAA-MM-DD.xlsx`) — backup e envio ao contador.
- **Download no iPhone (ago/2026) — `src/hooks/useArquivoXlsx.ts`:** o Safari do
  iPhone **ignora** um download disparado por JS depois de um `await` (perde o
  "gesto" do toque) — por isso o "Baixar em Excel" não fazia nada no celular. A
  planilha passou a ser montada ANTES do clique e o botão virou um **link de
  verdade** (`<a download href={blob}>`, estilo `a.btn--voltar`; enquanto monta,
  mostra "Preparando planilha…" com `.btn--esperando`). Vale para o botão da
  lista (refaz quando a busca filtra) e o do cadastro. Regra geral p/ o app:
  **nada de `a.click()` programático depois de `await`** — no iPhone não
  funciona.
- **Planilha .xlsx DE VERDADE (`src/lib/xlsx.ts`, ago/2026):** um `.xlsx` é um
  zip de XMLs, então o arquivo é montado com o **JSZip que o app já usa** (zero
  dependência nova): `gerarXlsx(cabecalhos, linhas, aba)` / `baixarXlsx(...)`.
  Cabeçalho em negrito e congelado, larguras automáticas, número entra como
  NÚMERO (dá pra somar) e texto como `inlineStr` escapado. Trocou o CSV, que no
  Excel dependia do separador/codificação da máquina (acento errado, tudo numa
  coluna só). Validado abrindo o arquivo com o openpyxl.
- **EDITAR orçamento:** botão "Editar" em TODOS os orçamentos (não só rascunho)
  + clicar no título abre o editor (`setEditando`).
- **EDITAR no Financeiro:** cada item do painel Financeiro é um botão que leva
  à **ficha do cliente** (`?aba=clientes&cliente=<id>`) para editar o pagamento;
  `GestaoClientes` lê o parâmetro e abre a ficha (e limpa o parâmetro).
- **Edição é só da KA:** quando o modo seguro entrar, o papel `parceiro` (VM)
  NÃO terá permissão de editar cobrança/orçamento/financeiro (decisão da KA).
- **Acessos:** aba Clientes & Acessos convida por e-mail (Edge Function
  `convidar-usuario`, service_role só no servidor) e vincula/desvincula logins
  à marca (`usuarios.cliente_id`/`cliente_slug`).
- **Páginas públicas por token** usam RPCs `security definer`
  (`*_por_token`) — anon nunca lê tabelas direto.
- **Segredos** (só nas Edge Functions): `MP_ACCESS_TOKEN`, `APP_URL`. Setup
  completo em `supabase/functions/README.md`.
- Dev local: `?preview-gate` na URL pula o gate (só em `import.meta.env.DEV`).

### Projetos (acompanhamento pelo cliente em TEMPO REAL — jul/2026)

Aba **Projetos** no painel (restrita à admin): gestão simples do andamento.

- **Modelo:** doc na coleção `projetos` com as FASES embutidas (array
  `{nome, status: pendente|andamento|concluida, concluida_em}`) — simples de
  alimentar: clicar na bolinha da fase avança o status (ciclo). Modelos de
  fases padrão em `MODELOS_FASES` (`src/lib/projetos.ts`): identidade visual,
  social media, site, personalizado. Fases podem ser adicionadas/renomeadas/
  reordenadas/removidas depois. O **nome do cliente** também é editável inline
  no detalhe ("Alterar cliente"/"Definir cliente") — útil pra criar o projeto
  antes de ter os dados e só depois trocar o nome / excluir o cadastro
  provisório (`aplicar({ cliente_nome })`).
- **Link do cliente:** `/projeto/:token` (`ProjetoPublico.tsx`) — linha do
  tempo com barra de progresso; usa **onSnapshot** (query por token), então a
  página do cliente atualiza EM TEMPO REAL quando a KA marca uma fase. Cada fase
  mostra o **responsável** (etiqueta KA/VM Rocks/nome).
- **URL LIMPA, sem código (ago/2026) — decisão da KA.** O link do cliente é
  **`/projeto/<nome-da-marca>`** (ex.: `/projeto/boba-joy`). Não há mais código
  no fim. ⚠️ A KA foi avisada do custo: quem adivinhar o nome da marca abre o
  acompanhamento (nome do cliente, etapas e andamento) — ela decidiu assim
  mesmo. Como agora é a URL que identifica o projeto, cada doc ganhou o campo
  **`slug`**:
  - `linkPublicoProjeto(p)` usa `p.slug` (cai no `token` enquanto não houver).
  - `slugLivre(rotulo, usados)` garante unicidade: `boba-joy`, `boba-joy-2`…
    (dois projetos do mesmo cliente não colidem). `criarProjeto` já grava.
  - `garantirSlugs(lista, rotuloDe)` preenche os projetos ANTIGOS na primeira
    vez que a aba Projetos abre. Só grava o que falta — **apelido existente
    nunca muda**, senão o link já enviado ao cliente quebraria.
  - O rótulo sai de `rotuloDoProjeto(p, clientes)`: **nome do cadastro**
    (`clientes.nome_marca` pelo `cliente_id`) → `p.cliente_nome` → `p.nome`.
    Por isso `recarregar()` busca projetos e clientes **juntos** (`Promise.all`)
    antes do backfill — com a lista de clientes vazia o apelido sairia com o
    nome antigo gravado no projeto (bug pego no teste).
  - **`assinarProjetoPorParametro(param, …)`** aceita os TRÊS formatos e mantém
    o tempo real (acha o doc uma vez, depois `onSnapshot` nele):
    `/projeto/boba-joy` (hoje), `/projeto/boba-joy-<token>` e `/projeto/<token>`
    (links antigos). `tokenDoParametro` continua só para o 2º caso.
  ⚠️ O nome EXIBIDO (admin e página do cliente) continua vindo de
  `p.cliente_nome`, porque a página pública não lê a coleção `clientes`. O nome do
  projeto é **editável inline** no detalhe ("Editar nome").
- **Co-assinatura KA + VM Rocks:** se o projeto tem **qualquer etapa com
  responsável VM** (`comVM = fases.some(...==='VM')`), a página do cliente
  esconde o logo da KA no cabeçalho e o rodapé vira só **"KA | Inteligência
  para Marcas | VM Rocks"** (uma linha, sem o nome do projeto) em vez do rodapé
  padrão Kelly Albert. Projeto só-KA mantém o logo e o rodapé normais.
- **Regras:** `projetos` = leitura pública (token no doc, como orçamentos),
  escrita só a KA.
- **Modelos de fases** em `MODELOS_FASES`: **Marca com Essência©** (15 etapas
  COM descrição), Identidade visual, Social media, Site, Personalizado. Cada
  fase tem `nome` + `descricao` opcional (o cliente vê a descrição sob o nome,
  no admin e na linha do tempo pública).
- **O modelo Marca com Essência© hoje (ago/2026)**, na ordem: abertura do
  contrato (**Envio de Contrato · Assinatura de Contrato · Pagamento da
  Entrada**), **Análise Estratégica de Mercado** (`opcional`), os formulários
  (**Envio e Recebimento - Formulário do Ikigai · História · Formulário
  Identidade Verbal**), **Revelação de Essência** ("Apresentação ao cliente
  (Ikigai + História)"), **Apresentação da Base Estratégica + Identidade
  Verbal**, **Apresentação da Identidade Visual** (VM), **Personalização do
  Instagram** (VM), **Personalização do WhatsApp** (VM), **Linha de Produtos e
  Serviços**, **Plano de Comunicação + Agente de IA** e **Agente de IA +
  Estúdio da Marca**. Lista conferida com a KA em 31/08/2026 — as três
  "Apresentação…" e a descrição da Revelação vieram dela. ⚠️ O **nome** e a
  **descrição** nunca carregam o número da etapa nem "KA"/"VM": a numeração é só
  visual (a lista renumera sozinha ao arrastar) e o responsável é a etiqueta
  colorida. As etapas de contrato/formulários vieram do projeto real
  da LM Sucessão & Proteção (a KA já as acompanhava na mão). Instagram e
  WhatsApp continuam separados. ⚠️ Mudar o modelo só vale para projetos NOVOS —
  os que já existem mantêm as fases deles.
- **Biblioteca de fases (reuso):** toda fase que a KA escreve (nome+descrição)
  é salva na coleção `fases_biblioteca` (`salvarFaseSalva`, id=slug do nome);
  o formulário de nova fase tem `datalist` das fases salvas e autopreenche a
  descrição. Regra: só a KA.
- **Editar fase é INLINE** (sem a janelinha do navegador — `window.prompt` é
  suprimido no iPhone): clicar no nome ou em "Editar" abre campos inline
  (nome, descrição, responsável, data) com Salvar/Cancelar (Enter/Esc). O
  formulário de **nova fase fica no TOPO** da lista.
- **Reordenar fases (jul/2026):** arrastar pela alça `⠿` (**Pointer Events**,
  `iniciarArraste`, escuta no `window` — funciona no toque do iPhone; alça agora
  é um "pill" dourado maior, fácil de pegar). O alvo do arraste é a fase de
  **centro mais próximo** do dedo (sem "zona morta" entre linhas — antes só movia
  se soltasse exatamente na linha, por isso "alguns não moviam"). O destino fica
  destacado (`.fase--alvo`, borda/anel dourado) e a fase que acabou de mudar
  **pisca em dourado** (`marcarMovido`/`.fase--movido`, animação `flashMovido`,
  ~1,3s). Mesmo padrão nas Atividades (`.ativ--movido`). Sem botões ↑/↓ (a KA
  preferiu só o arraste).

### Projetos — QUADRO por estágio (gestão de projetos, ago/2026)

A aba Projetos ganhou a camada de cima ("quantos projetos eu tenho, qual entra
primeiro, onde cada um travou") — antes só existia a lista com as fases dentro
de cada projeto. Segmento: **▦ Quadro / ☰ Lista / Pendências** (Quadro é o
padrão).

- **Estágio = coluna do quadro** (`EstagioProjeto` em `projetos.ts`, campo
  `Projeto.estagio`): **Na fila · Em andamento · Com o cliente · Em revisão ·
  Entregue** (as 5 que a KA escolheu). É diferente da FASE (a etapa do método).
  Projeto antigo, sem o campo, é encaixado por `estagioDoProjeto()`: concluído →
  Entregue; pausado ou nada começado → Na fila; resto → Em andamento. Assim o
  quadro nasce cheio, sem arrumação manual.
- **Ordem por arrasto** (`Projeto.ordem`): arrastar para cima muda quem começa
  antes; arrastar para o lado muda de coluna (`moverProjeto` +
  `definirOrdensProjetos`). Mover para Entregue grava `status:'concluido'` (some
  das pendências); sair de lá volta para `ativo`.
- **Cartão** (`.quadro-card*` — NÃO usar `.proj-card`, que já é da página
  pública do projeto): cliente, nome, **fase atual** (`faseAtual()` = 1ª etapa
  não concluída) com a etiqueta do responsável, % de progresso e a **entrega
  prevista** (`Projeto.entrega_prevista`) com chip dourado (≤7 dias) ou vermelho
  (`diasParaEntrega()` negativo = atrasado).
- **Sem limite de WIP** (a KA dispensou) e **projeto novo nasce Na fila**, no
  fim — é ela quem arrasta para a posição.
- **`src/hooks/useArrastarCartoes.ts`**: a mecânica de arrastar (segurar ~0,3s,
  travar a rolagem no toque, achar coluna/alvo pelo ponteiro) virou hook
  genérico, usado por TODAS as telas que arrastam (ver "ARRASTAR EM TODO O
  SISTEMA"). Marcadores no DOM: `[data-alca]` pega na hora, `[data-nao-arrasta]`
  não arrasta.
- **VM Rocks:** o portal `/vm-rocks` ganhou **"Fila dos projetos"** (só leitura,
  `.vm-fila*`) com os projetos em que ela participa, agrupados por estágio e na
  ordem da KA — ela se planeja pelo que vem. Continua podendo concluir/ajustar
  só as etapas dela; não move projeto de coluna nem muda prioridade (decisão da
  KA).

### Projetos — ESCOLHER AS ETAPAS AO CRIAR (ago/2026)

No "+ Novo projeto", depois do **Modelo de fases**, aparece a lista das etapas
daquele modelo com **caixinhas** (`.etapas-escolha`/`.etapa-op`): nem todo
contrato tem as 6 etapas do Marca com Essência©, então a KA desmarca o que não
entra. Detalhes:

- Todas nascem **marcadas** (o padrão é o contrato completo) e trocar de modelo
  remarca tudo (`useEffect` no `modelo`); o rótulo mostra "4 de 6" e há
  **Marcar todas / Desmarcar todas**.
- Cada linha traz número, nome, a etiqueta do responsável (KA/VM/Cliente, via
  `responsavelPadrao` quando o modelo não define) e a descrição; a desmarcada
  fica apagada. Só as marcadas viram fases do projeto.
- Modelo "Personalizado (começa vazio)" não mostra a lista.
- ⚠️ O bloco fica dentro de um `.field`, que estiliza `label` (maiúsculas) e
  `input` (largura 100%) — por isso o CSS tem overrides explícitos
  (`.field label.etapa-op` e `.field .etapa-op input[type='checkbox']`).

### Projetos — CONCLUIR O PROJETO (ago/2026)

Antes só dava para concluir arrastando o cartão até a coluna "Entregue" (ruim no
celular). Agora:

- **✓ Concluir** no cartão do quadro (aparece no hover no computador, fixo no
  toque; `data-nao-arrasta` para o toque não virar arraste) e **✓ Concluir
  projeto** no detalhe. Ambos gravam `estagio:'entregue'` + `status:'concluido'`
  (`concluirProjeto`/`concluir`), então o projeto some das pendências também.
- Se ainda houver etapas em aberto, pergunta antes ("Ainda faltam 3 etapas.
  Concluir mesmo assim?").
- **A coluna Entregue fica escondida** no quadro (como no painel de fases), com
  o checkbox **"mostrar entregues"** para trazê-la; lá o cartão mostra
  **↩ Reabrir**, que devolve o projeto para "Em andamento".

### Projetos — ETAPAS EXTRAS E OPCIONAIS AO CRIAR (ago/2026)

Além das caixinhas do modelo (acima), o "+ Novo projeto" tem:

- **Etapa `opcional`** (`ModeloFaseItem.opcional`): aparece na lista mas nasce
  **desmarcada**. É o caso da **Análise Estratégica de Mercado**, que entra
  ANTES do IKIGAI e só em parte dos contratos — a KA marca quando tem.
- **"Outras etapas deste contrato"**: campo para escrever uma etapa que não está
  no modelo (nome + descrição + responsável), com `datalist` das fases já usadas
  (`fases_biblioteca`) e autopreenchimento da descrição. As extras entram no fim
  da lista de fases e são salvas na biblioteca (`salvarFaseSalva`) para virarem
  sugestão nos próximos projetos.

### Projetos — PAINEL DE FASES (⛭ Fases, ago/2026)

A visão que a KA pediu para **controlar as fases sem abrir projeto por projeto**:
**uma coluna por PROJETO e as fases dele como cartões dentro**, na ordem do
método. Reaproveita o layout de colunas (`.ativ-quadro`/`.ativ-col`).

- **Cabeçalho da coluna:** cliente + nome do projeto (abre o projeto ao clicar),
  a etiqueta do estágio (`.est-badge`) e o contador `feitas/total`.
- **Cartão da fase** (`.fase-item`): bolinha de status + nome + etiqueta do
  responsável (KA/VM/Cliente) + data, quando houver. Fase em andamento fica
  destacada; concluída fica riscada e apagada.
- **Um toque na bolinha avança** pendente → em andamento → concluída
  (`avancarFaseDoPainel` usa `proximoStatusFase` e grava `concluida_em`), igual
  ao que já existia dentro do projeto. Responsável e data continuam no detalhe.
- **Ordem das colunas:** Em andamento → Com o cliente → Em revisão → Na fila
  (o trabalho em curso primeiro). Projetos **entregues** ficam escondidos, com o
  checkbox "mostrar entregues" para trazê-los.
- **▦ Lado a lado × ☰ Em lista (ago/2026):** um segundo segmento dentro da aba
  Fases troca o layout — *lado a lado* mantém as colunas (rola de lado) e *em
  lista* empilha um projeto embaixo do outro (`.fases-pilha`, máx. 820px), sem
  rolagem horizontal. A escolha fica no aparelho (`ka.fases.visao`, via
  `lerPref`/`gravarPref`, que saíram do `GestaoAtividades` para `src/lib/ui.ts`).
  ⚠️ Os rótulos NÃO são "Painéis/Lista" de propósito: o segmento principal da
  aba já tem "☰ Lista (n)" (a tabela de projetos) e dois "Lista" na mesma tela
  confundiriam. Arrastar etapa funciona igual nas duas visões.
- **Editar a etapa no painel (ago/2026):** tocar no **nome** abre a edição
  inline no lugar do cartão (`.fase-item__edit`): nome, descrição (o cliente vê),
  responsável e data, com Salvar/Cancelar (Enter salva, Esc fecha). Salva com
  `salvarProjeto` + `salvarFaseSalva` (vira sugestão nos próximos projetos), e a
  descrição agora aparece no cartão (`.fase-item__desc`). ⚠️ O corpo do cartão
  **não** leva `data-nao-arrasta` — senão segurar para arrastar deixaria de
  funcionar; o clique que vem ao soltar é ignorado por `acabouDeArrastar()`.
- **Esconder concluídas + apagar etapa (ago/2026):** o painel tem o checkbox
  **"esconder concluídas"** (`esconderFeitas`, guardado em
  `ka.fases.esconderFeitas`) — a lista fica só com o que falta; o contador
  `feitas/total` continua mostrando o todo. A etapa concluída não é renderizada,
  mas o **índice real** segue valendo (arrastar e apagar continuam certos).
  Cada etapa tem **✕** (`.fase-item__x`, aparece no hover no computador e fixo
  no toque) que apaga de vez, com a confirmação própria (`confirmar()`) — é para
  a etapa que foi cadastrada errada. `excluirEtapaDoPainel` grava com
  `salvarProjeto`.
- **Link do cliente + duplicar etapa (ago/2026):** cada coluna do painel abre
  com **"🔗 Copiar link do cliente"** (`.fases-col__link`, acima do nome do
  cliente) — o mesmo `copiarLink(p)` da lista, para enviar o acompanhamento sem
  abrir o projeto. E cada etapa ganhou **⧉ duplicar** ao lado do ✕
  (`duplicarEtapaDoPainel` insere a cópia logo abaixo, sempre como *pendente*),
  para as etapas que se repetem. Os dois botões vivem em `.fase-item__acoes`
  (hover no computador, fixos no toque).
- **Alça visível + "+ etapa" no painel (ago/2026):** cada etapa do painel ganhou
  a alça `⠿` (`.fase-item__alca`, pega na hora) — antes só quem descobria o
  "segurar" conseguia mover. E no fim de cada projeto há **"+ etapa"**
  (`.fase-add` → formulário `.fase-nova` com nome + responsável, `datalist` das
  fases da biblioteca): inclui a etapa no FIM daquele projeto sem abrir o
  projeto (`adicionarEtapaNoPainel` → `salvarProjeto` + `salvarFaseSalva`). O
  formulário fica aberto depois de adicionar, para lançar várias seguidas.
- **Arrastar etapa no painel (ago/2026):** segurar ~0,3s em qualquer parte do
  cartão da etapa (ou pegar na alça) e arrastar reordena as fases DAQUELE projeto
  (`arrastarEtapas` = `useArrastarCartoes`, chave `<projetoId>#<idx>`;
  `soltarFase` reordena e grava com `salvarProjeto`, atualizando a tela na hora).
  Cada projeto é uma "coluna": soltar em OUTRO projeto não move (a etapa pertence
  ao projeto dela) — avisa por toast. A bolinha de status tem `data-nao-arrasta`,
  então um toque nela continua avançando o status.

### Arrastar etapas — o MESMO gesto em todo lugar (ago/2026)

A pedido da KA ("quero arrastar pra cima e pra baixo com facilidade"), as fases
do **detalhe do projeto** também passaram a usar o hook
`src/hooks/useArrastarCartoes.ts` (o mesmo das Atividades e do Quadro), no lugar
da mecânica própria que exigia acertar a alça:

- pega **segurando ~0,3s em qualquer parte da linha** (a alça `⠿` pega na hora);
- deslizar antes disso é rolagem e cancela o arraste;
- enquanto arrasta, a rolagem trava (iPhone) e o cartão fica **dourado sólido**
  (`.fase--arrastando` / `.fase-item--arrastando`, `#f7ecd6` + borda dourada +
  sombra), com o destino marcado pela linha dourada (`.fase--alvo` /
  `.fase-item--alvo`) — estilos no FIM de `gestao.css`.
- botões de verdade (status, editar, excluir) levam `data-nao-arrasta`.

### ARRASTAR EM TODO O SISTEMA (ago/2026) — revisão completa

A pedido da KA ("em todo o sistema tem que ter a opção de arrastar; não quero
setinha pra cima e pra baixo, eu seguro com o dedo e arrasto"), TODA lista com
ordem manual passou a se arrastar, com o mesmo gesto e o mesmo visual. **As
setas ▲▼ foram removidas do sistema** (não existe mais nenhuma).

O gesto, em todo lugar: **segurar ~0,3s** em qualquer parte do item (a alça
`⠿` pega na hora) → o item fica **dourado sólido** e segue o dedo, o destino
mostra a **linha/anel dourado** → soltar reordena. Deslizar antes de pegar é
rolagem (cancela). No toque a rolagem trava enquanto arrasta. Botões e campos
de texto levam `data-nao-arrasta` (continuam funcionando com um toque).

**Dois hooks, um gesto:**
- **`src/hooks/useArrastarCartoes.ts`** — o motor. Serve para quadros com
  VÁRIAS colunas (Atividades, Quadro de projetos, painel ⛭ Fases) e listas
  únicas. O alvo passou a ser escolhido por **distância em 2D** (`Math.hypot`),
  então vale também para listas **deitadas** — a tira de slides do carrossel
  fica lado a lado no celular. Marcadores no DOM: `[data-alca]` pega na hora,
  `[data-nao-arrasta]` nunca arrasta.
- **`src/hooks/useListaArrastavel.ts`** (novo) — açúcar para o caso comum
  "uma lista em pé". `useListaArrastavel(total, aoReordenar)` devolve
  `lista()`, `item(i)` (`ref`/`onPointerDown`/`classe`/`style`), `alca()` e
  `acabouDeArrastar()`. ⚠️ `item(i)` **não** se espalha com `{...}` — `classe`
  e `style` entram à mão, junto com as classes da tela. Visual comum em
  `gestao.css`: `.arr-item`, `.arr--puxando`, `.arr--alvo`, `.arr-alca`,
  `.arr-cab`.

**Onde se arrasta hoje:**

| Tela | O que se arrasta |
| --- | --- |
| Estúdio → Montar carrossel | os **slides** da tira (as setas ▲▼ saíram; o `draggable` do HTML5, que não funcionava no toque do iPhone, saiu junto) |
| Atividades | tarefas e etapas de projeto, dentro da coluna e **entre** colunas |
| Projetos → detalhe | as fases do projeto |
| Projetos → painel ⛭ Fases | as etapas dentro de cada projeto |
| Projetos → Quadro | os cartões de projeto (ordem e coluna) |
| Projetos → + Novo projeto | as **etapas escolhidas** (modelo + extras numa lista só) |
| Orçamentos → editor | os **itens** (é a ordem que sai na proposta) |
| Ficha do cliente | **sócios** e **pagamentos do contrato** |

**Novo projeto — uma lista só (ago/2026):** as etapas do modelo e as "outras
etapas deste contrato" viraram UMA lista (`EtapaEscolha {f, on, extra}` em
`GestaoProjetos.tsx`), em vez de `marcadas: Set<number>` + `extras: []`. Assim
a etapa escrita à mão entra no fim e **pode ser arrastada** até o lugar certo
antes de criar o projeto. Clicar no texto liga/desliga a etapa (o clique que
vem depois de arrastar é ignorado); a numeração 01, 02… se refaz sozinha.

### NOME DO CLIENTE EM DESTAQUE nas fases (ago/2026)

A KA toca muitos projetos ao mesmo tempo — numa lista de etapas, o que ela
procura primeiro é **de quem** é aquela fase. Por isso o cliente saiu do cinza
discreto e virou destaque em **caramelo** (`#8a5a1f`) em TODA tela que lista
fases:

- **Painel ⛭ Fases** — o cliente encabeça a coluna, maior que antes e acima do
  nome do projeto (`.quadro-card__cliente`, com reforço em `.fases-col__cab`).
- **Quadro** e **Fila dos projetos (portal da VM)** — mesmo `.quadro-card__cliente`.
- **Pendências**, **Revisão da semana** e **Atividades** — o cliente virou uma
  etiqueta `.cliente-chip` (caramelo, maiúsculas) no lugar do "· cliente" solto
  no meio do texto cinza. Em Pendências a etiqueta **não** repete quando o
  próprio cliente é o responsável da etapa (a etiqueta de responsável já diz).
- **Portal da VM** — o grupo de atividades passou a ser encabeçado pelo
  **cliente** (`.vm-grupo__marca`), com o nome do projeto embaixo
  (`.vm-grupo__proj`); antes era o contrário.
- **Resumo da semana copiado p/ o WhatsApp** (`resumoSemanaTexto`) começa cada
  linha com o cliente em `*negrito*`.

### Projetos — REVISÃO DA SEMANA (ago/2026)

4ª visão da aba Projetos (**🗓 Semana**, ao lado de Quadro/Lista/Pendências):
o retrato de segunda-feira, calculado por `revisaoSemana(projetos, hoje)` em
`projetos.ts` (função pura — sem campo novo no banco; usa a entrega prevista do
projeto, as datas e o `concluida_em` das fases).

- **Semana = segunda a domingo** da data atual. Blocos: **⚠️ Atrasado** (entrega
  ou etapa vencida, com os dias), **📅 Vence até domingo**, **⏳ Esperando o
  cliente** (projetos na coluna "Com o cliente", com há quantos dias estão
  parados — usa `atualizado_em`), **✅ O que andou** (etapas concluídas nos
  últimos 7 dias), **▶️ Próximos da fila** (na ordem da KA) e **🕐 Em andamento
  sem entrega prevista**. Rodapé: etapas em aberto por responsável.
- 4 cards no topo com os números; clicar em qualquer linha abre o projeto.
- **Imprimir / Salvar PDF** (`imprimirComoPdf`) e **Copiar resumo**
  (`resumoSemanaTexto`, com `*negrito*` do WhatsApp) — é o texto que a KA manda
  para a VM na segunda.
- Estilos `.sem-*` em gestao.css.

### Projetos — datas, responsável (KA/VM) e pendências (jul/2026)

- **Data de início do projeto** (`Projeto.inicio`, YYYY-MM-DD, opcional):
  campo no "Novo projeto" e editável no detalhe. Aparece na hero pública.
- **Data por etapa** (`FaseProjeto.data`, opcional): data prevista/marcada de
  cada fase. Na página do cliente vira "· previsto DD/MM" nas fases não
  concluídas.
- **Tarefas do CLIENTE (cobrar) — jul/2026:** o responsável da etapa pode ser
  `'CLIENTE'` (o próprio cliente do projeto precisa fazer). `SeletorResponsavel`
  tem a opção **Cliente**; `rotuloResp('CLIENTE')='Cliente'`,
  `respClasse('CLIENTE')='CLIENTE'` (verde). Na aba **Pendências** há o chip
  **Cliente** e no detalhe do projeto um botão **"Cobrar cliente ({n})"** que
  abre o WhatsApp listando o que falta ele entregar. Em **Atividades** há a
  categoria nova **Cliente** (`CategoriaAtividade` inclui `'cliente'`;
  `Atividade.cliente_id/cliente_nome` opcionais p/ o WhatsApp): junta as
  pendências `'CLIENTE'` dos projetos + tarefas manuais do cliente, cada uma com
  botão **Cobrar** (`abrirWhatsApp`). Cores `.resp--CLIENTE`/`.cat--cliente`/
  `.ativ--cliente`/`.chip--cliente` (verde) em gestao.css.
- **Responsável por etapa** (`FaseProjeto.responsavel: string`): valores
  especiais `'KA'` (Kelly) e `'VM'` (**VM Rocks**, parceira) — usados nos
  filtros; ou o **nome do cliente** do projeto, ou **qualquer texto livre**
  ("Outro"). O `SeletorResponsavel` (em `GestaoProjetos.tsx`) oferece KA / VM
  Rocks / {cliente} / Outro (revela um campo pra escrever). `rotuloResp(v)` faz
  o texto ('VM'→"VM Rocks"); `respClasse(v)` a cor da etiqueta (KA azul, VM
  laranja, resto roxo). `responsavelPadrao(nome)` põe **visual**/**instagram**
  como VM por padrão (regex), o resto KA — sempre editável. No modelo Marca com
  Essência©, "Identidade Visual", "Personalização do Instagram" e
  "Personalização do WhatsApp" já vêm VM (Instagram e WhatsApp viraram etapas
  SEPARADAS em ago/2026 — tem contrato que fecha só um dos dois). O responsável **aparece na página do cliente** (etiqueta colorida em cada
  fase, `rotuloResp`/`respClasse` importados no `ProjetoPublico.tsx`).
- **Visão de Pendências:** no topo da aba Projetos, um segmento
  **Projetos / Pendências**. Em Pendências, `pendenciasDeProjetos(projetos,
  filtro)` junta todas as etapas em aberto (não concluídas, de projetos não
  concluídos) e o filtro por chips mostra **Todas / KA / VM Rocks** com
  contagem. Clicar numa pendência abre o projeto.

### Atividades da Kelly (painel pessoal — jul/2026)

Aba **Atividades 🔒** (restrita à admin, `GestaoAtividades.tsx`): junta as
pendências de **trabalho** (etapas da **KA** vindas dos projetos dos clientes,
via `pendenciasDeProjetos(..., 'KA')`) com tarefas que a Kelly adiciona à mão,
tudo separado em **Trabalho, BIA e Pessoal** (chips com contagem + grupos
coloridos).

- **Dados:** coleção `atividades` (`src/lib/atividades.ts`) — `{titulo,
  categoria: 'trabalho'|'bia'|'pessoal', feito, data, criado_em}`. CRUD:
  `listarAtividades`, `criarAtividade`, `alternarAtividade`, `editarAtividade`,
  `excluirAtividade`, **`duplicarAtividade`** (botão "Duplicar" em cada item).
- **Pendências de trabalho** (dos projetos) aparecem no grupo Trabalho com a
  etiqueta "projeto"; a bolinha marca a etapa como **concluída** direto (edita
  o projeto). Itens pessoais têm check (feito/não), editar inline, duplicar e
  excluir.
- **Adicionar por VOZ ou COLAR VÁRIAS** (jul/2026): o card "Nova atividade" tem
  um segmento **Uma tarefa / Colar · ditar várias**. Um botão 🎤 **Falar**
  (`BotaoMic` + hook `src/hooks/useDitado.ts`, Web Speech API pt-BR — grátis,
  funciona no Chrome e no Safari do iPhone) dita para o campo; no modo "colar
  várias", um textão (uma tarefa por linha, ou ditado — cada frase vira uma
  linha) cria todas de uma vez na categoria escolhida. Onde o navegador não
  suporta voz, o botão some e aparece uma dica.
- **Arrastar para reordenar (ago/2026 — o CARTÃO INTEIRO é a alça):** segurar
  ~0,3s em qualquer parte do cartão pega a tarefa (hoje via
  `useArrastarCartoes`); a alça `⠿` continua pegando na hora. Se o dedo desliza
  mais de 10px antes disso, é rolagem e o arraste é cancelado. Durante o
  arraste, um listener `touchmove` **não passivo** dá `preventDefault` (sem isso
  o iPhone rola junto e a tarefa escapa do dedo) e o cartão fica **dourado sólido**
  (`.ativ--arrastando`, fundo `#f7ecd6` + borda dourada + sombra) — o destino
  mostra a linha dourada (`.ativ--alvo`). O clique que vem ao soltar é ignorado
  por ~350ms (`acabouDeArrastar()`), senão abriria a edição. As **setas ▲▼ saíram** (a
  KA pediu para arrastar, não clicar). Campo `Atividade.ordem` (menor = mais em
  cima); novos itens nascem no topo (`menorOrdem-1`); `definirOrdens` grava.
- **VISÃO EM PAINÉIS OU LISTA (ago/2026) — reforma da aba:** segmento
  **▦ Painéis / ☰ Lista** (a escolha fica no `localStorage`, `ka.ativ.visao`).
  *Painéis* = uma coluna por categoria, lado a lado (`.ativ-quadro`, rola de
  lado no celular); *Lista* = as categorias empilhadas (`.ativ-pilha`). Nas
  duas, cada categoria é a mesma `coluna()` (cabeçalho + contagem + corpo).
- **Etapas de projeto TAMBÉM se movem (ago/2026):** os "Bloco 01…04" deixaram de
  ser fixos no topo — entram na mesma lista/ordem manual das tarefas. Como são
  derivadas dos projetos (não têm doc próprio), a posição delas fica no doc
  **`preferencias/ordem_atividades`** (mapa `chave → posição`, chave
  `p-<projetoId>-<faseIdx>`; `carregarOrdemPendencias`/`salvarOrdemPendencias`).
  Etapa que ainda não foi arrastada entra com ordem −1 (nasce no topo).
- **Arrastar ENTRE colunas (ago/2026):** soltar uma tarefa em outra coluna troca
  a **categoria** dela (`mudarCategoria`). Etapa de projeto não muda de coluna
  (fica na do responsável) — avisa por toast.
- **Cartão enxuto (ago/2026):** linha baixa (~36px), meta numa linha só
  (projeto · cliente · data), e as **ações flutuam à direita** (aparecem no
  hover no computador, ficam fixas no toque) — antes elas roubavam a largura e
  o título quebrava palavra por palavra. "Duplicar" foi para a caixa de edição.
- **Concluídas recolhidas (ago/2026):** cada categoria tem o bloco
  **"Concluídas (n)"** que abre/fecha (`feitasAbertas`, guardado em
  `ka.ativ.feitas`). O formulário de nova tarefa também virou um botão
  (**+ Nova tarefa**), para a tela abrir já na lista.
- **Regra Firestore:** `atividades` = só a KA (modo produção).

### Pagamentos do contrato (ficha do cliente — jul/2026)

Na ficha do cliente (`GestaoClientes.tsx` → `PagamentosContrato`), a seção
"Pagamentos do contrato" (`Cliente.pagamentos_contrato: PagamentoContrato[]`):

- Cada pagamento: **quem recebe** (cliente/KA/**VM Rocks**/outro), **forma**
  (`avista` | `parcelado` | `mensalidade`), **data** e **valor**. Em
  `parcelado` aparece "Em quantas vezes" (campo livre); o total mostra
  `Nx de R$Y = R$Z para <quem>`. `mensalidade` conta como `/mês`.
- **Resumo "A receber neste contrato"** (`.resumo-receber`): soma por quem —
  ex.: KA R$X · VM Rocks R$Y (+ R$Z/mês). É o que dá pra VM acompanhar quanto
  tem a receber (o painel financeiro só-da-VM depende do modo seguro/login).
- **Aba Financeiro 🔒 = GESTOR DE CAIXA PESSOAL da KA** (`GestaoFinanceiro.tsx`
  + `src/lib/caixa.ts` + `src/lib/financeiro.ts`, jul/2026). Junta três fontes
  num fluxo de caixa só:
  - **Cobranças PAGAS** (aba Cobranças) entram como **ENTRADAS automáticas**
    (origem `cobranca`, não editáveis aqui); **cobranças em aberto**
    (pendente/atrasada) aparecem em **"A receber"**.
  - **Entradas e saídas à mão** — coleção `caixa` (`{tipo:'entrada'|'saida',
    descricao, valor, data, escopo:'ka'|'pessoal', recebido?:boolean}`; CRUD em
    `caixa.ts`): botões **+ Entrada / − Saída** (form inline, valor aceita
    vírgula via `parseValorBR`), editar/excluir.
  - **Entrada "a receber" à mão (jul/2026):** ao lançar uma ENTRADA há o toggle
    **"Já recebi (entrou)" / "A receber"** (`recebido`). Se "a receber", a
    entrada NÃO conta em Entradas/saldo — entra em **"A receber"** (card +
    seção por mês, junto das cobranças em aberto, com etiqueta KA/Pessoal) e tem
    botão **"Recebi"** (`marcarRecebida` → `recebido:true`) que a move para
    Entradas. Serve p/ contas que a KA lança direto no caixa sem virar cobrança.
    `ehAReceberManual`/`recebTodos`/`RecebItem` em GestaoFinanceiro.
  - **Conta "a pagar" à mão (jul/2026):** simétrico ao "a receber", mas p/ SAÍDAS.
    Ao lançar uma SAÍDA há o toggle **"Já paguei (saiu)" / "A pagar"** (`pago` em
    `Lancamento`). Se "a pagar", a saída NÃO conta em Saídas/saldo — entra em
    **"Contas a pagar"** (card + seção por mês, com etiqueta KA/Pessoal e aviso de
    atrasada quando venc < hoje) e tem botão **"Pago"** (`marcarPaga` →
    `pago:true`) que a move para Saídas. Motivo: contas futuras lançadas como
    saída derrubavam o saldo antes da hora ("o saldo está errado"). Botão do form
    virou **"− Saída / conta a pagar"**. `contasPagar`/`aPagarPorMes` em
    GestaoFinanceiro. O card Saldo ganhou a linha **"previsto"** (`saldoPrevisto`
    = saldo + a receber − a pagar) quando há algo em aberto. O **relatório**
    (`RelatorioFinanceiro`) passou a contar só lançamentos REALIZADOS (entrada
    recebida, saída paga) — antes contava "a receber"/"a pagar" como realizados.
  - **REGRA ÚNICA do saldo (jul/2026 — `caixa.ts`):** o dinheiro só conta no
    caixa quando VOCÊ confirma — **entrada** só entra em Entradas/saldo com
    `recebido === true`; **saída** só entra em Saídas/saldo com `pago === true`.
    Qualquer lançamento **sem confirmação** (inclusive os ANTIGOS, sem o campo,
    ou restaurados da lixeira) fica em **"A receber" / "Contas a pagar"**, nunca
    no saldo. Conserta o bug do lançamento antigo (sem a marca) que aparecia no
    saldo como se já tivesse entrado. Predicados compartilhados
    `entradaRecebida`/`saidaPaga`/`lancamentoRealizado`/`entradaAReceber`/
    `contaAPagar` são a fonte da verdade (usados no Financeiro E nos Relatórios,
    p/ não divergir). **Padrão do form:** ENTRADA nasce "A receber" (nada entra
    no saldo sozinho); SAÍDA nasce "Já paga".
  - **Resumo em 5 cards:** Saldo em caixa (= entradas − saídas; + linha
    "previsto"), A receber, A pagar, Entradas, Saídas. Movimentações listadas por
    data (verde +, vermelho −).
  - **"Por contrato — quem tem a receber (KA/VM Rocks)"** (o antigo Financeiro,
    somando os `pagamentos_contrato`) virou um bloco `<details>` recolhível no
    fim; cada item leva à ficha do cliente (`?aba=clientes&id=`).
  - Diferença p/ a KA: **Cobranças** = o que você cobra de cada cliente
    (operacional, com vencimento/status/link); **Financeiro** = seu caixa
    (o que entrou e saiu + o que falta receber). Estilos `.fin-*`/`.mov-*`/
    `.caixa-form` em gestao.css. Regra Firestore: `caixa` = só a KA.
  - **Separação de acesso KA × VM Rocks (jul/2026):** o Financeiro tem um
    seletor **"Meu caixa" / "A receber — VM Rocks"**. A visão VM
    (`visao==='vm'`) mostra **só** as linhas `quem==='vm'` (VM Rocks) dos
    `pagamentos_contrato` — o que ela tem a receber nos clientes que atende com
    a KA — com total, lista por cliente e aviso de que ela **não vê o caixa da
    KA nem as finanças dos outros clientes**. Hoje é uma **prévia** (a KA vê/
    envia); quando o **login por papel** (parceiro) entrar, essa é exatamente a
    tela que a VM verá (o caixa `caixa` e o resto ficam fora do escopo dela).
    O `caixa` pessoal (entradas/saídas) é sempre só da KA.
  - **Cobranças AGRUPADAS POR CLIENTE no portal da VM (ago/2026):** o card
    "A Receber" lista as cobranças em blocos por cliente (`grupos` em
    `PortalVM.tsx`), com o nome da marca encabeçando em caramelo
    (`.vm-cli__nome`) e o total do cliente ao lado (`.vm-cli__total`, mais o
    quanto está atrasado). Grupos COM atraso vêm primeiro, depois por
    vencimento; dentro do grupo, as atrasadas primeiro. A linha da cobrança
    deixou de repetir o nome do cliente (o cabeçalho já diz).
  - **ATRASO em destaque no portal da VM (ago/2026):** o card "A Receber" mostra
    um aviso vermelho (`.vm-atraso`) quando há cobrança vencida — "N pagamentos
    atrasados · R$ X" — e cada linha vencida vira `.mov--atrasada` com a etiqueta
    **Atrasada** e "N dias de atraso" (`diasAtraso` local, sem UTC). As atrasadas
    são listadas PRIMEIRO. Antes o atraso era só um "· atrasada" cinza no meio da
    linha e passava batido.
  - **"A receber" da VM = só o EM ABERTO (ago/2026):** o total da visão VM (no
    Financeiro e no portal `/vm-rocks`) soma **apenas as cobranças pendentes/
    atrasadas** onde ela participa. As linhas de `pagamentos_contrato` (o
    combinado do contrato) não têm baixa de pagamento — somá-las inflava o
    total —, então saíram do número e ficam listadas embaixo, como referência.
  - **Portal da VM por LINK (só leitura) — jul/2026 (`src/lib/vm.ts` +
    `pages/publico/PortalVM.tsx`, rota LIMPA `/vm-rocks`):** enquanto o modo
    seguro (login por papel) não entra, a VM acessa por uma URL fixa e amigável
    (`estudiodemarca.kellyalbert.com.br/vm-rocks`, `CAMINHO_PORTAL_VM`). A página
    mostra **só** o que é dela: tarefas dela nos projetos
    (`pendenciasDeProjetos(...,'VM')`, **agrupadas por cliente**) + o que tem a
    receber (cobranças `vm_participa` em aberto + `pagamentos_contrato` quem=VM).
    Não mostra clientes/caixa/cuidadoras na tela. Botão **"Copiar link do portal
    da VM"** na visão VM do Financeiro. ⚠️ Como as regras do Firestore estão
    abertas (modo teste) e a URL é pública/adivinhável, a página baixa os dados
    no navegador e filtra na UI — isolamento REAL só com o modo seguro (regras +
    login). Estilos `.vm-*` em gestao.css.
  - **Robustez financeira (jul/2026 — auditoria de especialista):**
    - **`parseValorBR` determinístico** (`src/lib/ui.ts`): resolve ponto×vírgula
      pelo ÚLTIMO separador; "1.500"→1500, "1.234.567"→1234567, "1.234,56"→
      1234.56; sanitiza sinal; arredonda 2 casas (17 casos testados). Antes
      "1.500" virava R$ 1,50 (silencioso). Usado em TODOS os campos de dinheiro
      (Cobranças passou a usar ele + `inputMode="decimal"` texto no lugar de
      `type=number`, que no iPhone briga com a vírgula).
    - **Arredondamento de centavos** (`arredondar`/`somarDinheiro` em `ui.ts`):
      toda soma/agregação de dinheiro passa a arredondar (Financeiro,
      `financeiro.ts`, totalPendente) — o total exibido bate com a soma das
      linhas.
    - **Status "atrasada" DERIVADO** (`statusEfetivo` em `gestao.ts`): cobrança
      `pendente` com vencimento < hoje (LOCAL) aparece como **atrasada** (antes
      "atrasada" era enum morto). Usado no badge, no filtro e no card de risco.
    - **`pago_em` em data LOCAL** (`hojeLocal`) + **escolher a data do
      pagamento** ao "Marcar paga" (seletor inline, default hoje) — corrige o
      off-by-one do UTC que jogava um pagamento da noite para o mês seguinte.
    - **`somarMeses` com clamp de dia** (31/01 +1mês → 28/02, não 03/03).
    - **`valor_vm ≤ valor`** validado. **Filtro por status** (chips com
      contagem: Todas/Pendentes/Atrasadas/Pagas/Canceladas; atrasadas em
      vermelho) na aba Cobranças + resumo "X atrasado".
    - **Pendente (roadmap financeiro):** contas a PAGAR (despesa futura) +
      "saldo previsto"; "recebido no mês"/filtro por período no caixa;
      categorias de entrada/saída; pagamento parcial/juros; unificar fonte da
      VM (cobrança×contrato) p/ não haver risco de dupla contagem.
  - **VM na cobrança + "a receber" por mês (jul/2026):** a cobrança tem
    `vm_participa: boolean` + `valor_vm` (checkbox "VM Rocks participa" + campo
    de valor no form de Cobranças; o valor da VM pode diferir do total; vazio =
    herda o total). Cobranças em aberto com `vm_participa` entram na visão da VM
    (por valor_vm). O Financeiro mostra o **"A receber" agrupado por MÊS**
    (`agruparPorMes`/`rotuloMes` em GestaoFinanceiro), tanto no Meu caixa quanto
    na visão VM (com total por mês). Etiqueta `VM` na linha da cobrança.
  - **Mensalidades projetadas nos próximos meses (jul/2026):** uma cobrança
    `tipo='mensalidade'` em aberto agora se **repete** no "A receber por mês"
    dos próximos 12 meses (`expandirReceber`/`somarMesesISO`/`OcorReceber` em
    GestaoFinanceiro) — o mês do vencimento é REAL, os seguintes são
    **"previsto"** (linha tracejada + etiqueta). Dedupe por
    cliente+descrição+mês (o real tem prioridade sobre o previsto, evita dupla
    contagem se a mensalidade real do mês já existir). Vale no Meu caixa e na
    visão VM (por valor_vm). Avulsas/parcelas não projetam.
  - **Relatórios financeiros (jul/2026) — `RelatorioFinanceiro.tsx`:** 3ª aba do
    seletor do Financeiro ("Meu caixa / VM Rocks / **Relatórios**"). Escolhe o
    período (presets Este mês / Mês passado / Este ano + De/Até) e gera:
    resumo em 4 cards (Recebido, Saídas, Saldo do período, A receber que vence
    no período + atrasado), **KA × Pessoal**, **recebido por cliente**,
    **a receber por cliente** e a lista de **movimentações**.
    **Imprimir/Salvar PDF** (`window.print`; `@media print` esconde `.ka-top` e
    `.nao-imprimir`) e **Baixar CSV** (com BOM p/ Excel). "Recebido" = cobranças
    PAGAS com `pago_em` no período (sempre KA) + lançamentos do caixa no período
    (por escopo). Estilos `.rel-*` em gestao.css.
  - **Desempenho do site (jul/2026) — `DesempenhoSite.tsx` + `src/lib/site.ts`:**
    2º sub-toggle dos Relatórios ("Financeiro / Desempenho do site"). Dashboard
    das métricas de acesso ao site (kellyalbert.com.br): a KA **registra por
    mês** (coleção `site_metricas`, id = "YYYY-MM" → upsert) visitas,
    visitantes, páginas, leads e origem (opcional). Mostra cards do último mês
    (com % de conversão e páginas/visita), **gráfico de barras** de visitas por
    mês (`.grafico-barras`) e o **cruzamento Site × receita** (visitas × leads ×
    receita paga do mês × R$/visita). Imprimir/PDF + CSV. ⚠️ **NÃO puxa o
    tráfego sozinho** (app só front-end): os números são inseridos à mão (copia
    do analytics); automatizar (Google Analytics/Netlify/Plausible) exige
    backend/credenciais → plano Blaze. Aviso disso fica no topo do painel. Regra
    Firestore `site_metricas` = só a KA.
- **Dia do vencimento:** input de texto `inputMode="numeric"` que normaliza
  (não fica mais com "0" fixo/`025`); clampa 1–28 ao salvar.

### Segurança & Backup (decisões jul/2026 — ver `firebase/SEGURANCA-E-BACKUP.md`)

Estado atual: banco em **modo teste (aberto)** e app com `ACESSO_ABERTO=true`
(sem login). **Não é seguro pra produção** — só fecha quando a KA aprovar.
Decisões já alinhadas com a KA para quando formos ligar:

- **Papéis:** KA = `admin` (tudo). VM Rocks = `parceiro` (novo).
- **VM Rocks** enxerga só os **projetos onde participa** + o **financeiro
  desses projetos** (orçamento/contrato/cobrança); **pode ver e editar as
  fases dela**; não vê Clientes/Cuidadoras/Atividades.
- **"VM participa" = MANUAL:** campo novo `vm_participa: boolean` no projeto,
  ligado num botão pela KA (nada automático). Ao ligar, o sistema propaga uma
  marca `vm: true` nos docs financeiros do cliente (as regras do Firestore não
  cruzam coleções — por isso a marca vai em cada doc).
- **Backup:** a KA QUER ligar (backup diário + PITR 7 dias). Precisa do plano
  **Blaze** e é feito no Console (a IA não tem acesso à conta) — passo a passo
  em `firebase/SEGURANCA-E-BACKUP.md`.
- **Construção do modo seguro:** EM ESPERA (a KA pediu "por enquanto só
  entender"). Não implementar sem novo "ok".

### WhatsApp (Caminho 1 — links wa.me, jul/2026)

Botões **WhatsApp** (verdes) espalhados pela gestão: `abrirWhatsApp`
(`src/lib/whatsapp.ts`) abre um **popup próprio (DOM)** com o destinatário e o
número da ficha já preenchidos (normalizado com DDI 55) + a mensagem editável;
"Abrir WhatsApp" dispara o `wa.me` a partir do clique real (não é bloqueado).
⚠️ NÃO usar `window.prompt` — no iPhone/Safari ele é suprimido e o botão
"não faz nada". Popup estilizado em `gestao.css` (`.wa-overlay`/`.wa-box`).
O número da cobrança resolve `cliente?.telefone || c.telefone` (**`||`**, não
`??` — telefone antigo vazio deixava passar `''`). Sem telefone na ficha, o
popup mostra um aviso pedindo pra digitar / preencher em Clientes.

- **Cobranças:** mensagem com a **descrição em negrito** (`*asteriscos*` do
  WhatsApp), valor, vencimento, **bloco de PIX** e link de pagamento. O bloco de
  PIX é ESCOLHÍVEL na hora de enviar: o popup mostra os chips **PIX pessoal /
  PIX empresa** (`src/lib/pagamento.ts` — `PIX_PESSOAL`/`PIX_EMPRESA`,
  `blocoPix`), que trocam o texto na hora. Dados: Nubank · Kelly Albert · Pix por
  e-mail (pessoal) OU Pix (CNPJ) 15096943000137 — sem pontos/traço, p/ copiar e
  colar sem erro (empresa). ⚠️ A mensagem
  **nunca** escreve "pessoa física/jurídica" — é rótulo interno só nos chips.
  `abrirWhatsApp(tel, msg, dest, opcoes?)` renderiza os chips quando recebe
  `opcoes: OpcaoMensagem[]` (estilos `.wa-box__pix`/`.wa-chip` em gestao.css).
- **Orçamentos:** link público da proposta + validade.
- **Contratos:** link de assinatura (some depois de assinado).
- **Projetos** (detalhe): "Avisar no WhatsApp" — última fase concluída, fase
  atual, % e link de acompanhamento.

Envio automático de verdade (API oficial Meta) fica para quando subir ao
plano Blaze (Cloud Functions) — decisão da KA registrada: começar pelo manual.

### Cuidadoras (controle PESSOAL da KA — jul/2026)

Aba **Cuidadoras 🔒** no painel (restrita à admin): gestão das cuidadoras
(vida pessoal da KA, não é parte do negócio de design).

- **Cadastro público:** link `/cadastro-cuidadora` — a pessoa preenche a
  própria ficha (nome, CPF, RG, telefone, endereço…) e **anexa documentos**
  no próprio formulário; entra como status `pendente` + etiqueta "novo".
- **Ficha** (`GestaoCuidadoras.tsx`): dados completos, status
  (pendente/ativa/inativa), início do trabalho, observações + seção
  **Documentos** (anexar/baixar/excluir).
- **Dados de RH + PIX (jul/2026):** campos novos na `Cuidadora` — `pis`
  (PIS/NIT), `pix_chave`, `pix_banco`, `pix_tipo` (telefone/cpf/email/aleatoria).
  Vão no cadastro público E na ficha admin. **Enviar dados no WhatsApp**
  (`mensagemDadosCuidadora` + `abrirWhatsApp`): monta a mensagem com TODOS os
  dados (nome, CPF, RG, PIS, endereço, PIX…) para a KA mandar ao RH/contador; a
  KA digita o número de destino no popup. ⚠️ **wa.me não anexa arquivo** — os
  documentos vão à parte: botão **"Baixar todos"** na seção Documentos (baixa
  cada um) p/ a KA anexar na conversa à mão. A KA também pode **anexar os
  documentos ela mesma** na ficha (o "+ Anexar documento" já existente).
- **Documentos SEM Firebase Storage** (plano Spark não tem): cada arquivo vira
  data URL num doc da subcoleção `cuidadoras/{id}/documentos` (limite 1 MB por
  doc do Firestore). Imagens são comprimidas no navegador (canvas, máx 1600px,
  JPEG com qualidade decrescente até ~900 KB de data URL) em
  `src/lib/cuidadoras.ts` (`prepararArquivo`); PDFs valem até ~600 KB (senão a
  UI orienta a comprimir/fotografar). Quando subir para o Blaze, migrar para o
  Storage.
- **Regras do Firestore** (modo produção em `firebase/firestore.rules`):
  `create` público em `cuidadoras` e `cuidadoras/{id}/documentos` (para o link
  de cadastro); read/update/delete só a KA. O mesmo padrão foi aplicado a
  `clientes` (o `/cadastro` público precisava de `create`).

### Formulários do cliente (etapas do Marca com Essência© — jul/2026)

Aba **Formulários 🔒** (`/formularios`, grupo "Gestão do negócio" da home + menu
Gestão; `GestaoFormularios.tsx` + `src/lib/formularios.ts`): formulários longos
que o cliente preenche no início do projeto (etapas do **Marca com Essência©**).

- **Página organizada por ETAPAS (jul/2026):** a página mostra o **Projeto Marca
  com Essência©** como uma jornada em etapas numeradas (`ETAPAS_MARCA_ESSENCIA`
  em `formularios.ts`; `rotuloEtapa` = "Etapa 01/02/03…") — qualquer pessoa da
  equipe entende e **dispara cada etapa** pro cliente. Cada etapa é um bloco
  (`.me-etapa`): **formulário** (`EtapaFormulario` — criar link + lista de envios
  com status) ou **mensagem** (`EtapaMensagem` — só manda o texto padrão no
  WhatsApp, sem formulário). Etapas hoje: **01 IKIGAI Empresarial** (form), **02
  Sua História** (áudio no WhatsApp — `mensagemHistoria(nome?)`, com opção de
  incluir ou não o nome; assinada "Felipe – Equipe KA"), **03 Identidade Verbal**
  (form). Estilos `.me-*` em gestao.css.
- **Formulário Identidade Verbal (Etapa 03):** `IDENTIDADE_VERBAL` em
  `formularios.ts` — 10 seções (negócio, história, público, valores,
  posicionamento, tom de voz, slogan, pilares, estilo visual, concorrentes).
  Adaptado p/ servir **marca nova OU reposicionamento** (perguntas "hoje/atual"
  reescritas p/ valer nos dois casos). Intro orienta escrever "Já foi respondido"
  se já veio no IKIGAI/História.
A KA cria um formulário p/ um cliente (escolhe o tipo + cliente), copia o **link
público** e envia (WhatsApp). O cliente preenche em `/formulario/:token`
(`FormularioPublico.tsx`) **sem login**.

- **A dor resolvida:** formulário grande → **salvamento automático**. Cada
  resposta grava no Firestore (debounce ~1s) + rascunho em `localStorage`; o
  cliente **para e volta depois no mesmo link** sem perder nada, inclusive
  trocando de aparelho. Mostra **barra de progresso** ("7 de 18 respondidas"),
  status **"✓ Salvo"** e blocos por seção (não assusta). Só ao final clica
  **Enviar** (valida obrigatórios) → `status:'enviado'`.
- **Definição no código** (`FORMULARIOS` em `formularios.ts`): 1º formulário =
  **IKIGAI Empresarial** (5 dados + 13 reflexões em Paixão/Missão/Vocação/
  Profissão/Finalização, fiel ao Google Forms da KA). Cada campo tem
  `tipo` (texto/paragrafo/email/data), `label`, `ajuda`, `obrigatorio`. Novos
  formulários (outras etapas) entram no mesmo registro.
- **Instância** = doc na coleção `formularios` (token público, `respostas`,
  `status`, `cliente_id/nome`). CRUD em `formularios.ts` (`criarFormulario`,
  `carregarFormulario`, `salvarRespostas`, `enviarFormulario`, `reabrir…`,
  `excluir…` p/ lixeira). Admin lista em cards (progresso + status), abre p/
  **ver respostas** e pode **reabrir** p/ o cliente editar. Estilos `.form-pub*`
  /`.form-card*`/`.form-resp*` em gestao.css. Regra Firestore: leitura/escrita
  por token (hoje modo teste).
- **Detalhes (jul/2026):** **URL limpa** (`linkPublicoFormulario(token, rotulo)`
  → `/formulario/<slug-marca-form>-<token>`; `tokenDoParametroFormulario` pega o
  token no fim, links antigos valem). **Logo KA** (`ka-preto.png`) no cabeçalho
  público, centralizado. Cabeçalho: "Projeto Marca com Essência© · Etapa 1"
  (**sem travessões** — usa "·"/":"; padrão da marca). Ao criar, **2 opções**:
  **pré-preenchido** com os dados do cadastro (`prefillDoCliente` = nome/e-mail/
  cidade) ou **em branco**. **Exportar respostas em PDF** (`imprimirComoPdf`,
  botão no detalhe). Botão **WhatsApp** com o número do cliente + mensagem de
  acompanhamento do IKIGAI. Mais **espaço** entre a pergunta e o campo.
- **Visual (jul/2026):** cabeçalho público com o **logo COMPLETO** (`/logo-ka.png`,
  "KA | Inteligência para Marcas") numa faixa creme (`.form-pub__cabecalho`);
  título **IKIGAI Empresarial** + etapa alinhados à **esquerda**. Cada seção é um
  **bloco distinto** (`.form-pub__secao`, card com cor de destaque própria por
  seção via `--acento`/`ACENTOS`, título centralizado, mais espaço até os campos).
  **Aviso verde "✓ Resposta salva"**: no topo (`.form-pub__salvo--ok`) e um
  **flutuante** que aparece e some (`.form-pub__flash`, `flashSalvo`).
- **Prévia do LINK DO PROJETO no WhatsApp (ago/2026) — função de borda.** O
  título da prévia é **"Painel de Controle de Projeto · <cliente>"**. Como o
  nome muda por projeto, um HTML estático não resolve: quem faz é a Netlify
  **Edge Function** `netlify/edge-functions/projeto-og.ts` (registrada em
  `netlify.toml`, `path = "/projeto/*"`), que roda antes de servir a página,
  busca `cliente_nome` no Firestore pela **REST API** (`documents:runQuery` com
  a apiKey pública, aceitando apelido/token) e reescreve os `<meta>`. É à prova
  de falha: 2,5s de limite, cai no nome tirado da própria URL
  (`boba-joy` → "Boba Joy") e, em qualquer erro, devolve o HTML original.
- ⚠️ **Bug antigo corrigido junto:** os regex de `gen-og.mjs` (e os da borda)
  não casavam `description`/`og:description`/`twitter:description` porque no
  `index.html` os atributos ficam em LINHAS separadas — só o título trocava, e a
  prévia do formulário mostrava a descrição genérica do app. Agora a troca usa
  `<meta\s+attr="nome"\s+content="…"` (o `\s+` cobre a quebra de linha).
- **Prévia no WhatsApp (Open Graph):** como é SPA, o link `/formulario/*` teria a
  prévia genérica. `scripts/gen-og.mjs` (roda no `build`) gera `dist/formulario.html`
  (cópia do index com `<title>`/OG próprios: "IKIGAI Empresarial | Projeto Marca
  com Essência© · Etapa 01"); `public/_redirects` manda `/formulario/*` p/ esse
  HTML (antes do catch-all do SPA). Novas rotas com prévia própria entram no
  array `paginas` do script.

### Notícias (aba dentro do SaaS — jul/2026)

Aba **Notícias** (`/noticias`, no grupo "Criação" da home + menu topo,
`GestaoNoticias.tsx` + `src/lib/noticias.ts`): a KA quer **centralizar tudo no
app** (o SaaS). Um **sistema de geração de notícias externo** (outra sessão/
serviço, NÃO o antigo `sistemaka/` em Python da raiz) **publica direto no
Firestore do app**, na coleção **`noticias`**; a aba só **LÊ** (`listarNoticias`,
`orderBy('criado_em','desc')`, ignora `excluido_em`) e mostra **cards agrupados
por dia** (título, fonte, resumo, imagem, "Ler matéria", categoria) + botão
"↻ Atualizar". Aba **aberta** (sem `GateAdmin`), como o Estúdio. Doc de
`noticias`: `titulo`+`criado_em` (obrigatórios), `data` (YYYY-MM-DD, agrupa),
`resumo`/`fonte`/`url`/`imagem`/`categoria` (opcionais). O contrato p/ o sistema
externo (gravar via REST com a apiKey pública enquanto o Firestore está em modo
teste; upsert por ID determinístico) está em `BRIEFING-NOTICIAS-NO-SAAS.md`
(entregue à KA). Estilos `.noticia*` em gestao.css.

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

### Ícone na tela de início do celular (ago/2026)

Salvar o link do app no iPhone/Android agora mostra o **monograma KA** (preto
sobre o creme da marca) em vez do print da página:

- `public/icones/` — `apple-touch-icon.png` (180, iPhone), `icone-192.png`,
  `icone-512.png`, `icone-512-maskable.png` (Android corta as bordas, então
  esse tem o monograma menor) e `favicon-32.png` (aba do navegador). Gerados
  com PIL a partir de `public/clientes/ka/ka-preto.png`, recortando o espaço
  vazio e centralizando sobre `#E7E0CD`.
- `index.html` traz os `<link rel="apple-touch-icon">`/`icon`/`manifest` e o
  `apple-mobile-web-app-title` = **"Estúdio KA"** (nome embaixo do ícone).
- `public/site.webmanifest`: `display: "browser"` **de propósito** — o app
  depende do "voltar" do navegador para fechar fichas, então continua abrindo
  no Safari. Para virar "app de verdade" (tela cheia, sem barra do Safari), é
  trocar para `standalone` e testar a navegação de novo.
- ⚠️ Depois de publicar, o iPhone só mostra o ícone novo se o atalho for
  **removido e salvo de novo** (ele guarda a imagem de quando foi salvo).

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
>
> ✅ **28/08/2026 — publicar É dar push (mas só conta o que muda dentro de
> `estudio-marca-ka/`).** O site builda sozinho ~1 min depois do push na branch
> `estudiodemarca`: confirmado nos commits `18466e4`, `6943c37` e `f1c8b44`
> (todos mexeram no app). Os commits `d0d47aa` e `e48c903` NÃO geraram deploy
> porque só alteraram o `CLAUDE.md`, que está na RAIZ do repo — com "base
> directory" configurado, o Netlify pula o build quando nada muda dentro da
> pasta base. Ou seja: commit só de documentação não publica, e isso é o
> esperado (não é bug). Antes de concluir "o deploy não está funcionando",
> conferir se o commit tocou em `estudio-marca-ka/`.
>
> ⚠️ O **`deploy-site` do conector Netlify continua dando `403 Forbidden`** na
> fase de upload (`zipAndBuild`) — não é o proxy do sandbox (o
> `recentRelayFailures` fica vazio), é o próprio Netlify. Como o push publica,
> esse caminho não é necessário. Conferir o que está no ar pela API
> (`get-deploy-for-site`, site id `620d408e-bb8a-49fb-a1da-ccf602320142`): o
> campo `commit_ref` diz o commit publicado. O domínio do site é bloqueado pela
> política de saída do sandbox, então a IA não abre a página no ar — a checagem
> é sempre pela API.

> ⚠️ **Em 30/07/2026 o deploy pelo conector Netlify (deploy-site) falhou com
> `403 Forbidden`** na fase de upload (`zipAndBuild`). Ou seja: nem o conector
> nem o workflow (token vencido) publicam sozinhos hoje. **Fluxo confiável
> enquanto isso:** dar push na branch **`estudiodemarca`** (a que o site
> publica) e a KA clicar em **Trigger deploy** no painel do Netlify. Para
> destravar a automação, renovar o `NETLIFY_AUTH_TOKEN` (passo acima).

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
    │   ├── firebase.ts, api.ts, database.types.ts
    │   ├── gestao.ts               # dados de orçamentos/contratos/cobranças
    │   ├── cuidadoras.ts           # cuidadoras + documentos (compressão)
    │   ├── projetos.ts             # projetos + fases + responsável/data + pendências
    │   ├── atividades.ts           # painel pessoal da KA (Trabalho/BIA/Pessoal)
    ├── styles/
    │   ├── global.css              # tema base (KA)
    │   ├── painel.css              # grades do painel (clientes + templates)
    │   └── gestao.css              # abas, tabelas, fichas, páginas públicas
    ├── hooks/
    │   ├── useDitado.ts            # ditado por voz (Web Speech API, pt-BR)
    │   ├── useArrastarCartoes.ts   # arrastar (motor; colunas + toque do iPhone)
    │   └── useListaArrastavel.ts   # arrastar numa lista simples (em pé)
    ├── components/
    │   ├── Toast.tsx               # avisos flutuantes (ToastProvider/useToast)
    │   ├── BotaoMic.tsx            # botão de microfone (ditado)
    │   ├── BrandStudio.tsx         # estúdio por marca ("o que criar?")
    │   ├── MiniPreview.tsx         # miniatura ao vivo de template (scale)
    │   ├── EditorPeca.tsx          # editor de peça única
    │   ├── Carrossel.tsx           # construtor de carrossel (até 10 slides)
    │   ├── CamposEditor.tsx        # controles a partir de `campos`
    │   └── editor.css, carrossel.css
    ├── pages/
    │   ├── AdminPanel.tsx          # painel da KA (abas estúdio + gestão)
    │   ├── gestao/                 # GateAdmin, Clientes, Orçamentos,
    │   │                           #   Contratos, Cobranças, Cuidadoras (admin)
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

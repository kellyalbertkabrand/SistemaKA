# KA — Cards / Templates

> Os 7 templates da KA. Definição: `src/templates/registry.ts` (ids `ka-*`).
> Render: `src/templates/ka/KaCards.tsx`. Estilos: `ka.css`.
> Todos no Feed 4:5 (1080×1350), com cabeçalho e rodapé da marca (exceto o
> Feedback). São os **blocos dos carrosséis de 10 cards** da KA.

---

> As miniaturas abaixo são **exemplos renderizados** com a fonte, a moldura e as
> cores reais da marca (feitos só para ilustrar cada template).

## 1. `ka-capa` — Capa (gancho)
<img src="assets/card-01-capa.png" width="300" align="right" alt="Exemplo do card Capa">

Abertura do carrossel. Título grande em **Playfair** (≈106px) com a palavra-chave
em negrito. É o card que "fisga".
<br clear="all">

## 2. `ka-texto` — Texto (desenvolvimento)
<img src="assets/card-02-texto.png" width="300" align="right" alt="Exemplo do card Texto">

Slide de conteúdo: **título opcional** + **corpo** em Montserrat. O corpo do
carrossel — argumentação, explicação, reflexão.
<br clear="all">

## 3. `ka-passo` — Passo numerado
<img src="assets/card-03-passo.png" width="300" align="right" alt="Exemplo do card Passo">

**Número grande** (na cor de destaque **Caramelo**) acima do texto. Para listas
de passos/etapas dentro do carrossel.
<br clear="all">

## 4. `ka-midia` — Mídia (notícias e análises)
<img src="assets/card-04-midia.png" width="300" align="right" alt="Exemplo do card Mídia">

Texto + **área de mídia** (foto **ou vídeo**) em proporção fixa:
- 16:9 e 1:1 → mídia **abaixo** do texto;
- 9:16 → **texto à esquerda, mídia à direita**.
Slider "Tamanho da foto" (`midia_area`). Aceita **vídeo com áudio** (exporta PNG,
moldura para CapCut e MP4). Ideal para comentar notícias/casos.
<br clear="all">

## 5. `ka-comentario` — Comentário (box de print)
<img src="assets/card-05-comentario.png" width="300" align="right" alt="Exemplo do card Comentário">

Texto + **box branco de comentário** (@usuário + fala) — simula o print de um
comentário real como prova social/gancho.
<br clear="all">

## 6. `ka-cta` — CTA (card 10)
<img src="assets/card-06-cta.png" width="300" align="right" alt="Exemplo do card CTA">

**Fecha todo carrossel KA.** Fundo **bege travado**, frase + nome do produto
grande + **botão pill** "Link na minha bio" com contorno **caramelo**.
<br clear="all">

## 7. `ka-feedback` — Card de Feedback (review)
<img src="assets/card-07-feedback.png" width="300" align="right" alt="Exemplo do card Feedback">
Prova social estilo **review do Google**: logo KA em PNG (branco/preto conforme
o fundo), rótulo "FEEDBACK ;)" editável, **box branco** (radius 34) com avatar em
gradiente caramelo→marinho (inicial do nome), nome + subtítulo, **estrelas** no
dourado do Google `#FBBC04` e depoimento cinza `#5F6368`. Fonte **Outfit**.
**Não usa** a moldura dos carrosséis (sem cabeçalho-fita; rodapé próprio).
Depoimento sempre **real**, sem data.
<br clear="all">

---

## Como montar um carrossel
Estúdio → cliente **KA** → **Montar carrossel** (até 10 slides, misturando os
templates acima; o card 10 é o CTA). Rota pública da marca: **`/ver/ka`**.

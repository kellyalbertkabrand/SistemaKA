# Conecta — Cards / Templates

> Os 10 templates do Conecta. Definição dos campos: `src/templates/registry.ts`
> (ids `conecta-*`). Render (desenho): `src/templates/conecta/ConectaCards.tsx`.
> Estilos/medidas: `src/templates/conecta/conecta.css`.
>
> Todos aceitam os 4 formatos e têm, por texto, os controles de **tamanho** e
> **cor** (ver [`04-formatos-e-controles.md`](04-formatos-e-controles.md)).
> Fundo padrão `navy`, salvo indicação.

---

## 1. `conecta-capa` — Capa
Abertura editorial de carrossel: logo centralizado, tag, **título** leve com a
palavra-chave em turquesa, linha e subtítulo.
- **Campos:** `tag`, `titulo`*, `subtitulo`, `deslize` (rodapé, ex.: "Deslize →"),
  `cor_logo`, `cor_fundo`.
- Padrões: título `Conexões com "propósito"`; subtítulo "O núcleo de negócios da
  ACIGRA em Gravataí."

## 2. `conecta-conteudo` — Conteúdo (slide interno)
Slide de desenvolvimento: logo + **número decorativo**, tag, título leve com
keyword, linha e texto de apoio. Para MISSÃO, VISÃO, dicas, sinais.
- **Campos:** `numero` (ex.: 01), `tag` (ex.: "SINAL 01"), `titulo`*, `texto`,
  `cor_logo`, `cor_fundo`.

## 3. `conecta-lista` — Lista (valores / objetivos)
Tag + título + **lista editorial**. Cada linha `Rótulo: descrição` destaca o
**rótulo em turquesa**. Ex.: VALORES, OBJETIVOS.
- **Campos:** `tag` ("O NÚCLEO"), `titulo`, `itens`* (um por linha, formato
  "Rótulo: descrição"), `cor_logo`, `cor_fundo`.

## 4. `conecta-foto` — Card com foto (evento)
**Foto full-bleed** com overlay (Navy) ou **emoldurada** (Warm). Logo, tag,
título leve e **data/local**. Serve Reunião Quinzenal e Palestra (use o
sobretítulo "Convidados especiais").
- **Campos:** `foto`* (aceita **vídeo**; Posição/Zoom p/ enquadrar), `tag`
  ("REUNIÃO QUINZENAL"), `sobre` (sobretítulo opcional), `titulo`*, `apoio`
  (Data — Hora · Local), `cor_logo`, `cor_fundo`.

## 5. `conecta-1a1` — Encontro 1:1
Foto em destaque com o selo **"CONECTA 1:1"** no **canto superior esquerdo**
(caixa navy, texto branco) e, no rodapé, os **dois participantes** (nome em
CAIXA ALTA + empresa embaixo, menor e sem negrito), um centralizado em cada
metade. Réplica do post real do Instagram.
- **Campos:** `foto`* (aceita vídeo), `nome_esq`, `empresa_esq`, `nome_dir`,
  `empresa_dir`, `badge` (selo, padrão "CONECTA 1:1"), `pos` (slider **Subir
  nomes e botão** 0–700px), `cor_logo`, `cor_fundo`.
- **Controles por participante:** tamanho e cor de "participante esquerda" e
  "participante direita" (`pessoaEsq`, `pessoaDir`).
- Detalhe: foto ocupa o card inteiro; véu escuro só na base p/ leitura dos nomes.

## 6. `conecta-calendario` — Calendário do mês
**Mês** em destaque (peso ultrafino) + **ano** em turquesa, com o **número do
mês gigante** ao fundo. Anuncia os eventos do mês.
- **Campos:** `tag` ("CALENDÁRIO"), `mes`*, `ano`, `rodape` ("Eventos do mês →"),
  `numero` (nº do mês no fundo, ex.: 04), `cor_logo`, `cor_fundo`.

## 7. `conecta-educativo` — Conteúdo educativo
Capa de conteúdo: **aspas decorativas**, tag, título leve com keyword, texto de
apoio e "Deslize →".
- **Campos:** `tag` ("DICA CONECTA"), `titulo`*, `texto`, `deslize`, `cor_logo`,
  `cor_fundo`.

## 8. `conecta-frase` — Frase de virada
Slide de impacto: aspas decorativas e uma **frase centralizada** em peso leve,
com a palavra-chave em turquesa. Sem logo grande.
- **Campos:** `frase`*, `cor_logo`, `cor_fundo`.

## 9. `conecta-cta` — CTA (fechamento)
Fechamento do carrossel: **logo grande**, tag, frase conceitual e a linha de
**exclusividade** ("As vagas abrem duas vezes por ano."). **Fundo radial (cta).**
- **Campos:** `tag` ("NÚCLEO DE NEGÓCIOS ACIGRA"), `frase`*, `exclusivo`,
  `cor_logo`, `cor_fundo` (padrão `cta`).

## 10. `conecta-feedback` — Card de Feedback
Prova social: logo, tag e **box branco** com avatar (inicial do nome, cor
automática), nome, subtítulo, **estrelas** e o **depoimento real**. Navy ou Warm.
- **Campos:** `rotulo` (tag, "DEPOIMENTO"), `nome`*, `subtitulo` ("Nucleada
  Conecta"), avatar/estrelas e depoimento (demais campos do template), `cor_fundo`.

---

\* = campo obrigatório.

## Onde criar
Estúdio → cliente **Conecta** → escolher o card (peça única) ou **Montar
carrossel** (até 10 slides, misturando os templates acima). Rota pública da
marca: **`/ver/conecta`**.

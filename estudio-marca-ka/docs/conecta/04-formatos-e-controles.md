# Conecta — Formatos e Controles comuns

> Definido em código: `src/templates/registry.ts` (`FORMATOS_CONECTA` e os
> helpers `campoTagConecta`, `campoTam`, `campoCor`, `campoFundoConecta`,
> `campoCorLogoConecta`).

## 1. Formatos de exportação

Todo card do Conecta sai nestes 4 tamanhos (`FORMATOS_CONECTA`):

| Formato | Rótulo | Dimensões (px) |
| --- | --- | --- |
| `post` | Feed 4:5 | 1080 × 1350 |
| `story` | Story 9:16 | 1080 × 1920 |
| `card` | Quadrado 1:1 | 1080 × 1080 |
| `carrossel` | Apresentação 16:9 | 1920 × 1080 |

Export em PNG 2× (alta resolução). Carrossel também exporta em `.zip`.

## 2. Controles comuns a (quase) todos os cards

### Tag de categoria (`tag`)
Texto curto em MAIÚSCULAS que vira **turquesa espaçado** (ex.: "REUNIÃO
QUINZENAL", "DICA CONECTA"). Sem emoji.

### Fundo do card (`cor_fundo`)
Paleta de fundos (ver [`01-cores.md`](01-cores.md) §5). Padrão `navy` (ou `cta`
no card de fechamento). **Regra:** alternar no feed, nunca 2 navy seguidos.

### Cor do logo (`cor_logo`)
`select` com chips: **Automático** (segue o fundo) ou fixa (branco/turquesa/navy).

### Tamanho de cada texto (`${id}_tam`)
Slider "volume" **60 → 160%** (padrão 100%). Cada texto do card tem o seu.

### Cor de cada texto (`${id}_cor`)
Paleta: **Automático** (contraste com o fundo) + as 8 cores de `COLORS_CONECTA`.
Cada texto tem a sua, independente do logo e dos outros textos.

## 3. Regra da palavra-chave

Onde há título/frase, a palavra entre `"aspas"`/`*asteriscos*` fica **negrito
turquesa** (`AJUDA_KW`). Ver [`02-tipografia.md`](02-tipografia.md) §3.

## 4. Quebra automática

Todos os textos quebram sozinhos para não passar da margem — não é preciso
ajustar manualmente palavras longas.

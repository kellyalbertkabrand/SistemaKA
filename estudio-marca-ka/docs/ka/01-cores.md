# KA — Cores

> Definido em código: `src/templates/ka/cores.ts` (`FUNDOS_KA`).
> Todas as cores da paleta ficam disponíveis **como fundo** e **como cor de
> texto** em qualquer card. A cor do texto pode ser "Automático" (contraste) ou
> uma cor fixa da paleta.

## 1. Paleta oficial da marca (6)

Vêm primeiro no seletor — são a identidade da KA:

| Nome | Hex | Uso típico |
| --- | --- | --- |
| **Cream** | `#E7E0CD` | fundo claro base (papel quente) |
| **Bege Quente** | `#C2AA8A` | fundo neutro quente |
| **Cobre** | `#8B5A2B` | fundo escuro quente |
| **Caramelo** | `#C47830` | **cor de realce/destaque** e fundo |
| **Azul Essência** | `#3D6B7E` | fundo frio de contraponto |
| **Marinho** | `#152535` | fundo escuro / texto sobre claro |

## 2. Cores extras (claros e detalhes)

| Nome | Hex |
| --- | --- |
| Papel | `#F8F7F2` |
| Bege Leve | `#F7F3EA` |
| Bege Papel | `#E8E4DB` |
| Dourado Claro | `#D4C49E` |
| Mostarda | `#E0B880` |
| Dourado | `#B89B6A` |
| Preto KA | `#0F1923` |

## 3. Cores nomeadas (uso interno)

`COR_ESSENCIA #3D6B7E` · `COR_MOSTARDA #E0B880` · `COR_CARAMELO #C47830` ·
`COR_PAPEL #F8F7F2` · `COR_MARINHO #152535` · `COR_CLARO #F4F1EB`.

## 4. Contraste automático (YIQ)

Funções em `cores.ts`:

- `ehFundoEscuroKA(fundo)` — luminância **YIQ < 150** = fundo escuro.
- `corTextoKA(fundo)` — no escuro usa **claro** `#F4F1EB`; no claro usa
  **Marinho** `#152535`.
- `corFonteKA(cor_fonte, fundo)` — o campo **cor da fonte** por card:
  `'auto'` = contraste automático; ou uma cor fixa da paleta.

## 5. Cor de DESTAQUE (realce)

`corDestaqueKA(fundo)` decide a cor dos realces fortes (ex.: o **número grande**
do card Passo):

- Padrão: **Caramelo** `#C47830`.
- Se o caramelo **não contrasta** com o fundo (diferença de luminância < 60 —
  fundos quentes/dourados, o próprio caramelo/cobre): troca por **Mostarda**
  `#E0B880` (fundo escuro) ou **Marinho** `#152535` (fundo claro) — o realce
  **sempre** aparece.

> ⚠️ Importante: o **negrito de ênfase** (aspas/asteriscos) **NÃO** usa a cor de
> destaque — ele fica na **mesma cor do texto**. Só o número do Passo (e realces
> equivalentes) usam `corDestaqueKA`. Ver [`02-tipografia.md`](02-tipografia.md).

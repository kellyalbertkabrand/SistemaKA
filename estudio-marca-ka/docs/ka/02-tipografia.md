# KA — Tipografia

> Definido em código: `src/templates/ka/ka.css` (@font-face) e nos componentes.
> Fontes **variáveis, auto-hospedadas** (licença OFL) — o export do PNG embute a
> fonte sem depender do Google Fonts.

## 1. Famílias

| Papel | Fonte | Arquivo |
| --- | --- | --- |
| **Títulos / display** | **Playfair Display** ('Playfair KA') | `fonts/playfair-var.woff2` + `playfair-var-italic.woff2` |
| **Corpo / rótulos / cabeçalho** | **Montserrat** ('Montserrat KA') | `fonts/montserrat-var.woff2` |
| **Card de Feedback** | **Outfit** | `fonts/outfit-var.woff2` |

- Playfair Display = serifada editorial, dá o tom sofisticado nos títulos.
- Montserrat = sem serifa, limpa, para corpo, cabeçalho e rótulos (maiúsculas).
- Outfit = usada **só** no card de Feedback (review estilo Google).

## 2. A regra do DESTAQUE (negrito)

No texto, a palavra entre `"aspas"` **ou** `*asteriscos*` vira **negrito peso
900** — mas **na MESMA cor do texto** (a pedido da KA):

- O negrito **NÃO troca a cor**. Se o texto é branco, o negrito é branco; se é
  marinho, o negrito é marinho.
- **Nunca itálico.** O realce é sempre por peso.
- Implementado por `comDestaque` em `KaCards.tsx`.

Exemplo: `marcas com "essência"` → *marcas com* **essência** (mesma cor, peso 900).

## 3. O número do card Passo

O **único** elemento que usa a cor de destaque (Caramelo, ver
[`01-cores.md`](01-cores.md) §5) é o **número grande** do card Passo. O resto do
realce herda a cor do texto.

## 4. Regras de texto da marca

- **Sem travessões (—)** no texto corrido — usar "·" ou ":".
- Cabeçalho e rótulos em **maiúsculas** (Montserrat), com `letter-spacing`.
- Títulos em Playfair, tamanho generoso, poucas linhas.

# KA — Formato e Regras de Composição

> Definido em código: `src/templates/ka/KaCards.tsx` (moldura comum `KaFrame`) e
> `ka.css`.

## 1. Formato travado

- **Só Feed 4:5 — 1080 × 1350** (o padrão dos carrosséis KA).
- **Padding 80px**, conteúdo **centralizado**.
- Export em PNG 2× (alta resolução); carrossel em `.zip`.

## 2. Cabeçalho (fita da marca)

Todo card de carrossel tem um **cabeçalho** no topo:

```
KA | Inteligência para Marcas · Branding · Posicionamento · IA
```

- Fonte **Montserrat**, **maiúsculas**, **1 linha**, ~85% da largura.
- A parte **"KA | Inteligência para Marcas"** vai em **bold 800**; o resto
  (`· Branding · Posicionamento · IA`) em peso normal.

## 3. Rodapé (assinatura)

```
KELLY ALBERT
```

- `letter-spacing: .4em`, **opacidade .58** (discreto).
- Fecha todo card — é a assinatura da marca.

> O card de **Feedback** é a exceção: não usa a fita de cabeçalho dos carrosséis
> e tem rodapé próprio em Outfit.

## 4. Texturas de fundo (opcional)

`src/templates/ka/texturas.ts` — padrões geométricos **gerados por CSS** (sem
imagem), na cor do texto com transparência, atrás do conteúdo (`.ka-textura`):

- Grid Quadrado · Grid Fino · Diamante · Linhas · Diagonal · Xadrez
- Com **slider de intensidade** (mais clara/escura).
- Valem para os 6 cards de carrossel (não o Feedback).

## 5. Regras de composição

- **Destaque** = negrito peso 900 na mesma cor do texto (aspas/asteriscos).
  Ver [`02-tipografia.md`](02-tipografia.md).
- **Cor do texto**: Automático (contraste) ou fixa da paleta, por card.
- **Alternar fundos** ao montar o carrossel (ritmo claro/escuro).
- **Sem travessões**; usar "·"/":". Nunca itálico.
- Card 10 do carrossel = **CTA** (fundo bege travado) — ver
  [`05-cards.md`](05-cards.md).

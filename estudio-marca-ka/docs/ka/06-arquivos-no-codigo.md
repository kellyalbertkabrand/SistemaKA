# KA — Mapa de arquivos no código

> Onde cada parte da identidade KA vive no app (`estudio-marca-ka/`).

## Assets (públicos)

```
public/clientes/ka/
├── ka-preto.png            # logo KA escuro (fundos claros)
├── ka-branco.png           # logo KA claro (fundos escuros)
└── fonts/
    ├── playfair-var.woff2         # Playfair Display (títulos)
    ├── playfair-var-italic.woff2  # Playfair itálico
    ├── montserrat-var.woff2       # Montserrat (corpo/cabeçalho)
    └── outfit-var.woff2           # Outfit (card de Feedback)
public/logo-ka.png          # logo completo "KA | Inteligência para Marcas"
```

## Código (templates)

```
src/templates/
├── registry.ts             # registro dos 7 templates (ids ka-*)
├── marcas.ts               # visual do card da marca KA no painel interno
└── ka/
    ├── cores.ts            # paleta FUNDOS_KA + contraste (YIQ) + corDestaqueKA
    ├── texturas.ts         # padrões geométricos de fundo (CSS) + intensidade
    ├── KaCards.tsx         # moldura comum (KaFrame) + os 7 cards + comDestaque
    └── ka.css              # @font-face (Playfair/Montserrat/Outfit) + estilos
```

## Rotas

- Estúdio (admin) → cliente **KA** → carrossel.
- Página pública da marca: **`/ver/ka`** (a rota `/ka` é o painel admin; por isso
  o estúdio público da KA fica em `/ver/ka`).

## Pontos de manutenção rápidos

| Quero mudar… | Arquivo |
| --- | --- |
| Uma cor / a cor de destaque | `ka/cores.ts` |
| Fonte, tamanho, cabeçalho/rodapé, medidas | `ka/ka.css` + `ka/KaCards.tsx` |
| Texturas de fundo | `ka/texturas.ts` |
| Campos do editor de um card | `registry.ts` (bloco do id `ka-*`) |
| Como um card é desenhado | `ka/KaCards.tsx` |
| Logo / fontes | `public/clientes/ka/` |

## Documentação (esta pasta)

```
docs/ka/
├── README.md               # visão geral + índice
├── brandbook.html          # Manual da Marca visual (página única, offline)
├── 01-cores.md
├── 02-tipografia.md
├── 03-logo.md
├── 04-formato-e-regras.md
├── 05-cards.md
├── 06-arquivos-no-codigo.md  (este arquivo)
├── 07-site.md              # padrao do site kellyalbert.com.br
└── assets/                 # imagens da doc
    ├── paleta.png
    ├── card-01-capa.png … card-07-feedback.png
    └── site-ambientes.png · site-acentos.png
```

> ⚠️ O **site** (kellyalbert.com.br) é outro repositório:
> **`kellyalbertkabrand/kellyalbert-site`** (HTML estático + `css/style.css`).
> Não está neste repo do app. Ver [`07-site.md`](07-site.md).

# Conecta — Mapa de arquivos no código

> Onde cada parte do Conecta vive no app (`estudio-marca-ka/`).

## Assets (públicos)

```
public/clientes/conecta/
├── conecta-simbolo.png            # símbolo turquesa
├── conecta-simbolo-branco.png     # símbolo branco
├── conecta-simbolo-marinho.png    # símbolo navy
├── conecta-wordmark.png           # palavra CONECTA (turquesa)
├── conecta-wordmark-branco.png    # palavra CONECTA (branca)
├── conecta-wordmark-marinho.png   # palavra CONECTA (navy)
└── fonts/
    └── sora-var.woff2             # Sora variável (100–800), auto-hospedada
```

## Código (templates)

```
src/templates/
├── registry.ts                    # registro dos 10 templates (ids conecta-*),
│                                  #   FORMATOS_CONECTA e helpers de campo
├── marcas.ts                      # visual do card da marca no painel interno
└── conecta/
    ├── cores.ts                   # paleta, gradientes, contraste (YIQ)
    ├── ConectaLogo.tsx            # lockup (símbolo+CONECTA+tagline) e ícone
    ├── ConectaCards.tsx           # render dos 10 cards + helpers (est, comKw…)
    └── conecta.css                # @font-face Sora + estilos/medidas dos cards
```

## Rotas

- Estúdio (admin) → cliente **Conecta** → cards / carrossel.
- Página pública da marca: **`/ver/conecta`** (rota dinâmica `/:slug`).

## Pontos de manutenção rápidos

| Quero mudar… | Arquivo |
| --- | --- |
| Uma cor / gradiente | `conecta/cores.ts` |
| Peso/tamanho de fonte, medidas de um card | `conecta/conecta.css` |
| Campos do editor de um card (o que a pessoa preenche) | `registry.ts` (bloco do id) |
| Como um card é desenhado | `conecta/ConectaCards.tsx` |
| Logo/variantes | `conecta/ConectaLogo.tsx` + PNGs em `public/clientes/conecta/` |

## Documentação (esta pasta)

```
docs/conecta/
├── README.md                      # índice + visão geral da marca
├── 01-cores.md
├── 02-tipografia.md
├── 03-simbolo-logo.md
├── 04-formatos-e-controles.md
├── 05-cards.md
├── 06-capas-destaques.md
├── 07-arquivos-no-codigo.md       # (este arquivo)
└── capas-destaques/               # PNGs prontos das 3 capas escolhidas
```

# Conecta — Símbolo e Logo

> Arte oficial em `public/clientes/conecta/`. Código: `ConectaLogo.tsx`.
> **Nunca** recriar como SVG aproximado — usar sempre os PNGs oficiais.

## 1. O símbolo

Uma **espiral "C"** — um traço contínuo que enrola formando um C com um miolo
em espiral (dá a ideia de conexão/movimento). É a marca máxima do Conecta e
funciona sozinho (avatar, capa de destaque, assinatura).

## 2. Arquivos

| Arquivo | O que é | Cor |
| --- | --- | --- |
| `conecta-simbolo.png` | só o símbolo | Turquesa `#00CEC9` |
| `conecta-simbolo-branco.png` | só o símbolo | Branco |
| `conecta-simbolo-marinho.png` | só o símbolo | Navy `#1B2A4A` |
| `conecta-wordmark.png` | palavra "CONECTA" | Turquesa |
| `conecta-wordmark-branco.png` | palavra "CONECTA" | Branco |
| `conecta-wordmark-marinho.png` | palavra "CONECTA" | Navy |

Proporção do wordmark: `2517 / 400` (largura/altura).

## 3. Lockup (símbolo + palavra + tagline)

Componente `ConectaLogo` monta: **símbolo** + **CONECTA** + a tagline
**"NÚCLEO DE NEGÓCIOS ACIGRA"** (maiúsculas, espaçada).

- Prop `cor`: `'auto'` (segue o fundo) · `'branco'` · `'turquesa'` · `'navy'`.
  - `auto` = **branco** no fundo escuro (com leve sombra) / **turquesa** no claro.
- Prop `altura` controla o tamanho; a tagline e o wordmark escalam junto.
- Nos cards, a **cor do logo** é um controle (`cor_logo`): Automático ou fixa.

## 4. Assinatura discreta (só o ícone)

`ConectaIconeAssinatura` usa só o símbolo, com opacidade baixa, para assinar o
rodapé de alguns cards (ex.: o selo do card com foto no modo claro).

## 5. Regras de uso

- Fundo escuro → símbolo **branco** ou **turquesa**.
- Fundo claro → símbolo **navy** (ou turquesa).
- Turquesa como fundo → símbolo **navy** (contraste).
- Manter o símbolo **centralizado** e com respiro; não distorcer (usa
  `object-fit: contain`).

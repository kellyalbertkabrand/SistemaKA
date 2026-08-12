# Conecta — Tipografia

> Definido em código: `src/templates/conecta/conecta.css` (@font-face) e nos
> componentes dos cards.

## 1. Fonte

**Sora** — uma única família para tudo (display + corpo). É uma grotesca
geométrica, editorial e sóbria, que combina com o tom do núcleo.

- **Variável**, auto-hospedada: `public/clientes/conecta/fonts/sora-var.woff2`
  (pesos 100–800 num arquivo só). Declarada como família `'Sora Conecta'`.
- Auto-hospedar garante que o **export do PNG embuta a fonte** (não depende do
  Google Fonts nem de CSS cross-origin).

## 2. Pesos e usos

| Elemento | Peso | Observação |
| --- | --- | --- |
| Título / frase | **Leve** (200–300) | editorial; a força vem do contraste com a keyword |
| Palavra-chave (keyword) | **Negrito** (700–900) | em **turquesa** — a assinatura do sistema |
| Tag de categoria | 500–600, MAIÚSCULAS | espaçamento de letra (`letter-spacing`), turquesa |
| Texto de apoio | 300 | cinza (contraste automático) |
| Número decorativo / mês | ultrafino / grande | acento de composição |
| Nomes (card 1:1) | 700, CAIXA ALTA | empresa embaixo em peso normal, menor |

## 3. A regra da PALAVRA-CHAVE (identidade do sistema)

No **título/frase**, a palavra-chave entre `"aspas"` **ou** `*asteriscos*` vira
**negrito turquesa** automaticamente. É o traço visual que identifica o Conecta.

- Exemplo: `Conexões com "propósito"` → *Conexões com* **propósito** (turquesa).
- Vale em: Capa, Conteúdo, Card com foto, Conteúdo educativo, Frase, CTA, Lista
  (no rótulo de cada item).
- Use **quebras de linha** para compor o título.
- **Nunca itálico.** O negrito só troca o peso e a cor — não usa itálico.

## 4. Quebra automática de texto

Todos os textos têm **quebra automática** (`overflow-wrap: anywhere; word-break:
break-word`) para **nunca passar da margem**, mesmo com palavras longas.

## 5. Tamanho e cor por texto

Cada texto do card tem 2 controles independentes (ver
[`04-formatos-e-controles.md`](04-formatos-e-controles.md)):

- **Tamanho** — slider "volume" de 60% a 160% (padrão 100%).
- **Cor** — Automático (contraste) ou qualquer cor da paleta.

Tecnicamente: o tamanho vira uma CSS var `--t` que multiplica o
`font-size` base (`calc(BASEpx * var(--t, 1))`).

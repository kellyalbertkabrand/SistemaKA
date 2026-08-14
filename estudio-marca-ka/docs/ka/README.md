# KA · Inteligência para Marcas — Identidade Visual

> Fonte de verdade da **identidade visual da marca KA** (a marca da própria
> Kelly Albert) dentro do Sistema Visual de Publicações da Marca. Reúne cores,
> tipografia, logo, formato, regras de composição e todos os cards/templates.
>
> Última atualização: agosto/2026.

---

## 1. O que é a KA

**KA | Inteligência para Marcas** é a marca da **Kelly Albert**, designer e
estrategista de marca. A comunicação é **editorial e sóbria**, baseada em
**carrosséis** de branding, posicionamento e IA — o "Sistema de Carrosséis KA".

- **Essência:** marcas com essência; estratégia + estética.
- **Assinatura:** todo material fecha com **KELLY ALBERT**.
- **Tom:** editorial, elegante, direto. Destaque por peso (negrito), **nunca
  itálico**, **sem travessões (—)** no texto corrido (usar "·" ou ":").
- **Formato-mãe:** carrossel Feed 4:5 (1080×1350).

---

## 2. Índice da documentação

| Arquivo | Conteúdo |
| --- | --- |
| [`brandbook.html`](brandbook.html) | **Manual da Marca visual** — página única e bonita (abrir no navegador) |
| [`01-cores.md`](01-cores.md) | Paleta oficial (hex + amostra), contraste automático e cor de destaque |
| [`02-tipografia.md`](02-tipografia.md) | Playfair Display · Montserrat · Outfit e a regra do negrito |
| [`03-logo.md`](03-logo.md) | Logo KA (branco/preto) e uso automático por contraste |
| [`04-formato-e-regras.md`](04-formato-e-regras.md) | Formato, cabeçalho, rodapé, texturas e regras de composição |
| [`05-cards.md`](05-cards.md) | Os 7 cards/templates do sistema KA (com miniaturas) |
| [`06-arquivos-no-codigo.md`](06-arquivos-no-codigo.md) | Onde cada coisa vive no código do app |
| [`07-site.md`](07-site.md) | **Padrão do site** kellyalbert.com.br (cores, botões, seções) |

> 📖 **Brandbook visual:** abra [`brandbook.html`](brandbook.html) no navegador
> (é um arquivo único, com as fontes e imagens embutidas — funciona offline e dá
> para imprimir/salvar em PDF). Reúne capa, essência, cores, tipografia, logo,
> regras e a galeria dos 7 cards numa página só.
>
> 🖼️ **Gerar os cards de verdade:** o brandbook *descreve*; para **reproduzir**
> os cards KA (PNG idêntico ao app) num chat novo, use o kit
> [`sistema-visual/`](sistema-visual/SISTEMA-VISUAL-KA.md) — você escreve um JSON
> de slides e roda o gerador (fontes reais + medidas exatas do app).

---

## 3. Cola de bolso

- **Cores da marca (6):** Cream `#E7E0CD` · Bege Quente `#C2AA8A` · Cobre
  `#8B5A2B` · Caramelo `#C47830` · Azul Essência `#3D6B7E` · Marinho `#152535`.
- **Tipografia:** títulos **Playfair Display**, corpo **Montserrat**, feedback
  **Outfit** (fontes variáveis, auto-hospedadas).
- **Destaque:** `"aspas"` / `*asteriscos*` → **negrito peso 900 na MESMA cor do
  texto** (o negrito não muda a cor). Nunca itálico.
- **Cor de realce** (número do card Passo): **Caramelo** `#C47830` (com
  fallback automático quando não contrasta).
- **Formato:** Feed 4:5 (1080×1350), padding 80px, conteúdo centralizado.
- **Cabeçalho:** `KA | Inteligência para Marcas · Branding · Posicionamento · IA`.
- **Rodapé:** `KELLY ALBERT` (espaçado, discreto).
- **Onde criar:** Estúdio → cliente **KA** → carrossel. Rota pública: `/ver/ka`.
- **Site (kellyalbert.com.br):** realce **Dourado** `#B89B6A` (botão) + **Azul
  Essência** `#3D6B7E` (links); fundo bege com grade 32px; botões em pílula.
  Detalhes em [`07-site.md`](07-site.md). Código: repo `kellyalbert-site`.

---

## 4. Como manter

O que vai para o Instagram é gerado no **Estúdio** (o app), a partir do código
em `src/templates/ka/`. Ao mudar um layout no código, atualize o arquivo
correspondente aqui.

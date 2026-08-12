# Conecta · Núcleo de Negócios ACIGRA — Repositório de Layouts

> Fonte de verdade dos **layouts visuais do Conecta** dentro do Sistema Visual
> de Publicações da Marca (KA). Reúne tudo: marca, cores, tipografia, símbolo,
> todos os cards (com medidas e regras) e as capas de destaque do Instagram.
>
> Última atualização: agosto/2026.

---

## 1. O que é o Conecta

**Conecta · Núcleo de Negócios ACIGRA** é o núcleo de negócios da **ACIGRA**
(Associação Comercial, Industrial e de Serviços de Gravataí/RS). É um grupo de
networking empresarial: encontros quinzenais, palestras, conexões 1:1 entre
empresários, troca de conhecimento e oportunidades.

- **Essência:** conexão com propósito; crescimento com consistência.
- **Valores:** Conexão · Colaboração · Desenvolvimento · Confiança · Propósito.
- **Diferencial:** desenvolvimento "no CNPJ e no CPF" (a empresa e a pessoa).
- **Tom:** editorial, sóbrio, profissional. **Sem emoji.** Sem travessão (—)
  em texto corrido de marca; usar "·" ou ":".
- **Exclusividade:** as vagas abrem duas vezes por ano.

O Conecta é o **3º cliente** do app da KA (depois de Shapes e KA). Aparece no
Estúdio junto das outras marcas — mesma engine de templates.

---

## 2. Índice da documentação

| Arquivo | Conteúdo |
| --- | --- |
| [`01-cores.md`](01-cores.md) | Paleta oficial, hex exatos, gradientes, regra de contraste e de fundo |
| [`02-tipografia.md`](02-tipografia.md) | Fonte Sora, pesos, a regra da palavra-chave em turquesa |
| [`03-simbolo-logo.md`](03-simbolo-logo.md) | Símbolo (espiral C), wordmark, variantes e uso |
| [`04-formatos-e-controles.md`](04-formatos-e-controles.md) | Formatos de exportação e os controles comuns a todos os cards |
| [`05-cards.md`](05-cards.md) | Os 10 cards/templates com campos, medidas e comportamento |
| [`06-capas-destaques.md`](06-capas-destaques.md) | Capas de destaque do Instagram (direções + as 3 escolhidas) |
| [`07-arquivos-no-codigo.md`](07-arquivos-no-codigo.md) | Onde cada coisa vive no código do app |

---

## 3. Resumo rápido (cola de bolso)

- **Cores:** Navy `#1B2A4A` · Turquesa `#00CEC9` (acento único) · Warm `#FAF9F7`.
- **Fonte:** **Sora** (variável, auto-hospedada). Título em peso leve; palavra-
  chave entre `"aspas"`/`*asteriscos*` vira **negrito turquesa**.
- **Turquesa nunca é fundo inteiro** — só acento (tags, keyword, linhas, número).
- **Símbolo:** espiral "C" (arquivos em `public/clientes/conecta/`).
- **Formatos:** Feed 4:5 (1080×1350), Story 9:16 (1080×1920), Quadrado 1:1
  (1080×1080), Apresentação 16:9 (1920×1080).
- **10 cards:** Capa · Conteúdo · Lista · Card com foto · Encontro 1:1 ·
  Calendário · Conteúdo educativo · Frase de virada · CTA · Feedback.
- **Cada texto** tem controle de **tamanho** (60–160%) e **cor** (Automático +
  paleta) independentes.
- **Onde criar:** Estúdio → cliente **Conecta** → escolher o card. Rota pública
  da marca: `/ver/conecta`.

---

## 4. Como usar / manter

Este repositório é **documentação** — o que vai para o Instagram é gerado no
**Estúdio** (o app), a partir do mesmo código descrito aqui. Ao mudar um layout
no código (`src/templates/conecta/`), atualize o arquivo correspondente aqui.

Deliverables prontos (as 3 capas de destaque escolhidas) estão em
[`capas-destaques/`](capas-destaques/).

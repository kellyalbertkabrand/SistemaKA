# Sistema Visual KA — gerador dos cards de carrossel

> **Para a IA (Claude), num chat novo:** este é o kit que reproduz os **cards da
> KA** exatamente na identidade atual. Não é uma descrição — é um **gerador**.
> Quando a Kelly pedir um card ou um carrossel KA, você **escreve um JSON** de
> slides e **roda o gerador**; o PNG sai idêntico ao app, porque está rodando o
> mesmo template (mesmas medidas de `src/templates/ka/ka.css`, mesma paleta de
> `cores.ts`, mesma regra de destaque).

## Por que isso reproduz 100% (e uma descrição não)

Reprodução fiel precisa de três coisas juntas — e este kit tem as três:

1. **Fontes reais** — Playfair, Montserrat e Outfit (variáveis) lidas de
   `public/clientes/ka/fonts/` e **embutidas** no HTML gerado.
2. **Medidas exatas** — o CSS em `gerar.py` é um espelho de `ka.css` (tamanhos,
   pesos, espaçamentos, cores dos boxes).
3. **As regras da marca** — contraste YIQ, cor de destaque, e o destaque por
   aspas/asteriscos → **negrito peso 900 na mesma cor do texto**.

> Fonte de verdade final = o código do app (`src/templates/ka/`). Este gerador o
> espelha. Se um dia o app mudar uma medida, atualize `gerar.py` junto.

---

## Início rápido (3 passos)

```bash
cd estudio-marca-ka/docs/ka/sistema-visual

# 1. (só na 1ª vez do ambiente) instalar o renderizador headless
npm install playwright-core        # o Chromium já existe no ambiente Claude Code

# 2. escrever o carrossel e gerar o HTML
python3 gerar.py meu-carrossel.json    # veja exemplo.json como modelo

# 3. rasterizar em PNG 1080×1350 (2×, alta resolução)
node render.cjs                        # PNGs saem em out/
```

Saída: `out/01-....png`, `out/02-....png`, … (um por slide). É só entregar.

> Se o `render.cjs` não achar o Chromium sozinho, aponte com
> `CHROME_PATH=/opt/pw-browsers/chromium-*/chrome-linux/chrome node render.cjs`.
> Em outro ambiente: `npx playwright install chromium` uma vez.

---

## Os 7 tipos de card (campos do JSON)

O arquivo é `{ "slides": [ {…}, {…} ] }` (ou só uma lista `[…]`). Campos comuns
a todos: `cor_fundo` (valor da paleta, abaixo) e `cor_fonte` (`"auto"` = contraste,
ou uma cor da paleta). **Destaque:** use `"aspas"` ou `*asteriscos*` em qualquer
texto → vira negrito na mesma cor. **Nunca** use itálico nem travessão (—).

| `tipo` | Campos | O que é |
| --- | --- | --- |
| `capa` | `titulo` | Abertura, título grande em Playfair (106px). |
| `texto` | `titulo` (opc.), `texto` | Desenvolvimento: título + corpo. |
| `passo` | `numero`, `texto` | Passo numerado (número em caramelo). |
| `midia` | `texto`, `proporcao` (`9:16`/`16:9`/`1:1`), `midia` (opc.: caminho/URL de imagem) | Notícia/análise; sem `midia` mostra a moldura da área. |
| `comentario` | `texto` (opc.), `usuario`, `fala` | Print de comentário (box branco). |
| `cta` | `frase`, `produto`, `botao` | **Card 10** — fecha o carrossel (pill caramelo). |
| `feedback` | `nome`, `sub` (opc.), `depoimento`, `estrelas` (1–5), `rotulo` (opc.), `avatar` (opc., 1 letra) | Review estilo Google (fonte Outfit, sem cabeçalho-fita). |

Exemplo mínimo de um slide:

```json
{ "tipo": "capa", "cor_fundo": "marinho",
  "titulo": "Sua marca é o que as pessoas \"sentem\"\nquando você não está na sala." }
```

Veja **`exemplo.json`** para um carrossel completo de 10 slides.

---

## Paleta (valores de `cor_fundo` / `cor_fonte`)

**Oficiais:** `cream` `#E7E0CD` · `bege-quente` `#C2AA8A` · `cobre` `#8B5A2B` ·
`caramelo` `#C47830` · `essencia` `#3D6B7E` · `marinho` `#152535`.
**Extras:** `papel` `#F8F7F2` · `bege-leve` `#F7F3EA` · `bege-papel` `#E8E4DB` ·
`dourado-claro` `#D4C49E` · `mostarda` `#E0B880` · `dourado` `#B89B6A` ·
`preto` `#0F1923`.

- **Cor do texto** padrão = automática por contraste (claro em fundo escuro,
  Marinho em fundo claro). Para fixar, passe `cor_fonte` com um valor da paleta.
- **Alternar fundos** ao montar o carrossel dá ritmo (claro/escuro).
- Card 10 = sempre `cta` (fundo bege/`papel`).

---

## Regras da marca (não quebrar)

- Destaque só por **negrito** (aspas/asteriscos), **na mesma cor** do texto.
- **Nunca itálico**, **nunca travessão (—)** — use "·" ou ":".
- Formato travado: **Feed 4:5, 1080×1350**, padding 80px, conteúdo centralizado.
- Cabeçalho fixo: `KA | Inteligência para Marcas · Branding · Posicionamento · IA`.
- Rodapé fixo: `Kelly Albert`.
- Tom de voz (frases-âncora): *"Essência sem direção se dispersa. Direção sem
  essência se esvazia."* · "Sua marca tem Potência. Vamos revelar." Ver o
  `KA-Identidade-Visual-Completa.md` (repo `kellyalbert-site`) para o tom completo.

---

## Arquivos deste kit

```
sistema-visual/
├── SISTEMA-VISUAL-KA.md   (este guia)
├── gerar.py               (JSON → HTML com fontes embutidas; espelha ka.css)
├── render.cjs             (HTML → PNG 1080×1350 @2× via Chromium)
├── exemplo.json           (carrossel completo de referência)
└── (gerados) html/ · out/ · manifest.json   ← não versionados
```

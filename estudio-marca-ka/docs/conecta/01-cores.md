# Conecta — Cores

> Definido em código: `src/templates/conecta/cores.ts`.
> Paleta: Navy dominante, Turquesa como **acento único**, fundo Warm (nunca
> branco puro). Turquesa **nunca** é fundo inteiro.

## 1. Cores principais

| Papel | Nome | Hex |
| --- | --- | --- |
| Acento único (tags, keyword, linhas, número) | **Turquesa** | `#00CEC9` |
| Texto dominante / base dos gradientes | **Navy** | `#1B2A4A` |
| Fundo claro (warm, nunca `#FFFFFF`) | **Warm** | `#FAF9F7` |

## 2. Auxiliares

| Nome | Hex | Uso |
| --- | --- | --- |
| Navy escuro (Dark) | `#0F1B33` | base de gradiente / fundo escuro |
| Navy quase preto (Darker) | `#0A1222` | topo dos gradientes / fundo do card |
| Cinza apoio (escuro) | `#8395A7` | texto de apoio sobre fundo escuro |
| Cinza apoio (claro) | `#636E72` | texto de apoio sobre fundo claro |
| Off-white | `#C8D6E5` | texto secundário sobre fundo escuro |
| Turquesa vivo | `#2FE0D2` | realce em fundo escuro (variação) |
| Branco | `#FFFFFF` | logo/texto sobre fundo escuro |

## 3. Gradientes oficiais

- **Navy (gradiente):** `linear-gradient(170deg, #0A1222 0%, #0F1B33 40%, #1B2A4A 100%)`
- **Navy CTA (radial):** `radial-gradient(ellipse at 50% 40%, #243656 0%, #0F1B33 50%, #0A1222 100%)`
  — usado no card de fechamento (CTA).

## 4. Paleta estendida (fundo E texto)

Escolhível tanto no **fundo do card** quanto na **cor de cada texto**
(`PALETA_EXT` / `COLORS_CONECTA`). São as cores da marca + neutros:

| Chave | Rótulo | Hex |
| --- | --- | --- |
| `branco` | Branco | `#FFFFFF` |
| `teal` | Verde-azulado | `#1C9E8C` |
| `turquesaVivo` | Turquesa vivo | `#2FE0D2` |
| `aco` | Azul-aço | `#73839E` |
| `marinhoProfundo` | Marinho profundo | `#16294A` |
| `ardosia` | Ardósia | `#52627E` |
| `gelo` | Azul-gelo | `#DBE4EC` |
| `quaseBranco` | Quase branco | `#EDF1F7` |

## 5. Opções de FUNDO do card

Oferecidas no editor (`FUNDOS_CONECTA`): os dois gradientes-assinatura + warm +
as 8 cores sólidas da paleta acima.

- `navy` → Navy (gradiente) · **padrão** da maioria dos cards
- `cta` → Navy CTA (radial) · padrão do card CTA
- `warm` → Warm (claro)
- + as 8 sólidas de `PALETA_EXT`

**Regra de feed:** alternar — **nunca 2 cards navy seguidos**. Turquesa nunca é
fundo inteiro (só acento).

## 6. Regras automáticas de contraste (YIQ)

Funções em `cores.ts` decidem as cores derivadas conforme o fundo:

- `ehFundoEscuro(fundo)` — `navy`/`cta` = escuro; sólidos por luminância
  (YIQ < 150 = escuro).
- `corTitulo(fundo)` — **branco** no escuro, **navy** no claro.
- `corApoio(fundo)` — cinza `#8395A7` no escuro, `#636E72` no claro.
- `corAcento()` — **sempre** turquesa `#00CEC9`.
- **Cor de cada texto** pode ser "Automático" (segue o contraste) **ou** fixa
  (qualquer cor da paleta) — controle por texto em cada card.

# Conecta — Capas de Destaque do Instagram

> Capas para os "destaques" (highlights) do perfil. O Instagram mostra cada
> destaque como um **círculo pequeno** — por isso o elemento fica sempre
> **centralizado**, na zona segura do corte. Formato de arte: **1080 × 1920**
> (story), símbolo no centro.

## Direções propostas (genéricas, sem nome)

Como os destaques ainda não estão nomeados/organizados, as capas são **neutras**
(sem topo escrito), reutilizáveis em qualquer destaque:

1. **Símbolo nos fundos da marca** *(base recomendada)* — símbolo centralizado,
   variando só o fundo (navy, turquesa, claro, aço).
2. **Minimalista** — um elemento pequeno no centro (símbolo reduzido, ponto ou
   anel turquesa).
3. **Numeradas (01–06)** — símbolo pequeno + número em Sora; organiza pela ordem.
4. **Com padrões** — símbolo sobre texturas geométricas discretas em turquesa
   (grade, pontos, diagonais, ondas).
5. **Cores sólidas** — círculos de cor cheia da paleta, sem símbolo (capa coringa).

## Escolhidas pela KA (entregues)

Três capas da direção 1, prontas em `capas-destaques/`:

| Arquivo | Fundo | Símbolo |
| --- | --- | --- |
| `capa-conecta-navy-turquesa.png` | Navy (gradiente) | Turquesa |
| `capa-conecta-turquesa.png` | Turquesa (gradiente) | Navy |
| `capa-conecta-claro.png` | Warm (claro) | Navy |

Todas 1080 × 1920, símbolo centralizado (≈460 px) na zona do círculo.

### Como subir no Instagram
Criar/editar um destaque → **Editar capa** → escolher a imagem da galeria → o
símbolo já fica centralizado → confirmar. Dá para usar uma cor só (uniforme) ou
alternar as três para dar ritmo de cor na fileira.

## Como regenerar / criar novas

As capas foram compostas a partir do **símbolo oficial** recolorido sobre os
gradientes da marca (mesmos gradientes do §3 de [`01-cores.md`](01-cores.md)):

- Navy: `radial-gradient(120% 120% at 50% 30%, #21335A, #16233F 46%, #0F1B33)`
- Turquesa: `radial-gradient(120% 120% at 50% 32%, #37E3D6, #00CEC9 52%, #05B3AE)`
- Warm: `radial-gradient(120% 120% at 50% 30%, #FFFFFF, #FAF9F7 55%, #EEF0EE)`

Símbolo: `public/clientes/conecta/conecta-simbolo{,-branco,-marinho}.png`.
Para outras variações (navy escuro, aço, com padrão, numeradas), reaproveitar as
direções acima.

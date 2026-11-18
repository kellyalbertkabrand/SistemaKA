# Retrospectiva Conecta 2026 — vídeo horizontal (fontes e estilo de edição)

Pasta de apoio para **continuar/refazer** o vídeo de retrospectiva horizontal do Conecta
em um novo chat. O vídeo final está em `../Retrospectiva_Conecta_2026.mp4` e a capa em
`../Capa_Retrospectiva_Conecta_2026.jpg`.

## Formato e identidade
- **1920×1080 (horizontal)**, 30 fps, sem áudio (montagem muda).
- **Fundo da marca:** azul-marinho com brilho teal (`bg_navy_teal.png`;
  gerado por `scripts/card_build.py` → `make_bg()`). Usado em TODO o vídeo.
- **Cor de destaque:** teal `#00CEC9`.
- **Fontes:** Sora (`fonts/`): ExtraBold para números/títulos, SemiBold para
  subtítulos/kickers, Regular para listas.
- **Logo do Conecta:** símbolo + "CONECTA" (ver `../../logos/conecta_e_parceiros/` e
  `../../logos/Logo Conecta (branco).png`).

## Estrutura do vídeo
1. **Abertura animada** (`anim_intro.mp4`): logo do Conecta se formando com brilho →
   "RETROSPECTIVA · CONECTA · 2026".
2. **Cards de seção (telas azuis)** — regra: **cada card fica no mínimo 6 s na tela**.
   - Título: número em teal (ExtraBold) + título em branco (ExtraBold) + traço teal.
   - Cards de informação (listas): itens em branco centralizados, traço teal no topo.
   - Todos os 17 cards estão prontos em `cards/` e são gerados por `scripts/gencards.py`.
   - Seções: Atividades 2026, 01 Reuniões de Alinhamento (lista Trilha Comunicar/
     Conectar/Capacitar/Coordenação/Reunião Geral, **sem datas**), 02 Visitas 1:1,
     03 Visitas Técnicas (9 realizadas), 04 Pitch Livro · 25 títulos, 05 Divulgação do
     Livro (+ Kelly Albert), 06 Exercício de Pitch Filmado, 07 Eventos Externos
     (Painel da Mulher… / Mercopar…), 08 CEO de Si Mesmo, 09 Capacitações Internas
     (+ lista), 10 Sensibilização, 29 Pitch de Trajetória (29 participantes · 29 histórias).
3. **Conteúdo entre os cards:** vídeos verticais colocados **lado a lado, estourados**
   (cover-crop preenchendo a tela — 2 ou 3 por tela); fotos em mosaico; imagens do livro
   clareadas lado a lado.
4. **Frase de fechamento** (`anim_phrase.mp4`): "2026 foi feito de conexões que viraram
   histórias." entra, segura.
5. **Encerramento animado** (`anim_outro.mp4`): logo do Conecta em movimento + 2026.

## Técnicas usadas (ffmpeg)
- Vídeo vertical → painel: `scale=<L>:-1,crop=<L>:1080` (cover-crop) + `hstack`.
- Recompor fundo escuro de origem no navy+teal: `blend=all_mode=lighten` sobre o fundo,
  com `curves` suave antes para matar vazamento de cor quente.
- Clareada geral dos trechos escuros: `eq=gamma=1.12:brightness=0.02:contrast=1.02`.
- Montagem por segmentos + `concat` (demuxer). Render pesado: fatiar em partes para
  não estourar memória.

## Scripts (em `scripts/`)
- `gencards.py` — gera os 17 cards de seção (navy+teal, texto/estilo oficiais).
- `anim.py` — gera abertura animada, frase e encerramento animado.
- `card_build.py` — fundo navy+teal + card/capa RETROSPECTIVA CONECTA 2026.
- `capa_horiz.py` — capa horizontal.
> Os caminhos nos scripts apontam para o scratchpad da sessão antiga; ajustar os paths
> (fontes/logo) ao reusar.

## Outro vídeo (referência, vertical)
"Conecta · Nova Diretoria 2027" foi feito em **vertical (1080×1920)** com letterings
estilo Inter (título em caixa alta + legenda em minúscula). Estilo diferente deste
(retrospectiva horizontal).

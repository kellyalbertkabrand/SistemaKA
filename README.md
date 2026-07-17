# SistemaKA · Radar de Branding & IA

Sistema que **todos os dias** busca notícias e artigos acadêmicos — no **Brasil e
no mundo**, em **português e inglês** — sobre **branding, branding com IA,
campanhas/ideias, posicionamento e reposicionamento de marca, semiótica e
neuromarketing**. Para cada item ele guarda o **link exato da fonte** e gera um
**resumo curto da essência em português** (com IA, quando configurada), além de um
**gancho de conteúdo** pensado para o trabalho da Kelly. Tudo vira um **painel web**
atualizado automaticamente, com **resumo diário e mensal**.

Além disso, o sistema monta um **post pronto do dia** — legenda (e, com a chave da
OpenAI configurada, também a imagem) prontos para revisar e publicar. Veja a seção
[Post pronto do dia](#post-pronto-do-dia) abaixo.

---

## Como funciona (visão geral)

```
GitHub Actions (todo dia)  ──►  python -m sistemaka run
        │                         ├─ coleta (Google News PT/EN, RSS, Crossref, arXiv)
        │                         ├─ deduplica e ranqueia por relevância
        │                         ├─ resume a essência em PT (Claude, se houver chave)
        │                         ├─ salva o histórico em /data
        │                         └─ gera o painel em /public
        └──────────────────────►  publica no GitHub Pages (site)
```

O painel tem um botão **“↻ Atualizar agora”**: ele abre o GitHub Actions, onde um
clique em **“Run workflow”** dispara uma coleta na hora (o painel atualiza em ~2 min).
A página é estática (sem servidor), por isso quem busca as notícias é o robô do
GitHub Actions — não o navegador.

---

## Ativação (passo a passo, uma vez só)

> A coleta automática **diária** só dispara a partir do **branch padrão** do
> repositório. Depois de revisar, mescle este branch no `main` (ou defina-o como
> padrão) para o agendamento valer.

1. **Habilitar o GitHub Pages**
   `Settings → Pages → Build and deployment → Source: GitHub Actions`.

2. **(Opcional, recomendado) Ligar os resumos com IA**
   `Settings → Secrets and variables → Actions → New repository secret`
   - Name: `ANTHROPIC_API_KEY`
   - Secret: sua chave da Anthropic (veja abaixo como obter).

3. **Rodar a primeira coleta**
   `Actions → “Coleta diária (SistemaKA)” → Run workflow`.
   Ao terminar, o link do painel aparece no resumo da execução (e em `Settings → Pages`).

### Como obter a chave da Claude (Anthropic)

1. Acesse **https://console.anthropic.com** e crie sua conta.
2. Adicione um meio de pagamento e alguns créditos em **Billing** (o uso diário
   deste sistema é baixíssimo — poucos centavos por dia com o modelo Haiku).
3. Vá em **API Keys → Create Key**, dê um nome (ex.: `sistemaka`) e **copie a chave**
   (ela começa com `sk-ant-...` e só aparece uma vez).
4. Cole essa chave no segredo `ANTHROPIC_API_KEY` (passo 2 acima).

Sem a chave o sistema continua funcionando: ele mostra o trecho original da fonte
em vez do resumo sintetizado.

---

## Post pronto do dia

A cada execução, o sistema também monta o **post pronto do dia**: uma legenda (e,
se a chave da OpenAI estiver configurada, também uma imagem) prontas para revisar
e publicar. Aparece como um card **"📝 Post pronto de hoje"** no topo do painel,
com um botão para copiar a legenda.

- **Fonte do texto**, alternando por data (sem repetir sempre a mesma coisa):
  - em **dias pares**: baseado nas notícias do dia (o mesmo material do Boletim);
  - em **dias ímpares**: baseado num **Caso de Virada** (`config/casos.yaml`).
- **Imagem**: gerada com a API de imagem da OpenAI (`gpt-image-1`), sempre uma
  ilustração editorial/abstrata — nunca reproduz logotipos ou rostos reais.
- **Não fica salvo no repositório** (nem a legenda, nem a imagem): é gerado a cada
  execução do workflow, publicado junto do painel no Netlify, e some assim que o
  próximo dia é gerado. Sem chave de IA, a legenda sai num formato simples (sem
  síntese); sem chave da OpenAI, o post fica só com a legenda (sem imagem).

### Como obter a chave da OpenAI (para a imagem)

1. Acesse **https://platform.openai.com** e crie sua conta.
2. Adicione um meio de pagamento e alguns créditos em **Billing** (cada imagem
   custa poucos centavos).
3. Vá em **API Keys → Create new secret key**, dê um nome (ex.: `sistemaka`) e
   **copie a chave** (começa com `sk-...` e só aparece uma vez).
4. Cole essa chave em `Settings → Secrets and variables → Actions → New repository
   secret`, com o nome `OPENAI_API_KEY`.

Sem essa chave, o post continua sendo gerado — só que sem imagem.

---

## Rodar localmente (opcional)

```bash
pip install -r requirements.txt

python -m sistemaka run     # coleta de verdade (precisa de internet) + gera o site
python -m sistemaka build   # só reconstrói o site a partir do histórico em /data
python -m sistemaka demo    # cria dados de exemplo e gera o site (sem internet)
```

Depois abra `public/index.html` no navegador.

Variáveis de ambiente úteis:

| Variável            | Função                                                        |
|---------------------|---------------------------------------------------------------|
| `ANTHROPIC_API_KEY`  | Liga os resumos e a legenda do post com IA.                    |
| `SISTEMAKA_MODEL`    | Modelo da Claude (padrão: `claude-haiku-4-5-20251001`).        |
| `OPENAI_API_KEY`     | Liga a geração de imagem do post pronto do dia.                |
| `SISTEMAKA_IMAGE_MODEL` | Modelo de imagem da OpenAI (padrão: `gpt-image-1`).         |
| `SISTEMAKA_REPO`     | `owner/repo` para o botão “Atualizar agora”.                   |
| `SISTEMAKA_TITLE`    | Título exibido no topo do painel.                             |

---

## Personalizar as fontes

Tudo o que o sistema busca está em **`config/sources.yaml`** — sem precisar mexer no
código. Você pode:

- adicionar/remover **temas** do Google News (`google_news_topics`);
- incluir **feeds RSS** de publicações que você acompanha (`rss_feeds`);
- ajustar buscas **acadêmicas** (`academic`);
- afinar as **palavras-chave** de relevância (`keywords`);
- mudar a **janela de dias** e o **máximo de itens por dia**.

---

## Estrutura do projeto

```
config/sources.yaml      # o que buscar (você edita aqui)
config/casos.yaml        # biblioteca de "Casos de Virada" (você edita aqui)
sistemaka/
  fetch.py               # coleta (Google News, RSS, Crossref, arXiv)
  relevance.py           # deduplicação + ranqueamento
  summarize.py           # resumo/tradução em PT (IA) + resumo mensal + boletim
  content.py             # post pronto do dia: legenda (IA) + imagem (OpenAI)
  store.py               # histórico em /data/items/AAAA-MM-DD.json
  site.py                # geração do painel (HTML/CSS) + do post pronto
  templates/             # layout do painel
  pipeline.py            # orquestra tudo
data/items/               # memória do sistema (versionada)
public/                   # painel gerado (publicado no Pages/Netlify)
public/posts/AAAA-MM-DD/  # post pronto do dia (gerado a cada execução, não versionado)
.github/workflows/daily.yml
```

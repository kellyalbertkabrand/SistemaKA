# SistemaKA · Radar de Branding & IA

Sistema que **todos os dias** busca notícias e artigos acadêmicos — no **Brasil e
no mundo**, em **português e inglês** — sobre **branding, branding com IA,
campanhas/ideias, posicionamento e reposicionamento de marca, semiótica e
neuromarketing**. Para cada item ele guarda o **link exato da fonte** e gera um
**resumo curto da essência em português** (com IA, quando configurada), além de um
**gancho de conteúdo** pensado para o trabalho da Kelly. Tudo vira um **painel web**
atualizado automaticamente, com **resumo diário e mensal**.

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
| `ANTHROPIC_API_KEY` | Liga os resumos com IA.                                        |
| `SISTEMAKA_MODEL`   | Modelo da Claude (padrão: `claude-haiku-4-5-20251001`).        |
| `SISTEMAKA_REPO`    | `owner/repo` para o botão “Atualizar agora”.                   |
| `SISTEMAKA_TITLE`   | Título exibido no topo do painel.                             |

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
sistemaka/
  fetch.py               # coleta (Google News, RSS, Crossref, arXiv)
  relevance.py           # deduplicação + ranqueamento
  summarize.py           # resumo/tradução em PT (IA) + resumo mensal
  store.py               # histórico em /data/items/AAAA-MM-DD.json
  site.py                # geração do painel (HTML/CSS)
  templates/             # layout do painel
  pipeline.py            # orquestra tudo
data/items/              # memória do sistema (versionada)
public/                  # painel gerado (publicado no Pages)
.github/workflows/daily.yml
```

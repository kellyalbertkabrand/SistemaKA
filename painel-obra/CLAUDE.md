# CLAUDE.md — Continuidade do projeto "Painel de Controle de Obras"

> Documento de handoff. Se você é uma nova sessão do Claude Code, **leia isto
> primeiro**. Ele explica o que é o projeto, onde está, como desenvolver,
> publicar e continuar. Todo o produto vive na subpasta **`painel-obra/`**.

---

## 1. Contexto e objetivo

Plataforma web de **gestão e acompanhamento de obra** para o escritório
**Schramm Arquitetura e Engenharia** (cliente da agência **KA | Inteligência
para Marcas**). É um **piloto** que já está no ar e serve de prova comercial.

Duas áreas:
- **Painel interno (Escritório, com login Supabase):** várias obras, KPIs
  (orçado/executado/saldo/pago/pendente), etapas, lançamentos, edição de
  orçamento, e **lançamento por voz com IA**.
- **Painel do cliente (`/obra/{slug}`, só leitura, link público):** o cliente
  acompanha a obra com a marca do escritório, sem ver nada interno.

Idioma do produto e dos commits: **português (pt-BR)**.

---

## 2. Onde está tudo

| Item | Valor |
|---|---|
| Repositório | `kellyalbertkabrand/SistemaKA` |
| Branch de trabalho | `claude/painel-obra-pilot-neqkp0` |
| Subpasta do produto | `painel-obra/` |
| Site no ar (Netlify) | `https://piloto-schramm-obra.netlify.app` |
| Projeto Netlify | `piloto-schramm-obra` (time `kellyalbertka`) |
| Base directory no Netlify | `painel-obra` |
| Banco (Supabase) | projeto `piloto-schramm`, org `KA Pilotos`, região São Paulo |
| E-mail "laboratório" | `ferramentaska@gmail.com` (Supabase) |
| Modelo de IA | `claude-haiku-4-5` (Anthropic) |

> ⚠️ Existe **outro projeto** no mesmo repositório (um agregador de notícias em
> Python, na branch `claude/branding-ai-news-aggregator-pY5az` e na raiz). **NÃO
> misture.** Trabalhe apenas dentro de `painel-obra/` nesta branch.

---

## 3. Stack e estrutura

- Front-end: **HTML + CSS + JS** com **Vite** (sem framework).
- IA: **Netlify Function** (`.mjs`) que chama a API da Anthropic (chave secreta
  só no servidor).
- Banco/login: **Supabase** (PostgreSQL + Auth) com **Row Level Security**.
- Voz: **Web Speech API** (pt-BR), contínua e acumulativa.

```
painel-obra/
├─ index.html
├─ netlify.toml                     # build: npm run build; publish: dist; functions
├─ .env.example
├─ PROJETO.md                       # documentação (engenharia reversa)
├─ supabase/schema.sql              # tabelas + RLS (rodar no SQL Editor)
├─ netlify/functions/
│  └─ interpretar-lancamento.mjs    # voz/texto -> Anthropic -> JSON {etapa,descricao,valor,status}
└─ src/
   ├─ main.js                       # roteador SPA (login / obras / /painel/:id / /obra/:slug)
   ├─ supabaseClient.js             # cria o client se as env VITE_* existirem
   ├─ styles.css                    # visual + marca (terracota #c65a2e)
   ├─ lib/
   │  ├─ format.js                  # moeda, dataBR, pct, slugify, esc, pillStatus
   │  ├─ voice.js                   # ouvir()/parar() — reconhecimento contínuo acumulativo
   │  ├─ ordenar.js                 # ordenarLancamentos() + seletorOrdem() (data/etapa/status)
   │  └─ marca.js                   # caixaLogo() (placeholder "LOGOTIPO"), logoPlaceholder()
   └─ views/
      ├─ login.js                   # tela de acesso (caixaLogo + "Painel de Controle de Obras")
      ├─ obras.js                   # lista de obras + cadastro
      ├─ obra.js                    # detalhe: KPIs, editar obra, lançamento por voz/IA, etapas, lançamentos
      └─ publica.js                 # painel do cliente (cabeçalho do logo separado + resumo + etapas + atualizações + rodapé)
```

---

## 4. Banco de dados (Supabase)

Tabelas: **obras** (nome, cliente, slug, orcamento, publicado, user_id),
**etapas** (obra_id, nome, orcado), **lancamentos** (obra_id, etapa, descricao,
valor, status 'pago'|'pendente', data). Script completo em
`supabase/schema.sql`.

RLS: o escritório logado só acessa as próprias obras (`user_id = auth.uid()`);
o público (anon) só faz SELECT de obras com `publicado = true` (e suas etapas /
lançamentos). Ao criar tabelas novas, **sempre** manter esse padrão de RLS.

Regra de negócio importante: **Saldo = orçamento − (pago + pendente)**. O
"executado" soma pago + pendente. O pendente **reduz** o saldo.

---

## 5. Variáveis de ambiente

No Netlify (Site settings → Environment variables) e em `.env` local:
- `VITE_SUPABASE_URL` — pública
- `VITE_SUPABASE_ANON_KEY` — pública (protegida por RLS)
- `ANTHROPIC_API_KEY` — **secreta**, usada só na Netlify Function

O front só usa variáveis com prefixo `VITE_`. Nunca exponha a chave da Anthropic
no front.

---

## 6. Como desenvolver, buildar e publicar

```bash
# dentro de painel-obra/
npm install
npm run build          # gera dist/ (Vite)
# dev do front apenas:
npm run dev
# dev com as Netlify Functions (necessário p/ testar a voz/IA localmente):
netlify dev
```

**Publicação = git push.** O Netlify está ligado ao GitHub: todo push na branch
`claude/painel-obra-pilot-neqkp0` reconstrói e republica sozinho (~1–2 min).

### ⚠️ Gotcha de git (importante)
Sempre faça `git add` a partir da **raiz do repo** (`/home/user/SistemaKA`),
não de dentro de `painel-obra/`. O diretório de trabalho do shell persiste entre
comandos; se um `cd painel-obra` anterior deixou o cwd lá, `git add painel-obra/src`
falha ("painel-obra/painel-obra"). Volte à raiz antes de `git add`.

### Fluxo de commit usado
Mensagens em português. Rodapé dos commits:
```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```
Build local (`npm run build`) antes de commitar, para validar.

---

## 7. Convenções e cuidados aprendidos

- **UI e textos em pt-BR.** Usar `esc()` ao interpolar dados em innerHTML.
- **Tradução automática do navegador quebra o SQL** no Supabase — orientar a
  desligar antes de colar o `schema.sql`.
- **Supabase free hiberna:** a 1ª requisição após um tempo demora. Por isso
  `main.js` (getSession) e `views/obras.js`/`publica.js` têm **timeout** e
  mensagem de erro, para nunca ficar em tela branca / "Carregando" eterno.
- **Netlify base directory = `painel-obra`** (o produto está em subpasta).
- **Voz:** `voice.js` grava de forma **contínua e acumulativa** (não apaga nas
  pausas). O botão alterna Falar/Parar; só ao Parar envia para a IA.
- **Logo:** ainda é placeholder (`caixaLogo()` mostra "LOGOTIPO" + nome do
  escritório em caixa cinza). Quando chegar o arquivo oficial, trocar por `<img>`
  em `marca.js` (afeta login e painel do cliente de uma vez).

---

## 8. Estado atual (o que já está pronto)

Fase 1 completa e no ar:
- Login (Supabase Auth), lista de obras, cadastro.
- Detalhe da obra: KPIs, editar obra (nome/cliente/orçamento), etapas,
  lançamentos (com sinal verde/vermelho e ordenação por data/tipo/status).
- Lançamento por voz + IA (Netlify Function + Claude Haiku).
- Painel do cliente: cabeçalho do logo (banda própria), resumo (orçamento, pago,
  pendente, saldo), etapas com barras, atualizações ordenáveis, rodapé com
  disclaimer (nome + endereço do escritório).
- Marca Schramm aplicada (terracota), placeholder de logo, tela de login
  formatada conforme pedidos do cliente.

---

## 9. Modelo comercial (decidido com a cliente)

- **Fase 1 (implantação):** R$ 2.900, parcelável em até 3x.
- **Mensalidade:** R$ 390/mês (manutenção + hospedagem + suporte + pequenos
  ajustes).
- **Fases futuras:** descritas na proposta, **sem valores** (sob consulta).

### Roteiro de evolução (próximas fases) — ainda NÃO implementadas
- **Fase 2 — Portal do Cliente:** login/senha do cliente, galeria de **fotos**
  da obra, **arquivos do projeto** (plantas/PDFs/contratos) para download.
  *(Exigirá Supabase Storage; a mensalidade tende a subir por armazenamento.)*
- **Fase 3 — Briefing inteligente:** formulário de briefing; cliente responde
  online; IA organiza/resume.
- **Fase 4 — Aprovações e comentários:** cliente aprova/comenta itens; histórico.
- **Fase 5 — Financeiro e contratos:** propostas/contratos, recebíveis.
- **Fase 6 — Projetos e equipe:** tarefas/cronograma, timesheet, rentabilidade.
- **Fase 7 — IA avançada:** resumo mensal automático, alerta de estouro, diário
  de obra, notificações (e-mail/WhatsApp).
- **Fase 8 — Mobile / marca própria / multi-escritório** (produto replicável KA).

Documentos de apoio já gerados: `PROJETO.md` (técnico) e a proposta comercial
em PDF (fora do repo, entregue à cliente).

---

## 10. Como continuar (para a próxima sessão)

1. Trabalhe só em `painel-obra/` na branch `claude/painel-obra-pilot-neqkp0`.
2. Faça a mudança, rode `npm run build` para validar, e `git add`/commit/push
   **a partir da raiz do repo**. O Netlify publica sozinho.
3. Para features com dados novos (fotos, briefing, etc.), lembre de:
   - criar/ajustar tabelas no Supabase **com RLS** no mesmo padrão;
   - manter chaves secretas apenas em Netlify Functions;
   - preservar os timeouts anti-hibernação.
4. Peça o **logo oficial** para substituir o placeholder quando o cliente enviar.
5. Ao iniciar a Fase 2 (fotos/arquivos), avaliar **Supabase Storage** e ajustar a
   proposta de mensalidade (armazenamento).

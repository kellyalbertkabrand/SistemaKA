# CLAUDE.md — Continuidade do projeto "Painel de Controle de Obras"

> Documento de handoff. Se você é uma nova sessão do Claude Code, **leia isto
> primeiro**. Ele explica o que é o projeto, onde está, como desenvolver,
> publicar e continuar. Repositório: **`kellyalbertkabrand/gestaodeobra`** (o produto fica na raiz).
> Até set/2026 o código vivia em `SistemaKA/painel-obra/` — o histórico veio junto.

---

## 0. ESTADO ATUAL — LEIA ANTES DE TUDO (set/2026)

> As seções mais antigas abaixo (Supabase, roteiro de fases) ficaram
> **desatualizadas**. O que vale hoje é esta seção 0.

### Branches: base + uma por cliente (decisão da Kelly, set/2026)
- **`main`** = produto base. Melhorias do produto nascem aqui.
- **Cada cliente tem a própria branch `cliente/<id>`**, o próprio site no
  Netlify (que publica só dessa branch) e o próprio projeto Firebase (banco
  separado). Levar melhoria a um cliente = `git merge main` na branch dele.
- **Schramm** = `cliente/schramm` (Netlify `piloto-schramm-obra`; push = deploy
  em ~1–2 min).
- A marca de cada cliente fica em `clientes/<id>/` (ver `clientes/README.md`);
  nunca escreva nome/dados de escritório direto no código — use `MARCA` de
  `src/lib/marca.js`.
- Não crie outras branches de trabalho além dessas. (Branches antigas de
  sessões anteriores, como `*-o69lul`, foram descontinuadas.)

### Fluxo de trabalho (o que a cliente espera)
- Regra da cliente (Kelly/Luiza): **"ajuste e já publique"** — as mudanças vão
  direto para produção, sem ficar perguntando a cada passo.
- A cada mudança: `npm run build` (validar) → commit na `main` → `git push` →
  `git merge main` na branch do(s) cliente(s) que deve(m) receber → `git push`.
  Ajuste exclusivo de um cliente: commit direto na `cliente/<id>` dele.
- Para toda feature/ajuste visível ao cliente, **atualize o changelog**
  (`src/lib/changelog.js`): adicione um item e atualize a `VERSAO` (data).
- Rodapé de commit:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

### Banco de dados = FIREBASE (não é mais Supabase)
- Hoje o sistema roda em **Firebase**: **Firestore** (dados) + **Firebase Auth**
  (login da arquiteta). Config em `src/firebase.js`; toda a camada de dados em
  **`src/dados.js`**.
- Coleções: `obras`, `etapas`, `lancamentos`, `pagamentos`, `clientes`,
  `fornecedores`, `convites`, `fotos`, `fotos_bin`, `recibos`, `contratos`,
  `briefings`.
- **Regras do Firestore** ficam em `firestore.rules`, mas são
  **publicadas MANUALMENTE pela usuária** no Console do Firebase (Firestore →
  Regras → Publicar). **Sempre que criar/alterar uma coleção pública, lembre de
  avisar a usuária para republicar as regras.**
- Padrão de regra pública (autopreenchimento por link): criar com token de
  convite válido; ler/editar/excluir só logado. Ver `clientes`, `fornecedores`,
  `briefings` como exemplo.

### Funcionalidades já no ar
- **Painel de obras**: KPIs, etapas, lançamentos (com fornecedor, fotos, NF),
  edição, lançamento por voz/IA. Correção de scroll (a tela não "sobe" ao editar).
- **Financeiro**: parcelas (total = soma), aberto em vermelho claro / pago em
  verde, controle interno do pagamento do projeto (obras com gestão), cards por obra.
- **Clientes**: cadastro pelo escritório + **link público** `/cadastro/{token}`
  (dados de contato e de contrato). WhatsApp.
- **Fornecedores**: lista + **link público** `/cadastro-fornecedor/{token}`.
- **Contratos**: 3 modelos (Projeto e Execução, Projeto, Administração), valor por
  extenso, edição na tela, **salvar** (reabrir/atualizar), vínculo com obra,
  **Salvar e PDF**, imprimir/PDF e **baixar Word**.
- **Briefing** (mais recente): aba interna gera **link público** `/briefing/{token}`;
  o cliente preenche o briefing do projeto e **salva automaticamente** enquanto
  responde (1 briefing por link, doc de id = token, upsert com merge). A arquiteta
  vê as respostas por seção; selo "Em preenchimento"/"Concluído"; **Baixar PDF**
  (arquivo .pdf de verdade via jsPDF) e **Imprimir** (botões separados). Modelo do
  briefing em `src/lib/briefingModelo.js`.

### Estrutura real de código (resumo)
- `src/main.js` — roteador SPA. Rotas públicas (sem login) casam ANTES do login:
  `/obra/{slug}`, `/atualizacoes`, `/cadastro/{token}`, `/cadastro-fornecedor/{token}`,
  `/briefing/{token}`. Rotas internas: `/obras`, `/painel/{id}`, `/financeiro`,
  `/contratos`, `/briefings`, `/clientes`, `/fornecedores`.
- `src/dados.js` — Firestore (todas as funções de dados).
- `src/views/` — telas. `src/lib/` — utilidios (format, nav, marca, changelog,
  contratos, briefingModelo, reembolso [jsPDF], zip, imagem, etc.).
- Padrão de refresh sem "pular" a rolagem: view recebe `opts={}`; se
  `opts.scrollY != null`, re-renderiza sem "Carregando…" e restaura a rolagem.

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
| Repositório | `kellyalbertkabrand/gestaodeobra` |
| Branch base do produto | `main` |
| Branch da Schramm | `cliente/schramm` |
| Site no ar (Netlify) | `https://piloto-schramm-obra.netlify.app` |
| Projeto Netlify | `piloto-schramm-obra` (time `kellyalbertka`) |
| Base directory no Netlify | (vazio — raiz do repo) |
| Banco (Supabase) | projeto `piloto-schramm`, org `KA Pilotos`, região São Paulo |
| E-mail "laboratório" | `ferramentaska@gmail.com` (Supabase) |
| Modelo de IA | `claude-haiku-4-5` (Anthropic) |


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
# na raiz do repositório
npm install
npm run build          # gera dist/ (Vite)
# dev do front apenas:
npm run dev
# dev com as Netlify Functions (necessário p/ testar a voz/IA localmente):
netlify dev
```

**Publicação = git push.** Cada site do Netlify está ligado a uma branch
`cliente/<id>`: todo push nela reconstrói e republica sozinho (~1–2 min).

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
- **Netlify base directory = vazio** (o produto está na raiz do repositório).
- **Voz:** `voice.js` grava de forma **contínua e acumulativa** (não apaga nas
  pausas). O botão alterna Falar/Parar; só ao Parar envia para a IA.
- **Marca / multi-cliente:** tudo o que é do escritório (nome, cores, logo,
  ícones, banco, dados de contrato) fica em `clientes/<id>/`; `VITE_CLIENTE`
  escolhe a pasta (padrão `schramm`). Cada cliente tem **branch própria**
  (`cliente/<id>`), site Netlify próprio e projeto Firebase próprio. Nunca
  escreva nome/dados de um escritório direto no código — use `MARCA` de
  `src/lib/marca.js`. Passo a passo em `clientes/README.md`.

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

1. Melhorias do produto na `main`; depois `git merge main` na `cliente/<id>`
   de cada cliente que deve receber (a Schramm é `cliente/schramm`).
2. Faça a mudança, rode `npm run build` para validar, commit/push. O Netlify
   de cada cliente publica sozinho a partir da branch dele.
3. Para features com dados novos (fotos, briefing, etc.), lembre de:
   - criar/ajustar tabelas no Supabase **com RLS** no mesmo padrão;
   - manter chaves secretas apenas em Netlify Functions;
   - preservar os timeouts anti-hibernação.
4. Peça o **logo oficial** para substituir o placeholder quando o cliente enviar.
5. Ao iniciar a Fase 2 (fotos/arquivos), avaliar **Supabase Storage** e ajustar a
   proposta de mensalidade (armazenamento).

# Painel de Obra — piloto

Plataforma de **gestão e acompanhamento de obra** para um escritório de
arquitetura. Tem duas caras:

- **Painel interno (arquiteta, com login):** gerencia várias obras, lança
  custos e vê tudo — orçado, executado, saldo, pago e pendente. O lançamento
  pode ser **por voz**: a arquiteta fala e a **IA** organiza etapa, valor e
  status sozinha.
- **Página pública do cliente (`/obra/{slug}`, só leitura):** cada obra gera
  um link que a arquiteta compartilha. O cliente acompanha o orçamento em
  tempo real, com visual limpo, sem ver nada interno.

> Ambiente 100% isolado e descartável. Use contas **novas** (Gmail, GitHub,
> Netlify, Supabase, Anthropic) só para o piloto. Nada toca o que já é seu.

## Stack

- **Front-end:** HTML + CSS + JavaScript com **Vite** (sem framework pesado).
- **Banco e login:** **Supabase** (PostgreSQL + Auth), protegido por
  **Row Level Security**.
- **IA da voz:** **Netlify Function** chamando a **API da Anthropic**
  (modelo `claude-haiku-4-5`) com saída estruturada. A chave secreta nunca
  vai para o navegador.
- **Voz:** Web Speech API do navegador (pt-BR), com campo de texto como
  alternativa.

## Estrutura

```
painel-obra/
├─ index.html                  # ponto de entrada (SPA)
├─ netlify.toml                # build + redirect SPA + pasta de funções
├─ .env.example                # modelo das chaves a preencher
├─ supabase/schema.sql         # tabelas + RLS (rode no Supabase)
├─ netlify/functions/
│  └─ interpretar-lancamento.mjs   # voz/texto -> IA -> JSON do lançamento
└─ src/
   ├─ main.js                  # roteador (login / obras / detalhe / pública)
   ├─ supabaseClient.js        # conexão com o Supabase
   ├─ styles.css               # visual
   ├─ lib/  (format.js, voice.js)
   └─ views/ (login, obras, obra, publica)
```

## Passo a passo

### 1. Banco no Supabase
1. Crie um projeto novo no Supabase (com o e-mail novo). Guarde a senha do banco.
2. **SQL Editor** → cole e rode o conteúdo de [`supabase/schema.sql`](supabase/schema.sql).
3. **Authentication → Users → Add user**: crie o usuário da arquiteta
   (e-mail + senha). É com ele que ela vai logar.
4. **Project Settings → API**: copie a **Project URL** e a **anon public key**.

### 2. Chaves (`.env`)
Copie `.env.example` para `.env` e preencha:

```
VITE_SUPABASE_URL=        # Project URL do Supabase
VITE_SUPABASE_ANON_KEY=   # anon public key do Supabase
ANTHROPIC_API_KEY=        # gerada no console.anthropic.com (e-mail novo)
```

### 3. Rodar localmente
Para testar a voz/IA junto, use o Netlify CLI (ele roda o front **e** as funções):

```bash
npm install
npm install -g netlify-cli   # uma vez
netlify dev                  # abre em http://localhost:8888
```

> Só `npm run dev` (Vite puro) serve o front, mas **não** roda as Netlify
> Functions — aí o botão de interpretar custo não responde. Use `netlify dev`.

### 4. Publicar (Netlify)
1. Suba este projeto para um repositório novo no GitHub.
2. Netlify → **Add new site → Import from GitHub** → escolha o repositório.
3. **Importante:** em *Site configuration → Build & deploy*, defina o
   **Base directory** como `painel-obra` (o projeto vive nesta subpasta).
   O `netlify.toml` cuida do resto (`npm run build`, pasta `dist`, funções).
4. **Site settings → Environment variables:** cadastre as três chaves do passo 2.
5. O Netlify publica e te dá a URL (ex.: `pilotoarq-obra.netlify.app`).

### 5. Demonstrar
1. Logue no painel e crie uma **obra de teste** (pode ser a real do cliente).
2. Cadastre algumas **etapas** com o orçado.
3. Lance custos **por voz** (`🎤 Falar`) ou digitando — a IA organiza.
4. Copie o **link do cliente** e abra noutro navegador para ver a visão de fora.

## Segurança (RLS)

O `schema.sql` configura o Row Level Security para que:

- a arquiteta logada edite/veja **somente as obras dela** (`user_id = auth.uid()`);
- o cliente, pelo link, **só leia** obras com `publicado = true` — e nada
  além de etapas e lançamentos daquela obra.

A chave `anon` pode ficar no front justamente porque é o RLS, e não o segredo
da chave, que protege os dados. A chave da Anthropic é a única secreta e fica
só dentro da Netlify Function.

## Ideias de evolução (camadas de IA)

- **Resumo mensal automático** para o cliente, em linguagem simples.
- **Alerta de estouro** quando uma etapa passa de X% do orçado.
- Narrativa de marca no cabeçalho do painel do cliente.

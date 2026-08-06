# Painel de Controle de Obras — Documentação do Piloto (engenharia reversa)

Este documento explica **tudo** sobre o projeto: o que é, onde está hospedado,
quais plataformas foram usadas, como as peças se conectam, segurança e custos.

---

## 1. O que é

Uma plataforma web de **gestão e acompanhamento de obra** para o escritório
**Schramm Arquitetura e Engenharia**. Tem duas caras:

- **Painel interno (Escritório, com login):** gerencia várias obras, lança
  custos (inclusive **por voz**, com IA), edita orçamento, e vê tudo — orçado,
  executado, saldo, pago e pendente.
- **Painel do cliente (link só-leitura, `/obra/{slug}`):** cada obra gera um
  link que o escritório compartilha. O cliente acompanha o orçamento em tempo
  real, com a marca do escritório, sem ver nada interno.

---

## 2. Plataformas e contas usadas

| # | Plataforma | Para quê serve | Conta usada no piloto |
|---|------------|----------------|------------------------|
| 1 | **Gmail** | E-mail "laboratório" que identifica o ambiente | `ferramentaska@gmail.com` |
| 2 | **GitHub** | Guarda o código-fonte do projeto | repositório `kellyalbertkabrand/SistemaKA` |
| 3 | **Netlify** | Hospeda o site no ar + roda a função da IA | time `kellyalbertka`, projeto `piloto-schramm-obra` |
| 4 | **Supabase** | Banco de dados + login + regras de segurança | org `KA Pilotos`, projeto `piloto-schramm` (São Paulo) |
| 5 | **Anthropic (Claude)** | A IA que transforma a fala em lançamento | chave de API (modelo `claude-haiku-4-5`) |

> ⚠️ **Nota de organização:** no piloto as contas ficaram um pouco misturadas
> (Supabase no `ferramentaska`, Netlify/Anthropic no e-mail pessoal, GitHub na
> conta `kellyalbertkabrand`). Funciona 100%. Na **produção** o ideal é
> consolidar tudo numa conta só (do escritório ou da KA) para facilitar a
> manutenção e a entrega.

---

## 3. Endereços do projeto (onde está no ar)

- **Site (produção do piloto):** `https://piloto-schramm-obra.netlify.app`
  - Login do escritório: `https://piloto-schramm-obra.netlify.app`
  - Painel do cliente: `https://piloto-schramm-obra.netlify.app/obra/{slug}`
- **Código:** repositório `SistemaKA`, na branch `claude/painel-obra-pilot-neqkp0`,
  dentro da subpasta `painel-obra/`.
- **Banco:** projeto Supabase `piloto-schramm` (região América do Sul / São Paulo).

---

## 4. Stack técnica (as ferramentas de construção)

- **Front-end:** HTML + CSS + JavaScript puro, empacotado com **Vite**
  (sem framework pesado — leve e rápido de publicar).
- **Back-end da IA:** uma **Netlify Function** (arquivo `.mjs`) que roda no
  servidor da Netlify e chama a API da Anthropic com segurança.
- **Banco e login:** **Supabase** (PostgreSQL + Auth), protegido por
  **Row Level Security (RLS)**.
- **Voz:** **Web Speech API** do próprio navegador (pt-BR), com campo de texto
  como alternativa.

### Estrutura de pastas
```
painel-obra/
├─ index.html                       # ponto de entrada (app de página única)
├─ netlify.toml                     # config de build + funções + redirect
├─ .env.example                     # modelo das chaves
├─ supabase/schema.sql              # tabelas + regras de segurança (RLS)
├─ netlify/functions/
│  └─ interpretar-lancamento.mjs    # voz/texto -> IA -> JSON do lançamento
└─ src/
   ├─ main.js                       # roteador (login / obras / detalhe / cliente)
   ├─ supabaseClient.js             # conexão com o Supabase
   ├─ styles.css                    # visual/marca
   ├─ lib/  (format, voice, ordenar, marca)
   └─ views/ (login, obras, obra, publica)
```

---

## 5. Como as peças se conectam (o fluxo)

```
        Navegador (arquiteta / cliente)
                    │
          site em piloto-schramm-obra.netlify.app  ◄── hospedado na NETLIFY
                    │
        ┌───────────┴─────────────┐
        │                         │
   lê/grava dados            lançamento por voz
        │                         │
        ▼                         ▼
     SUPABASE                NETLIFY FUNCTION
 (banco + login + RLS)   (interpretar-lancamento)
                                  │
                                  ▼
                          API da ANTHROPIC (Claude Haiku)
                          devolve {etapa, valor, status...}
```

1. O **navegador** carrega o site (arquivos estáticos servidos pela Netlify).
2. Para **ler e gravar** obras, etapas e lançamentos, o site fala direto com o
   **Supabase** (usando a chave pública `anon`; o que protege os dados é o RLS).
3. Para o **login**, o Supabase Auth valida e-mail e senha.
4. No **lançamento por voz**: o navegador transcreve a fala → manda o texto para
   a **Netlify Function** → a função chama a **API da Anthropic (Claude Haiku)**
   → volta um JSON organizado (etapa, descrição, valor, status) → o site mostra
   para conferência e salva no Supabase.

---

## 6. O banco de dados (Supabase)

Três tabelas:

- **`obras`** — nome, cliente, slug (final do link), orçamento, publicado, dono.
- **`etapas`** — fases da obra com o valor orçado (ex.: Fundação, Elétrica).
- **`lancamentos`** — cada custo: etapa, descrição, valor, status (pago/pendente), data.

### Segurança (Row Level Security)
As regras garantem que:
- o **escritório logado** vê/edita **somente as próprias obras** (`user_id = auth.uid()`);
- o **cliente** (link, sem login) **só lê** a obra publicada daquele slug — e
  nunca as outras, nem dados internos.

A chave `anon` pode ficar no front justamente porque é o **RLS**, e não o segredo
da chave, que protege os dados.

---

## 7. A voz + Inteligência Artificial

- **Onde roda a IA:** dentro da Netlify Function `interpretar-lancamento.mjs`.
- **Modelo:** `claude-haiku-4-5` (rápido e barato) da Anthropic.
- **Como funciona:** a função manda a frase para o Claude com uma instrução e um
  "formato de saída" fixo, e o Claude devolve um JSON garantido com
  `etapa`, `descricao`, `valor`, `status`.
- **Segurança da chave:** a chave secreta da Anthropic (`ANTHROPIC_API_KEY`) fica
  **só no servidor da Netlify**, nunca no navegador.

---

## 8. As chaves de ambiente (segredos)

Cadastradas em **Netlify → Site settings → Environment variables**:

| Variável | O que é | Fica exposta? |
|----------|---------|----------------|
| `VITE_SUPABASE_URL` | Endereço do projeto Supabase | Sim (pública, sem risco) |
| `VITE_SUPABASE_ANON_KEY` | Chave pública do Supabase | Sim (protegida por RLS) |
| `ANTHROPIC_API_KEY` | Chave secreta da IA | **Não** — só no servidor |

---

## 9. Publicação e atualizações

- O Netlify está ligado ao **GitHub**: a cada novo envio de código para a branch
  `claude/painel-obra-pilot-neqkp0`, o Netlify **reconstrói e republica sozinho**.
- Build: `npm run build` (Vite) → gera a pasta `dist` → Netlify publica.
- **Base directory** no Netlify: `painel-obra` (o projeto vive nessa subpasta).

---

## 10. Custos

**Piloto (agora): ~R$ 0/mês.** Tudo em plano grátis; a IA custa centavos por uso.

**Produção (1 cliente): ~R$ 145/mês** de infraestrutura:
- Supabase Pro (não hiberna, com backup): ~R$ 138 (US$ 25)
- Netlify: grátis
- API Anthropic: ~R$ 5
- Domínio próprio (opcional): ~R$ 5/mês amortizado

---

## 11. Limitações do piloto (e o que muda na produção)

- **Banco hiberna:** no plano grátis do Supabase, após alguns minutos sem uso a
  primeira requisição demora alguns segundos ("acordar"). Na produção (Pro),
  fica sempre ligado.
- **Atualização do cliente:** os dados estão sempre atualizados, mas a tela do
  cliente busca ao **abrir/recarregar**. Dá para evoluir para "tempo real" (a
  tela atualiza sozinha) quando quiser.
- **Logo:** ainda é um placeholder ("LOGOTIPO"); ao receber o arquivo oficial,
  troca-se em um lugar só.
- **Contas misturadas:** conforme a nota do item 2, consolidar na produção.

---

## 12. Ideias de evolução (próximas camadas)

- Croqui/render real por obra (o cliente vê o projeto da casa dele).
- Atualização em tempo real no painel do cliente (Supabase Realtime).
- Resumo mensal automático por IA para o cliente.
- Alerta de estouro quando uma etapa passa de X% do orçado.
- Upload de fotos da obra, anexos e recibos.

---

*Documento de apoio — KA | Inteligência para Marcas.*

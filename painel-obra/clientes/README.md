# Clientes (multi-escritório)

O código do sistema é **um só**. Cada escritório (cliente) tem:

| O quê | Onde fica |
|---|---|
| Marca (nome, cores, endereço, banco, dados de contrato) | `clientes/<id>/config.js` |
| Logo | `clientes/<id>/logo.png` |
| Ícones do app e manifest | `clientes/<id>/public/` |
| **Banco de dados e logins** | um **projeto Firebase próprio** (dados 100% separados) |
| Site | um **site próprio no Netlify** |
| Código publicado | uma **branch própria** (`cliente/<id>`) |

Quem escolhe o cliente no build é a variável de ambiente **`VITE_CLIENTE`**
(nome da pasta). Sem ela, o build usa `schramm`.

## Branches: uma por cliente

| Branch | Papel |
|---|---|
| `claude/painel-obra-pilot-neqkp0` | Produto base + site da **Schramm** (piloto) |
| `cliente/<id>` | Site do cliente `<id>` (o Netlify dele publica só desta branch) |

- Cada cliente evolui **isolado**: um ajuste feito na branch de um cliente não
  mexe no site dos outros.
- **Levar uma melhoria do produto para um cliente** = `git merge` da branch
  base na branch do cliente. Como a marca de cada um fica só na sua pasta
  `clientes/<id>/`, esse merge não dá conflito de marca.
- Ajuste exclusivo de um cliente (ex.: cláusula de contrato própria) fica só na
  branch dele.

---

## Adicionar um novo cliente (passo a passo)

### 1. Branch e pasta da marca (no código)
0. Crie a branch a partir da base:
   `git checkout -b cliente/<id> origin/claude/painel-obra-pilot-neqkp0`
1. Copie `clientes/schramm/` para `clientes/<id>/` (id curto, sem espaço/acento,
   ex.: `estudio-lima`).
2. Troque `logo.png` (PNG com fundo transparente, lockup horizontal).
3. Troque os ícones em `public/` (`apple-touch-icon.png` 180×180,
   `icon-512.png` 512×512) e ajuste `public/manifest.webmanifest` (nome e cor).
4. Preencha `config.js`: nome, título do app, endereço, cores, dados bancários e
   os dados da CONTRATADA nos contratos (razão social, CNPJ, endereço,
   representante, cidade/foro).
5. Teste: `VITE_CLIENTE=<id> npm run build` e faça push de `cliente/<id>`.

### 2. Banco de dados (Firebase — um projeto por cliente)
1. [console.firebase.google.com](https://console.firebase.google.com) → **Adicionar projeto**
   (ex.: `painel-obra-<id>`).
2. **Firestore Database** → Criar banco (região `southamerica-east1`, modo produção).
3. **Firestore → Regras**: cole o conteúdo de `firestore.rules` e publique.
4. **Authentication** → ativar **E-mail/senha** → criar o usuário do escritório.
5. **Configurações do projeto → Seus apps → Web (</>)**: registre o app e copie
   as chaves (`apiKey`, `authDomain`, `projectId`, `storageBucket`,
   `messagingSenderId`, `appId`).
6. (Recomendado, plano Blaze) Firestore → Recuperação de desastres: ativar PITR
   e backups programados.

### 3. Site (Netlify — um site por cliente)
1. Netlify → **Add new project → Import from Git** → este repositório.
2. Branch de produção: **`cliente/<id>`**. **Base directory: `painel-obra`**.
3. **Environment variables**:
   - `VITE_CLIENTE` = `<id>`
   - `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
     `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
     `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` = chaves do
     Firebase **do cliente** (passo 2.5)
   - `ANTHROPIC_API_KEY` = chave da IA (lançamento por voz)
4. Renomeie o site (ex.: `obras-<id>.netlify.app`) ou ligue um domínio próprio.
5. No Firebase do cliente → Authentication → Settings → **Authorized domains**:
   adicione o domínio do site.

### 4. Conferir
Login, criar obra, lançar custo por voz, gerar PDF de reembolso, abrir o painel
público do cliente, gerar um contrato e checar logo/cores/textos.

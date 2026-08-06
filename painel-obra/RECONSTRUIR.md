# RECONSTRUIR.md — Manual de reconstrução do Painel de Obra

> **Para que serve:** este é o documento-mestre do sistema. Se um dia for preciso
> **reconstruir tudo do zero**, anexe este arquivo numa conversa com o Claude Code
> (ou entregue a um desenvolvedor) que ele tem aqui **tudo o que precisa**:
> propósito, arquitetura, telas, regras de negócio, modelo de dados, deploy e como
> restaurar os dados. Combine com o **código** (GitHub) e o **`backup.json`** (dentro
> do ZIP de backup) para uma reconstrução completa.

Última atualização: manter sempre que mudar algo estrutural.

---

## 0. Reconstrução em 1 parágrafo

App web (Vite, HTML/CSS/JS puro) de gestão de obras para o escritório **Schramm
Arquitetura e Engenharia**. Front hospedado na **Netlify**; dados e login no
**Firebase (Firestore + Auth)**; uma **Netlify Function** chama a **API da
Anthropic** para interpretar lançamentos por voz/texto. Duas áreas: **painel
interno** (login da arquiteta) e **painel público do cliente** (`/obra/{slug}`,
só leitura). Para reconstruir: recriar o projeto Vite com a estrutura da seção 5,
implementar as telas/regras das seções 6–7, criar as coleções/*rules* do
Firestore (seções 8–9), configurar as variáveis de ambiente (seção 10), publicar
na Netlify (seção 11) e restaurar os dados (seção 12).

---

## 1. Onde tudo vive

| Item | Valor |
|---|---|
| Repositório | `kellyalbertkabrand/SistemaKA` (subpasta **`painel-obra/`**) |
| Branch de produção (deploy) | `claude/painel-obra-pilot-neqkp0` |
| Site no ar (Netlify) | `https://piloto-schramm-obra.netlify.app` |
| Projeto Netlify | `piloto-schramm-obra` (time `kellyalbertka`), base directory `painel-obra` |
| Firebase | projeto **`painel-obra-schramm`** (Firestore + Auth) |
| IA | Netlify Function → API Anthropic, modelo `claude-haiku-4-5` |

> Publicar = **git push** na branch de produção; a Netlify reconstrói sozinha.

---

## 2. O que o sistema faz (visão geral)

- **Painel interno (login):** lista de obras, detalhe da obra com KPIs, etapas,
  lançamentos (inclusive **por voz + IA**), fotos das visitas, arquivos/links de
  projeto, relatório de reembolso em PDF, mensagem de cobrança para WhatsApp,
  registro de pagamentos do cliente, cadastro de clientes e fornecedores (com
  link de autocadastro), e exportação de **backup completo**.
- **Painel do cliente (`/obra/{slug}`, sem login):** acompanhamento da obra com a
  marca do escritório — resumo financeiro, fases, atualizações (lançamentos),
  fotos, projeto e os valores a pagar ao escritório / já pagos / saldo.

Idioma: **pt-BR**.

---

## 3. Regras de negócio (o coração do sistema)

**Modelo financeiro:**
- O **escritório paga os fornecedores** (adianta).
- O **cliente reembolsa** o escritório pelo valor dos fornecedores **+ paga um
  honorário de gestão** (um **percentual por obra**, campo `percentualEscritorio`).
- **Exceção — pago direto pelo cliente:** cada lançamento tem `pagoPor`:
  - `'escritorio'` (padrão) → entra no **reembolso** (o cliente devolve).
  - `'cliente'` → **NÃO** entra no reembolso (o cliente já pagou o fornecedor direto).
- **Honorário incide sobre TODA a obra:** `honorário = percentual% × (reembolso +
  pago direto pelo cliente)`. Ou seja, mesmo o que o cliente paga direto gera honorário.
- **Total a pagar ao escritório = reembolso + honorário.**
- **Pagamentos do cliente ao escritório** (coleção `pagamentos`) registram o que já
  foi pago. **Saldo em aberto = total a pagar − recebido.**

**Status do lançamento:** `pago` | `pendente` (se o escritório já quitou o fornecedor).
Ambos entram no reembolso (o cliente reembolsa de qualquer forma).

**Cálculo central** implementado em `src/lib/reembolso.js` → `calcularReembolso()`;
é a fonte única usada pelo PDF, pela mensagem de WhatsApp e pelo painel do cliente.

---

## 4. Stack técnica

- **Front:** HTML + CSS + JavaScript puro, empacotado com **Vite** (sem framework).
- **Banco/Login:** **Firebase** (Firestore + Auth e-mail/senha), com **Regras (RLS)**.
- **IA:** **Netlify Function** `interpretar-lancamento.mjs` chama a API da Anthropic
  (chave secreta só no servidor).
- **Voz:** Web Speech API (pt-BR), contínua.
- **PDF:** `jspdf` + `jspdf-autotable` (gera arquivo para baixar).
- **ZIP de backup:** implementação própria em `src/lib/zip.js`.

Dependências (package.json): `firebase`, `jspdf`, `jspdf-autotable` (+ `vite` dev).

---

## 5. Estrutura de pastas

```
painel-obra/
├─ index.html
├─ netlify.toml                 # build (npm run build → dist), SPA redirect, headers de cache
├─ package.json
├─ firestore.rules             # Regras do Firestore (publicar no Console)
├─ BACKUP.md                   # backup/restauração
├─ RECONSTRUIR.md              # este arquivo
├─ netlify/functions/
│  └─ interpretar-lancamento.mjs   # voz/texto → Anthropic → {etapa,descricao,valor,status}
└─ src/
   ├─ main.js                  # roteador SPA
   ├─ firebase.js              # inicializa Firebase a partir das VITE_FIREBASE_*
   ├─ dados.js                 # TODA a camada de acesso ao Firestore/Auth
   ├─ styles.css               # visual + marca (terracota #c65a2e)
   ├─ assets/logo-schramm.png  # logo (lockup)
   ├─ lib/
   │  ├─ format.js             # moeda, dataBR, pct, slugify, esc, pillStatus
   │  ├─ voice.js              # reconhecimento de voz
   │  ├─ ordenar.js            # ordenação de lançamentos
   │  ├─ marca.js              # logo/branding
   │  ├─ imagem.js             # comprimir/converter imagens e dataURL
   │  ├─ lightbox.js           # visor de fotos/anexos
   │  ├─ zip.js                # cria ZIP no navegador
   │  ├─ exportar.js           # CSV/Excel-HTML helpers
   │  ├─ etapasPadrao.js       # etapas padrão (CAIXA)
   │  └─ reembolso.js          # calcularReembolso(), PDF, mensagem WhatsApp
   └─ views/
      ├─ login.js
      ├─ home.js               # menu-lançador
      ├─ obras.js              # lista de obras + cadastro + "Exportar tudo (backup)"
      ├─ obra.js               # detalhe da obra (o maior arquivo)
      ├─ publica.js            # painel do cliente
      ├─ clientes.js           # clientes + link de autocadastro
      ├─ fornecedores.js       # fornecedores + link de autocadastro
      ├─ cadastroCliente.js    # form público /cadastro/{token}
      └─ cadastroFornecedor.js # form público /cadastro-fornecedor/{token}
```

---

## 6. Rotas (src/main.js)

| Rota | Tela | Acesso |
|---|---|---|
| `/obra/{slug}` | Painel público do cliente (`publica.js`) | público |
| `/cadastro/{token}` | Autocadastro do cliente (`cadastroCliente.js`) | público (token) |
| `/cadastro-fornecedor/{token}` | Autocadastro do fornecedor (`cadastroFornecedor.js`) | público (token) |
| `/painel/{id}` | Detalhe da obra (`obra.js`) | login |
| `/obras` | Lista de obras (`obras.js`) | login |
| `/clientes` | Clientes (`clientes.js`) | login |
| `/fornecedores` | Fornecedores (`fornecedores.js`) | login |
| `/` (padrão) | Home/menu (`home.js`) | login |

---

## 7. Telas e funcionalidades

**Lista de obras (`/obras`):** cria obra (nome, cliente, slug, orçamento,
**percentual do escritório %**, etapas opcionais/padrão CAIXA); cards com KPIs;
**⬇ Exportar tudo (backup completo)** (ver seção 12); **⚙ Otimizar imagens**.

**Detalhe da obra (`/painel/{id}`):**
- KPIs (orçado, executado, saldo, pago, pendente).
- Editar obra (nome, cliente, orçamento, **percentual do escritório**), excluir obra.
- Link do cliente (publicar/copiar/abrir).
- **Relatório de reembolso (PDF):** escolher período (de/até, padrão últimos 7 dias)
  → **⬇ Baixar PDF** (arquivo real, jsPDF) e **💬 Mensagem WhatsApp**.
- **Pagamentos do cliente:** registrar/listar/remover (data, valor, forma,
  observação) + resumo (total a pagar, recebido, saldo em aberto).
- **Lançar custo:** texto/voz → IA organiza {etapa, descrição, valor, status};
  no preview escolhe-se **Quem pagou** (Escritório/Cliente direto).
- **Etapas:** adicionar/editar/excluir; chips das etapas padrão.
- **Lançamentos:** tabela ordenável; editar inline (inclui status e "quem pagou");
  anexar/remover **nota fiscal** (imagem/PDF).
- **Fotos das visitas:** enviar (várias), observação por foto/visita, baixar, excluir.
- **Projeto da obra:** **+ Arquivo** e **+ Link** (ações separadas), abrir, editar,
  remover; na edição dá para remover só o arquivo anexado.

**Painel do cliente (`publica.js`):** resumo (orçamento, já pago/ a pagar pelo
escritório, honorário, **total a pagar ao escritório**, pago direto, já pago por
você, **saldo em aberto**), fases (barras), atualizações (lançamentos), **seus
pagamentos ao escritório**, projeto e fotos.

**Clientes/Fornecedores:** cadastro interno (com edição no fornecedor), exclusão,
e **"Gerar link de cadastro"** (convite com token) para a pessoa preencher os
próprios dados (formulários públicos).

---

## 8. Modelo de dados (Firestore)

Coleções de nível superior (o **id da obra é o próprio slug**):

- **`obras/{slug}`** — `nome, cliente, slug, orcamento, percentualEscritorio,
  publicado, ownerId, criadoEm, projetos[]`. Cada item de `projetos`:
  `{ id, nome, link?, arquivo?, temArquivo, ehImagem, thumbUrl? }` (binário do
  arquivo fica em `fotos_bin/{projetoId}`).
- **`etapas/{id}`** — `obraId, nome, orcado, ownerId, criadoEm`.
- **`lancamentos/{id}`** — `obraId, etapa, descricao, valor, status('pago'|'pendente'),
  pagoPor('escritorio'|'cliente'), data(ISO), ownerId, criadoEm, temRecibo?,
  reciboNome?, reciboEm?`.
- **`pagamentos/{id}`** — `obraId, valor, data('YYYY-MM-DD'), forma, observacao,
  ownerId, criadoEm`. (Recebimentos do cliente ao escritório.)
- **`clientes/{id}`** — `token?, ownerId, nome, email, telefone, documento, cidade,
  endereco, observacoes, contrato_nome, contrato_documento, contrato_rg,
  contrato_nacionalidade, contrato_estadocivil, contrato_profissao,
  contrato_endereco, criadoEm`.
- **`fornecedores/{id}`** — `token?, ownerId, nome, categoria, telefone, email,
  cnpj, endereco, observacoes, criadoEm`.
- **`convites/{token}`** — `rotulo, obraId?, tipo('cliente'|'fornecedor'), ownerId,
  criadoEm`.
- **`fotos/{id}`** — `obraId, thumbUrl, nome, texto, legenda, dataVisita, ownerId,
  criadoEm` (miniatura leve). Imagem cheia em `fotos_bin`.
- **`fotos_bin/{id}`** — `obraId, dataUrl(base64), ownerId, criadoEm`. Também guarda
  os binários dos **arquivos de projeto** (id = id do projeto).
- **`recibos/{lancamentoId}`** — `dataUrl(base64), nome, obraId, ownerId, criadoEm`
  (arquivo da nota fiscal, à parte para o lançamento ficar leve).

Toda a lógica de acesso está em **`src/dados.js`** (nenhuma tela fala com o
Firestore direto).

---

## 9. Regras do Firestore (segurança)

Arquivo fonte: **`firestore.rules`** (publicar no Console → Firestore → Regras).
Padrão:
- Coleções de dados da obra (`obras, etapas, lancamentos, fotos, fotos_bin,
  recibos, pagamentos`): leitura se **logado** OU se a **obra está publicada**;
  escrita só **logado**.
- `convites`: leitura pública (para validar o link); escrita só logado.
- `clientes` e `fornecedores`: leitura/edição/exclusão só logado; **create público**
  permitido quando vier com um `token` de convite válido (autocadastro).

> Ao adicionar uma coleção nova, **sempre** criar a regra correspondente e
> **republicar** no Console (não é publicado pela Netlify).

---

## 10. Variáveis de ambiente

No Netlify (Site settings → Environment variables) e em `.env` local:
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
  `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`,
  `VITE_FIREBASE_APP_ID` — configuração pública do Firebase (o front só usa `VITE_*`).
- `ANTHROPIC_API_KEY` — **secreta**, usada só na Netlify Function.

---

## 11. Build, deploy e cache

- Build: `npm install` && `npm run build` (gera `dist/`).
- `netlify.toml`: `command = npm run build`, `publish = dist`, functions em
  `netlify/functions`, redirect SPA `/* → /index.html 200`, e **headers de cache**
  (`index.html` sempre revalida; `/assets/*` imutável).
- **Publicar = git push** na branch de produção → Netlify reconstrói (~15s).

---

## 12. Backup e restauração (ver também BACKUP.md)

- **Automático (principal):** Firestore com **PITR (7 dias)** + **backups
  programados** (plano Blaze), no Console → Firestore → Recuperação de desastres.
  Restauração pela mesma tela.
- **Manual completo:** botão **"⬇ Exportar tudo (backup completo)"** no Painel de
  Obras gera `backup-painel-obra-DD-MM-AAAA.zip` com:
  `clientes.xls`, `fornecedores.xls`, `pagamentos.xls`, uma pasta `obras/<obra>/`
  (com `obra.xls`, `fotos/`, `notas-fiscais/`, `projeto/`) e **`backup.json`**
  (dados estruturados de todas as coleções; binários vão como arquivos).

**Restaurar os DADOS a partir do `backup.json`:** já existe o botão
**"⬆ Importar backup"** no Painel de Obras (`obras.js` → `importarBackup()` em
`dados.js`). Ele regrava obras, etapas, lançamentos, pagamentos, clientes e
fornecedores (upsert por id, idempotente). Os **binários** (fotos, NFs, arquivos de
projeto) **não** voltam pelo JSON — para eles, use o **restore nativo do Firestore**
(PITR/backup programado), que é o caminho mais fiel para dados perdidos.

---

## 13. Como pedir a reconstrução ao Claude Code (roteiro)

1. Anexe este `RECONSTRUIR.md` (e, se tiver, o `backup.json`).
2. Diga o objetivo (ex.: "recriar o projeto do zero" ou "restaurar os dados").
3. O Claude deve: recriar a estrutura da seção 5; implementar rotas (6), telas (7)
   e a regra de negócio (3) via `calcularReembolso`; criar as coleções e publicar
   as `firestore.rules` (8–9); configurar env vars (10); publicar na Netlify (11);
   e restaurar os dados (12).
4. Validar: login, criar obra com percentual, lançar custo (escritório/cliente
   direto), registrar pagamento, gerar PDF/WhatsApp, abrir painel do cliente,
   autocadastro por link, e o backup completo.

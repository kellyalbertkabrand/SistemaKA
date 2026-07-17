# Retomar o projeto numa sessão nova — SaaS da KA

> Kelly: numa sessão nova, cole isto (ou peça "leia o `HANDOFF-SESSAO.md` e o
> `CLAUDE.md` e continue de onde paramos"). O `CLAUDE.md` é a memória completa
> do projeto (a IA lê sozinha). Este arquivo é o **estado atual + pendências +
> como publicar**.

## 0. Mensagem pronta pra colar na sessão nova
> "Leia o CLAUDE.md e o HANDOFF-SESSAO.md deste repositório e continue de onde
> paramos. Desenvolva em `claude/internal-dashboard-visual-bzenia`, espelhe em
> `estudiodemarca` e me lembre de dar Trigger deploy no Netlify."

## 1. O que é (resumo)
App web React/Vite/TypeScript + Firebase (Firestore), hospedado no Netlify. É o
**SaaS da KA** (estudiodemarca.kellyalbert.com.br): gera artes de marca (Estúdio)
e faz a gestão do negócio (clientes, projetos, orçamentos, contratos, cobranças,
financeiro, notícias, etc.). Código do app em **`estudio-marca-ka/`**. Detalhes
completos no `CLAUDE.md`.

## 2. Git & Deploy (IMPORTANTE — o "caminho" pra publicar)
- Rodar `git` da **raiz** do repo (`/home/user/SistemaKA`), não de subpasta.
- **Desenvolver** na branch `claude/internal-dashboard-visual-bzenia`.
- **Publicar:** o site no ar builda da branch **`estudiodemarca`**. Depois de
  commitar na branch de trabalho, espelhar em `estudiodemarca`:
  `git checkout estudiodemarca && git merge --ff-only claude/internal-dashboard-visual-bzenia && git push -u origin estudiodemarca` (e voltar pra branch de trabalho).
- ⚠️ **O deploy NÃO dispara sozinho.** Depois do push, a KA precisa ir no
  **Netlify → Trigger deploy** pra o site no ar atualizar.
- App no Netlify: site id `620d408e-bb8a-49fb-a1da-ccf602320142`. Funções de
  servidor em `estudio-marca-ka/netlify/functions/` (guardam segredos).
- Build local pra conferir: `cd estudio-marca-ka && npm run build`.

## 3. Editar DADOS direto no Firestore (útil p/ modelos de contrato, etc.)
- Projeto `estudio-de-marcas-ka`, apiKey pública `AIzaSyB0wvONtPSbE8dleIYlzmWxeylVxfkZGm0`
  (Firestore em **modo teste/aberto** — dá p/ ler e gravar via REST).
- Modelos de contrato: coleção `modelos_contrato`
  - Design (padrão): id `VYWGKtrz4EaMssnJorQ3`
  - Obras/arquitetura: id `MYC6lIp8hY92rSX5Flbd`
- Notícias: coleção `noticias` (a aba Notícias lê daqui).

## 4. PENDÊNCIAS ABERTAS (o que falta / decisões)
1. **⚠️ Chave da IA dos contratos (401 — inválida).** O assistente de IA no
   editor de contrato ainda dá "chave recusada". A KA precisa: gerar chave NOVA
   em console.anthropic.com → API Keys → Create Key, copiar INTEIRA (`sk-ant-…`)
   e colar no Netlify na variável **`ANTHROPIC_API_KEY_CONTRATO`**, depois
   Trigger deploy. (O código já aceita essa variável.)
2. **Notícias — aguarda a outra sessão.** A aba Notícias já está pronta e LÊ da
   coleção `noticias`. A OUTRA sessão (sistema de geração de notícias) precisa
   GRAVAR lá — contrato em `BRIEFING-NOTICIAS-NO-SAAS.md`. Decisão pendente: a
   aba fica **pública** (como está) ou **só admin**?
3. **ZapSign (assinatura) — discutido, não construído.** Plano: botão "Enviar
   para a ZapSign" via Netlify Function (token só no servidor). Falta a KA
   escolher o caminho (2 = PDF do app; 3 = modelo DOCX na ZapSign) e passar o
   **token de API** da ZapSign. Ver a conversa/resumo desta sessão.
4. **Deploy manual pendente:** dar **Trigger deploy** no Netlify p/ tudo que foi
   publicado.
5. **Modo seguro (login por papel) — EM ESPERA** (decisão antiga da KA). Não
   implementar sem novo "ok". Quando entrar, o sistema de notícias precisará de
   conta de serviço p/ gravar (hoje grava com a chave pública por causa do modo
   teste).

## 5. O que foi feito nesta sessão (contexto rápido)
- **Cobranças (WhatsApp):** bloco de PIX escolhível na hora (**PIX pessoal /
  PIX empresa**), descrição em **negrito**, disclaimer "Mensagem automática
  enviada pelo sistema", PIX CNPJ sem pontuação (`15096943000137`), removida a
  assinatura "Qualquer dúvida, me chama! Kelly".
- **Contratos:** endereço do cliente na qualificação ("com endereço em…", sem
  "residente"); **empresa (CNPJ) + representante (CPF)** na qualificação e no
  bloco de assinatura; **data automática por extenso**; **assinaturas
  centralizadas** com traço maior e espaço p/ assinar; **nome do PDF** = tema +
  cliente; cabeçalho do documento "**Contrato · KA | Inteligência para Marcas ·
  Kelly Albert**" + "Contrato: {empresa}", e some o cabeçalho da aba ao abrir um
  contrato. **Modelos finais subidos no Firestore:** design (do .docx) e
  obras/arquitetura.
- **Notícias:** nova aba `/noticias` (grupo Criação da home + menu), lê a coleção
  Firestore `noticias`; a publicação vem de fora (outra sessão).
- Arquivos-chave novos: `src/lib/noticias.ts`, `src/pages/gestao/GestaoNoticias.tsx`,
  `src/components/ContratoView.tsx`, `src/lib/pagamento.ts`.

## 6. Como conferir visualmente (sandbox)
`npm run build` no `estudio-marca-ka/`; se precisar de screenshot, usar
`playwright-core` temporário + Chromium em
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (ver seção 9 do CLAUDE.md).

## 7. Convenções
Tudo em **português** (a KA e os clientes dela). A KA usa **iPhone** —
evitar `window.prompt/confirm/alert` (o Safari suprime); usar os helpers
próprios (`confirmar()`, toast, popups DOM). Manter o `CLAUDE.md` atualizado ao
concluir mudanças relevantes.

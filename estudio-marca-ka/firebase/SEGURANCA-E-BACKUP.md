# Segurança e Backup — Sistema Visual de Publicações da Marca (KA)

> Documento de referência (jul/2026). Decisões alinhadas com a Kelly.

---

## 1. Como os dados são guardados

- **Banco:** Firebase **Firestore** (Google Cloud), projeto `estudio-de-marcas-ka`.
- **Plano atual:** **Spark (grátis)**.
- As chaves do Firebase que ficam no código (`src/lib/firebase.ts`) são
  **públicas por design** — elas só identificam o projeto. A segurança real
  vem das **Regras** do Firestore, não do sigilo das chaves.

## 2. Situação de segurança HOJE (a corrigir antes de usar pra valer)

- 🔴 **Banco em MODO TESTE (aberto):** `firebase/firestore.rules` está com
  `allow read, write: if true`. Qualquer pessoa com o endereço do projeto pode
  **ler e alterar tudo**. Bom pra testar, **inseguro pra produção**.
- 🔴 **App sem login:** `src/lib/config.ts` tem `ACESSO_ABERTO = true`, então
  nenhuma área exige e-mail/senha.
- 🟢 Já existe a versão **PRODUÇÃO** das regras (comentada em
  `firestore.rules`) e o login (Google + e-mail/senha) já está no app
  (`AuthContext.tsx`) — só estão **desligados**.

## 3. Modelo de acesso combinado (a construir quando a Kelly aprovar)

- **Kelly (KA) — papel `admin`:** acessa **tudo**. Reconhecida pelo e-mail
  `kellyalbertka@gmail.com` (allowlist em `firebase.ts`) ou `papel='admin'`.
- **VM Rocks — papel `parceiro` (novo):** login próprio (e-mail/senha).
  Enxerga **somente**:
  - os **projetos onde a VM participa**;
  - o **financeiro desses projetos** (orçamento, contrato, cobrança);
  - **não vê** Clientes, Cuidadoras, Atividades pessoais da Kelly, nem
    projetos sem VM.
  - **Pode ver e ATUALIZAR as fases dela** (marcar andamento/concluída);
    não edita o resto.
- **"A VM participa deste projeto?" = marcação MANUAL:** um botão no projeto
  (campo novo, ex. `vm_participa: boolean`) que a Kelly liga/desliga. Nada é
  automático.
- **Como o financeiro fica visível pra VM (nota técnica):** as Regras do
  Firestore não cruzam coleções. Então, quando um projeto é marcado como
  "VM participa", o sistema propaga uma marquinha (ex. `vm: true`) nos
  orçamentos/contratos/cobranças daquele cliente, e as regras liberam a leitura
  desses docs para o e-mail da VM.

> ⚠️ Enquanto o item 2 não for ligado, backup ajuda contra **acidente**, mas
> **não** impede alguém de ler/alterar o banco aberto. O ideal é ligar os dois.

---

## 4. BACKUP — passo a passo (precisa ser feito no Console; requer plano Blaze)

O plano grátis (Spark) **não tem backup automático**. Pra ter backup diário e
"voltar no tempo", é preciso subir pro **Blaze (pago por uso)**. No volume atual
da KA, o custo tende a **quase zero** — as cotas grátis continuam valendo no
Blaze; você só paga o que passar delas (e backup custa centavos de
armazenamento). Mesmo assim, ligue um **alerta de orçamento** pra dormir
tranquila.

### 4.1. Subir pro plano Blaze
1. Firebase Console → engrenagem ⚙️ → **Uso e faturamento** (Usage & billing).
2. **Modificar plano** → **Blaze** → vincular um cartão / conta de faturamento.

### 4.2. Proteção contra susto (alerta de orçamento) — recomendado
1. Google Cloud Console → **Billing** → **Budgets & alerts** → **Create budget**.
2. Valor ex.: **R$ 20/mês**, com alerta por e-mail em 50% / 90% / 100%.
   (É só aviso; não corta o serviço, mas você fica sabendo na hora.)

### 4.3. Ligar "voltar no tempo" (Point-in-Time Recovery — 7 dias)
1. Firebase Console → **Firestore Database**.
2. Menu do banco (⋮ / configurações) → **Point-in-time recovery** → **Enable**.
3. Passa a guardar versões dos últimos **7 dias** — dá pra recuperar o estado
   de qualquer momento nesse período.

### 4.4. Ligar backups agendados (diário, com retenção)
1. Firebase Console → **Firestore Database** → aba/seção **Backups**.
2. **Create schedule / Criar agendamento**: frequência **diária**, retenção
   **7 dias** (dá pra ir até 14 semanas se for semanal).
3. Pronto — a partir daí o Google guarda uma cópia por dia automaticamente.

> Alternativa técnica (opcional): exportação manual pra um bucket do Cloud
> Storage via `gcloud firestore export gs://SEU_BUCKET` — também exige Blaze.
> Para a KA, o item 4.3 + 4.4 já cobre bem.

### 4.5. Como RECUPERAR se precisar
- **PITR:** Firestore → Restaurar (Restore) → escolher um horário nos últimos
  7 dias → cria um novo banco/coleção com aquele estado.
- **Backup agendado:** Firestore → Backups → escolher a cópia do dia →
  **Restore**.

---

## 5. Roadmap de segurança (pendente de "ok" da Kelly)

- [ ] **Ligar backup** (seção 4) — Kelly aprovou; falta executar no Console.
- [ ] Construir o **modo seguro**: papéis KA/parceiro, campo `vm_participa`,
      propagação da marca `vm` no financeiro, e as regras de produção do
      Firestore (VM lê seus projetos + edita suas fases + lê o financeiro
      deles). — **em espera** ("por enquanto só entender").
- [ ] Trocar `ACESSO_ABERTO` para `false` e publicar as regras de produção
      no dia da virada — com a Kelly conseguindo logar e a conta da VM criada.

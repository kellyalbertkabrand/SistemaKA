# Backup e recuperação — Painel de Obra (piloto Schramm)

Resumo do que está ativo para proteger os dados, como acompanhar o custo e como
restaurar se algo for perdido. Projeto Firebase: **painel-obra-schramm**.

---

## 1. Onde os dados vivem

- **Banco de dados:** Firebase **Cloud Firestore** (projeto `painel-obra-schramm`).
  Guarda obras, etapas, lançamentos, clientes, fornecedores, fotos (miniatura +
  imagem cheia em `fotos_bin`), notas fiscais (`recibos`), convites e **pagamentos**
  (recebimentos do cliente).
- **Código-fonte:** GitHub `kellyalbertkabrand/SistemaKA` (subpasta `painel-obra/`).
  O código em si já é versionado no Git — este documento trata do backup dos **dados**.

---

## 2. Backup automático (ativo) — plano Blaze

Ativado no Console do Firebase → **Firestore Database → Recuperação de desastres**:

- **Recuperação pontual (PITR):** LIGADA, janela de **7 dias**. Permite voltar os
  dados a qualquer instante da última semana (protege contra exclusão/edição
  acidental).
- **Cópias de segurança programadas:** backup automático do banco, gerenciado pelo
  Google (diário e/ou semanal, com a retenção definida na tela).

> Esses recursos exigem o plano **Blaze** (pay as you go), que já está ativo. O
> Blaze mantém as cotas grátis; só cobra o que passar delas. No volume do piloto,
> o custo esperado é de **centavos a poucos reais/mês** (armazenamento dos backups).

---

## 3. Como restaurar

No Console do Firebase → **Firestore → Recuperação de desastres**:

- **Por backup programado:** escolha um backup na lista → **Restaurar** (cria um
  novo banco a partir do backup).
- **Por PITR:** escolha o **instante** (dentro dos últimos 7 dias) para recuperar.

Depois de restaurar para um novo banco, se for preciso trocar o banco em produção,
peça ajuda técnica (envolve apontar o app para o banco restaurado).

---

## 4. Como acompanhar o custo

- **Resumo de uso:** Firebase Console → engrenagem ⚙️ → **Uso e faturamento**.
- **Gasto em R$:** [console.cloud.google.com/billing](https://console.cloud.google.com/billing)
  → conta **"Pagamento do Firebase"** → **Visão geral** (total do mês) ou
  **Relatórios** (detalhe por serviço, filtrando o projeto `painel-obra-schramm`).
- A coluna **"Gastos dos últimos 30 dias"** na lista de contas já mostra o total.
- Os custos aparecem com **algumas horas de atraso**; o que está na cota grátis
  conta como **R$ 0**.

### Alerta de orçamento
Criado um **orçamento de ~R$ 25/mês** (Billing → Orçamentos e alertas). Envia
e-mail aos administradores da conta quando o custo se aproxima/passa desse valor.
É só **alerta** — não corta o serviço.

---

## 5. Backup manual completo (secundário, sem custo)

Dentro do sistema (logada), no **Painel de Obras**, o botão
**"⬇ Exportar tudo (backup completo)"** gera um ZIP **datado**
(`backup-painel-obra-DD-MM-AAAA.zip`) com:

- `clientes.xls` — todos os clientes, **todos os campos**;
- `fornecedores.xls` — todos os fornecedores, **todos os campos**;
- `pagamentos.xls` — todos os pagamentos do cliente (todas as obras);
- `obras/<obra>/` — uma pasta por obra, contendo:
  - `obra.xls` (dados da obra, etapas, lançamentos e pagamentos daquela obra),
  - `fotos/` (imagens das visitas),
  - `notas-fiscais/` (NFs anexadas),
  - `projeto/` (arquivos de projeto anexados);
- `backup.json` — **backup técnico estruturado** de todas as coleções (para
  eventual restauração/importação; os binários pesados vão como arquivos no ZIP).

Vale rodar de tempos em tempos e guardar no Drive/computador.

> O backup **automático do Firestore** (seção 2) continua sendo o mecanismo
> principal de recuperação, com fidelidade total. O export manual é uma cópia
> extra, legível e portátil.

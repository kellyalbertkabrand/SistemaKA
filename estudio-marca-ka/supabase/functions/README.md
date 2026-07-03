# Edge Functions — Sistema Visual de Publicações da Marca (KA)

Backend seguro do sistema: aqui vivem as chaves secretas (Mercado Pago e
service_role). **Nada disso vai no front.**

## O que cada função faz

| Função | O que faz | Deploy |
| --- | --- | --- |
| `mp-criar-cobranca` | Cria o link de pagamento (Checkout Pro: cartão, boleto, PIX) de uma cobrança e grava em `cobrancas.link_pagamento`. | `supabase functions deploy mp-criar-cobranca` |
| `mp-webhook` | Recebe o aviso do Mercado Pago e marca a cobrança como **paga** quando o pagamento é aprovado. | `supabase functions deploy mp-webhook --no-verify-jwt` |
| `convidar-usuario` | Convida um e-mail (link para criar senha) já vinculado ao cliente — usado na aba Clientes & Acessos. | `supabase functions deploy convidar-usuario` |

## Passo a passo (uma vez só)

1. **Instale a CLI** do Supabase e conecte ao projeto:

   ```bash
   npm i -g supabase
   supabase login
   supabase link --project-ref <REF_DO_PROJETO>   # está na URL do painel
   ```

2. **Configure os segredos** (Painel → Edge Functions → Secrets, ou CLI):

   ```bash
   supabase secrets set MP_ACCESS_TOKEN=APP_USR-xxxxxxxx   # token de PRODUÇÃO do MP
   supabase secrets set APP_URL=https://estudiodemarca.kellyalbert.com.br
   ```

   O `MP_ACCESS_TOKEN` fica em: Mercado Pago → Suas integrações → criar
   aplicação → Credenciais de produção → **Access Token**.

3. **Publique as funções** (dentro de `estudio-marca-ka/`):

   ```bash
   supabase functions deploy mp-criar-cobranca
   supabase functions deploy mp-webhook --no-verify-jwt
   supabase functions deploy convidar-usuario
   ```

4. **Registre o webhook no Mercado Pago**: Suas integrações → sua aplicação →
   Webhooks → URL de produção:

   ```
   https://<REF_DO_PROJETO>.supabase.co/functions/v1/mp-webhook
   ```

   marcando o evento **Pagamentos**.

5. Pronto. No painel (aba Cobranças), o botão **“Gerar boleto/cartão”** cria o
   link; quando o cliente paga, o webhook marca a cobrança como paga sozinho.

## Enquanto as funções não estão publicadas

- O botão “Gerar boleto/cartão” mostra erro explicando — use **“Colar link”**
  com um link de pagamento criado manualmente no Mercado Pago.
- O convite pode ser feito no painel do Supabase (Authentication → Users →
  Invite user) e o vínculo à marca feito na aba Clientes & Acessos.

## Mensalidades automáticas (opcional)

“Gerar mensalidades do mês” já funciona pelo botão no painel. Para gerar
sozinho todo dia 1º, agende no SQL Editor (extensão `pg_cron`):

```sql
create extension if not exists pg_cron;
select cron.schedule(
  'mensalidades-mes', '0 8 1 * *',
  $$select public.gerar_mensalidades();$$
);
```

(Pelo cron a RPC roda como processo interno do banco, sem usuário — a função
permite; visitantes anônimos continuam sem acesso.)

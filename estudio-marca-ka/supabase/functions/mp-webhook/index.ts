// Edge Function: webhook do Mercado Pago. Quando um pagamento é aprovado,
// marca a cobrança correspondente como paga (via external_reference).
//
// Deploy SEM verificação de JWT (o MP chama sem token):
//   supabase functions deploy mp-webhook --no-verify-jwt
//
// Configure no painel do Mercado Pago (Suas integrações → Webhooks) a URL:
//   https://<PROJETO>.supabase.co/functions/v1/mp-webhook
// para o evento "Pagamentos".

import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MP_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')

Deno.serve(async (req) => {
  try {
    if (!MP_TOKEN) throw new Error('MP_ACCESS_TOKEN não configurado')

    // O MP manda o id do pagamento na query (?data.id=...) ou no corpo.
    const url = new URL(req.url)
    let paymentId = url.searchParams.get('data.id') ?? url.searchParams.get('id')
    let tipo = url.searchParams.get('type') ?? url.searchParams.get('topic')
    if (!paymentId) {
      const body = await req.json().catch(() => null)
      paymentId = body?.data?.id ?? null
      tipo = body?.type ?? tipo
    }
    // Só nos interessa evento de pagamento.
    if (!paymentId || (tipo && tipo !== 'payment')) {
      return new Response('ignorado', { status: 200 })
    }

    // Consulta o pagamento no MP (nunca confie só no corpo do webhook).
    const resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_TOKEN}` },
    })
    if (!resp.ok) return new Response('pagamento não encontrado', { status: 200 })
    const pagamento = await resp.json()

    const cobrancaId = pagamento.external_reference
    if (!cobrancaId) return new Response('sem external_reference', { status: 200 })

    if (pagamento.status === 'approved') {
      const svc = createClient(SUPABASE_URL, SERVICE_ROLE)
      await svc
        .from('cobrancas')
        .update({
          status: 'paga',
          mp_payment_id: String(pagamento.id),
          pago_em: pagamento.date_approved ?? new Date().toISOString(),
        })
        .eq('id', cobrancaId)
        .neq('status', 'paga') // idempotente: não sobrescreve
    }

    return new Response('ok', { status: 200 })
  } catch (err) {
    // Sempre 200 para o MP não repetir infinitamente; o erro fica no log.
    console.error('[mp-webhook]', err)
    return new Response('erro registrado', { status: 200 })
  }
})

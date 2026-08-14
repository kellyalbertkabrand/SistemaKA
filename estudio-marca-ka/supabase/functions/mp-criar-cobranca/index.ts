// Edge Function: cria o link de pagamento de uma cobrança no Mercado Pago
// (Checkout Pro — cartão, boleto e PIX) e grava o link na tabela `cobrancas`.
//
// Segredos necessários (supabase secrets set ...):
//   MP_ACCESS_TOKEN  — Access Token de PRODUÇÃO do Mercado Pago
//   APP_URL          — ex.: https://estudiodemarca.kellyalbert.com.br
//
// Deploy: supabase functions deploy mp-criar-cobranca

import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const MP_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')
const APP_URL = Deno.env.get('APP_URL') ?? 'https://estudiodemarca.kellyalbert.com.br'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    if (!MP_TOKEN) throw new Error('MP_ACCESS_TOKEN não configurado nos segredos do Supabase')

    // 1. Confere que quem chama é a admin logada (JWT do front).
    const auth = req.headers.get('Authorization') ?? ''
    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    })
    const { data: ehAdmin } = await anon.rpc('is_admin')
    if (!ehAdmin) {
      return new Response(JSON.stringify({ error: 'Apenas a admin pode gerar cobranças' }), {
        status: 403,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    // 2. Carrega a cobrança e o cliente (service role: ignora RLS com segurança).
    const { cobranca_id } = await req.json()
    const svc = createClient(SUPABASE_URL, SERVICE_ROLE)
    const { data: cobranca, error: e1 } = await svc
      .from('cobrancas')
      .select('*, clientes(nome_marca, email_cobranca, email_contato, documento)')
      .eq('id', cobranca_id)
      .single()
    if (e1 || !cobranca) throw new Error(e1?.message ?? 'Cobrança não encontrada')
    if (cobranca.status === 'paga') throw new Error('Esta cobrança já está paga')

    // 3. Cria a preferência no Mercado Pago (Checkout Pro).
    //    O cliente escolhe na tela do MP: cartão (parcelado), boleto ou PIX.
    const vencimento = new Date(`${cobranca.vencimento}T23:59:59-03:00`)
    const pref = {
      items: [
        {
          title: cobranca.descricao,
          quantity: 1,
          unit_price: Number(cobranca.valor),
          currency_id: 'BRL',
        },
      ],
      external_reference: cobranca.id,
      payer: {
        email: cobranca.clientes?.email_cobranca ?? cobranca.clientes?.email_contato ?? undefined,
      },
      payment_methods: { installments: 12 },
      date_of_expiration: vencimento.toISOString(),
      notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook`,
      back_urls: { success: APP_URL, pending: APP_URL, failure: APP_URL },
      statement_descriptor: 'KELLY ALBERT KA',
    }

    const resp = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { Authorization: `Bearer ${MP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(pref),
    })
    if (!resp.ok) {
      throw new Error(`Mercado Pago respondeu ${resp.status}: ${await resp.text()}`)
    }
    const criada = await resp.json()

    // 4. Grava o link na cobrança e devolve a linha atualizada.
    const { data: atualizada, error: e2 } = await svc
      .from('cobrancas')
      .update({ mp_preference_id: criada.id, link_pagamento: criada.init_point })
      .eq('id', cobranca.id)
      .select('*')
      .single()
    if (e2) throw new Error(e2.message)

    return new Response(JSON.stringify(atualizada), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})

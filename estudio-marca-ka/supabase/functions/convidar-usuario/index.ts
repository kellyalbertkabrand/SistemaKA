// Edge Function: convida um e-mail para o sistema já vinculado a um cliente.
// Usa o service_role (só existe no servidor) para chamar o convite do Auth.
//
// Segredos: APP_URL (para o link do convite voltar ao app).
// Deploy: supabase functions deploy convidar-usuario

import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const APP_URL = Deno.env.get('APP_URL') ?? 'https://estudiodemarca.kellyalbert.com.br'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    // Só a admin logada pode convidar.
    const auth = req.headers.get('Authorization') ?? ''
    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    })
    const { data: ehAdmin } = await anon.rpc('is_admin')
    if (!ehAdmin) {
      return new Response(JSON.stringify({ error: 'Apenas a admin pode convidar usuários' }), {
        status: 403,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const { email, cliente_id, cliente_slug } = await req.json()
    if (!email || !cliente_id) throw new Error('Informe email e cliente_id')

    const svc = createClient(SUPABASE_URL, SERVICE_ROLE)

    // Convite (e-mail com link para definir senha). Se a pessoa já tem login,
    // o Auth devolve erro — seguimos e só garantimos o vínculo na tabela.
    const { data: convite, error: eConvite } = await svc.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${APP_URL}/login`,
    })

    let userId = convite?.user?.id ?? null
    if (!userId) {
      // Usuário já existe? Busca pelo e-mail na tabela usuarios.
      const { data: existente } = await svc
        .from('usuarios')
        .select('id')
        .ilike('email', email)
        .maybeSingle()
      userId = existente?.id ?? null
      if (!userId && eConvite) throw new Error(eConvite.message)
    }

    if (userId) {
      // Vincula (o trigger handle_new_user já criou a linha em usuarios).
      const { error: eVinc } = await svc
        .from('usuarios')
        .update({ cliente_id, cliente_slug: cliente_slug ?? null, papel: 'cliente' })
        .eq('id', userId)
      if (eVinc) throw new Error(eVinc.message)
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})

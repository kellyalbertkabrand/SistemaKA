import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Falha cedo e com mensagem clara se as variáveis não estiverem configuradas.
// (copie `.env.example` para `.env.local` e preencha com os dados do projeto)
export const supabaseConfigured = Boolean(url && anonKey)

if (!supabaseConfigured) {
  console.warn(
    '[Estúdio KA] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ausentes. ' +
      'Copie .env.example para .env.local e preencha com os dados do seu projeto Supabase.',
  )
}

// Mesmo sem config criamos o client (com placeholders) para a app montar;
// qualquer chamada vai falhar de forma controlada e a UI avisa o usuário.
export const supabase = createClient(
  url ?? 'https://placeholder.supabase.co',
  anonKey ?? 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)

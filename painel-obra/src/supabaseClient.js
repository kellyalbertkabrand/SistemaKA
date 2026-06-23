import { createClient } from '@supabase/supabase-js';

// As chaves vêm das variáveis de ambiente (arquivo .env / painel do Netlify).
// Só a URL e a chave "anon" pública ficam aqui — o que protege os dados é o
// Row Level Security do Supabase, não o segredo da chave.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const configurado = Boolean(url && anonKey);

// Se as chaves não estiverem preenchidas, deixamos o client nulo e a tela
// mostra um aviso amigável em vez de quebrar.
export const supabase = configurado ? createClient(url, anonKey) : null;

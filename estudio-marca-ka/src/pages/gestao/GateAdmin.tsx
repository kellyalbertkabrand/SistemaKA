import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabaseConfigured } from '../../lib/supabase'
import { ACESSO_ABERTO } from '../../lib/config'

// As abas de gestão (clientes, orçamentos, contratos, cobranças) só abrem
// para a KA logada como admin — diferente do estúdio, que é aberto.
export function GateAdmin({ children }: { children: ReactNode }) {
  const { session, isAdmin, loading } = useAuth()

  // MODO TESTE: acesso liberado, sem login (ver lib/config.ts).
  if (ACESSO_ABERTO) return <>{children}</>

  // Atalho de desenvolvimento local (?preview-gate) para ver o layout das
  // telas sem banco. Removido do build de produção pelo import.meta.env.DEV.
  if (import.meta.env.DEV && window.location.search.includes('preview-gate')) return <>{children}</>

  if (!supabaseConfigured) {
    return (
      <div className="nota">
        <strong>Supabase não configurado.</strong> A gestão (clientes, orçamentos, contratos e
        cobranças) usa o banco de dados. Defina <code>VITE_SUPABASE_URL</code> e{' '}
        <code>VITE_SUPABASE_ANON_KEY</code> no ambiente (Netlify e <code>.env.local</code>) e
        aplique <code>supabase/schema.sql</code> + <code>supabase/gestao.sql</code> no projeto.
      </div>
    )
  }

  if (loading) {
    return <p style={{ color: 'var(--t-500)', fontSize: '0.85rem' }}>Carregando…</p>
  }

  if (!session || !isAdmin) {
    return (
      <div className="card">
        <h3>Área restrita da KA</h3>
        <p>
          Esta parte do painel gerencia dados dos clientes e do financeiro; entre com o seu login
          de administradora para acessar.
        </p>
        <p style={{ marginTop: '0.9rem' }}>
          <Link className="btn" to="/login">
            Entrar
          </Link>
        </p>
      </div>
    )
  }

  return <>{children}</>
}

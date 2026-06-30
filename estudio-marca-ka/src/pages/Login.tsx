import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabaseConfigured } from '../lib/supabase'
import { Loading } from '../components/Loading'

export function Login() {
  const { session, loading, isAdmin, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (loading) return <Loading texto="Carregando…" />

  // Já logado → manda para a área certa conforme o papel.
  if (session) return <Navigate to={isAdmin ? '/admin' : '/estudio'} replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    const { error } = await signIn(email.trim(), senha)
    setEnviando(false)
    if (error) setErro(traduzErro(error))
    // Em caso de sucesso, o onAuthStateChange redireciona via <Navigate> acima.
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-card__brand">
          Estúdio de <span>Marca</span>
        </div>
        <div className="auth-card__sub">Inteligência para Marcas · KA</div>

        {!supabaseConfigured && (
          <div className="auth-banner">
            <strong>Configuração pendente.</strong> Defina <code>VITE_SUPABASE_URL</code> e{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> em <code>.env.local</code> para habilitar o login.
          </div>
        )}

        {erro && <div className="auth-error">{erro}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="senha">Senha</label>
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>
          <button className="btn" type="submit" disabled={enviando || !supabaseConfigured}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

function traduzErro(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.'
  if (/email not confirmed/i.test(msg)) return 'Confirme seu e-mail antes de entrar.'
  return msg
}

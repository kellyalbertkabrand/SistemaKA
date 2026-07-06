import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loading } from '../components/Loading'

export function Login() {
  const { session, loading, isAdmin, signIn, signInGoogle } = useAuth()
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

  async function entrarGoogle() {
    setErro(null)
    setEnviando(true)
    const { error } = await signInGoogle()
    setEnviando(false)
    if (error) setErro(traduzErro(error))
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-card__brand">
          Publicações da <span>Marca</span>
        </div>
        <div className="auth-card__sub">Sistema Visual · KA</div>

        {erro && <div className="auth-error">{erro}</div>}

        <button
          type="button"
          className="btn btn--google"
          onClick={() => void entrarGoogle()}
          disabled={enviando}
          style={{ width: '100%', marginBottom: '1rem' }}
        >
          Entrar com o Google
        </button>

        <div className="auth-ou">ou com e-mail e senha</div>

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
          <button className="btn" type="submit" disabled={enviando}>
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

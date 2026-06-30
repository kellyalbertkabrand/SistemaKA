import { useAuth } from '../context/AuthContext'

export function TopBar() {
  const { session, perfil, signOut } = useAuth()
  return (
    <header className="app-top">
      <div className="app-top__brand">
        Estúdio de <span>Marca</span>
      </div>
      <div className="app-top__right">
        <span className="app-top__user">
          {perfil?.papel === 'admin' ? 'Painel KA · ' : ''}
          {session?.user.email}
        </span>
        <button className="btn btn--ghost" onClick={() => void signOut()}>
          Sair
        </button>
      </div>
    </header>
  )
}

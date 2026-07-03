import { useAuth } from '../context/AuthContext'

export function TopBar() {
  const { session, signOut } = useAuth()
  return (
    <header className="app-top">
      <div className="app-top__brand">
        Estúdio de <span>Marca</span>
      </div>
      <div className="app-top__right">
        {session ? (
          <>
            <span className="app-top__user">{session.user.email}</span>
            <button className="btn btn--ghost" onClick={() => void signOut()}>
              Sair
            </button>
          </>
        ) : (
          <span className="app-top__tag">Painel KA</span>
        )}
      </div>
    </header>
  )
}

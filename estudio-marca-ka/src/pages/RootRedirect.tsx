import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loading } from '../components/Loading'

// Decide o destino da rota "/" conforme sessão e papel.
export function RootRedirect() {
  const { session, loading, isAdmin } = useAuth()
  if (loading) return <Loading />
  if (!session) return <Navigate to="/login" replace />
  return <Navigate to={isAdmin ? '/admin' : '/estudio'} replace />
}

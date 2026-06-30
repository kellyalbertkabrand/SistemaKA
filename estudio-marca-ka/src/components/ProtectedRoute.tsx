import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loading } from './Loading'

interface Props {
  children: ReactNode
  /** Quando definido, exige este papel; caso contrário, redireciona. */
  papel?: 'admin' | 'cliente'
}

export function ProtectedRoute({ children, papel }: Props) {
  const { session, perfil, loading, isAdmin } = useAuth()

  if (loading) return <Loading texto="Verificando acesso…" />
  if (!session) return <Navigate to="/login" replace />

  // Sem perfil em `usuarios` ainda (provisionamento) — tratar como cliente.
  if (papel === 'admin' && !isAdmin) return <Navigate to="/estudio" replace />
  if (papel === 'cliente' && isAdmin) return <Navigate to="/admin" replace />

  // Evita warning de "perfil não usado" e documenta a dependência.
  void perfil

  return <>{children}</>
}

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Usuario } from '../lib/database.types'

// Admin(s) "de bootstrap": estes e-mails são tratados como KA/admin mesmo que
// o papel ainda não esteja gravado em public.usuarios. Facilita o primeiro
// acesso da KA. Pode sobrescrever via VITE_ADMIN_EMAILS (lista separada por vírgula).
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS ?? 'kellyalbertka@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

interface AuthState {
  session: Session | null
  /** Perfil do usuário em `public.usuarios` (papel + cliente_id). */
  perfil: Usuario | null
  loading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

async function fetchPerfil(userId: string): Promise<Usuario | null> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) {
    console.error('[Estúdio KA] falha ao carregar perfil:', error.message)
    return null
  }
  return data as Usuario | null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function load(current: Session | null) {
      if (current?.user) {
        const p = await fetchPerfil(current.user.id)
        if (active) setPerfil(p)
      } else if (active) {
        setPerfil(null)
      }
      if (active) setLoading(false)
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      void load(data.session)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(true)
      void load(next)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      session,
      perfil,
      loading,
      isAdmin:
        perfil?.papel === 'admin' ||
        ADMIN_EMAILS.includes(session?.user.email?.toLowerCase() ?? ''),
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return { error: error?.message ?? null }
      },
      async signOut() {
        await supabase.auth.signOut()
      },
    }),
    [session, perfil, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}

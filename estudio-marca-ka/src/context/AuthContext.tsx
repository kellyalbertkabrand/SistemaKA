import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { auth, db, googleProvider, ehAdmin } from '../lib/firebase'
import type { Usuario } from '../lib/database.types'

// Admin(s) "de bootstrap": estes e-mails são tratados como KA/admin mesmo que
// o papel ainda não esteja gravado em `usuarios`. (Ver ADMIN_EMAILS em firebase.ts.)

interface AuthState {
  /** Usuário do Firebase Auth (ou null). Mantido como `session` para as telas. */
  session: User | null
  /** Perfil do usuário em `usuarios` (papel + cliente_id + cliente_slug). */
  perfil: Usuario | null
  loading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signInGoogle: () => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

/**
 * Garante um documento em `usuarios/{uid}` para o login atual. Se houver um
 * convite pendente para o e-mail (criado na aba Clientes & Acessos), já vincula
 * o login à marca convidada. Devolve o perfil resultante.
 */
async function garantirPerfil(user: User): Promise<Usuario | null> {
  const ref = doc(db, 'usuarios', user.uid)
  const email = (user.email ?? '').toLowerCase()
  const admin = ehAdmin(email)

  const snap = await getDoc(ref)
  if (!snap.exists()) {
    // Procura um convite pendente para este e-mail.
    let cliente_id: string | null = null
    let cliente_slug: string | null = null
    if (email) {
      const conv = await getDoc(doc(db, 'convites', email))
      if (conv.exists()) {
        const c = conv.data()
        cliente_id = (c.cliente_id as string) ?? null
        cliente_slug = (c.cliente_slug as string) ?? null
      }
    }
    const novo: Usuario = {
      id: user.uid,
      email,
      papel: admin ? 'admin' : 'cliente',
      cliente_id,
      cliente_slug,
      criado_em: new Date().toISOString(),
    }
    await setDoc(ref, novo)
    return novo
  }

  const perfil = { id: user.uid, ...snap.data() } as Usuario
  // Promove a admin no banco caso o e-mail seja de bootstrap e ainda não esteja.
  if (admin && perfil.papel !== 'admin') {
    await updateDoc(ref, { papel: 'admin' })
    perfil.papel = 'admin'
  }
  return perfil
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<User | null>(null)
  const [perfil, setPerfil] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!active) return
      setSession(user)
      if (user) {
        try {
          const p = await garantirPerfil(user)
          if (active) setPerfil(p)
        } catch (e) {
          console.error('[Estúdio KA] falha ao carregar/gravar perfil:', e)
          if (active) setPerfil(null)
        }
      } else {
        setPerfil(null)
      }
      if (active) setLoading(false)
    })
    return () => {
      active = false
      unsub()
    }
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      session,
      perfil,
      loading,
      isAdmin: perfil?.papel === 'admin' || ehAdmin(session?.email),
      async signIn(email, password) {
        try {
          await signInWithEmailAndPassword(auth, email, password)
          return { error: null }
        } catch (e) {
          return { error: e instanceof Error ? e.message : String(e) }
        }
      },
      async signInGoogle() {
        try {
          await signInWithPopup(auth, googleProvider)
          return { error: null }
        } catch (e) {
          return { error: e instanceof Error ? e.message : String(e) }
        }
      },
      async signOut() {
        await fbSignOut(auth)
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

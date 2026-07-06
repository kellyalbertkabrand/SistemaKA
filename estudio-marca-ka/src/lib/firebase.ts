// Firebase — base do backend de gestão (clientes, orçamentos, contratos,
// cobranças). Substitui o Supabase enquanto ele está fora do ar.
//
// As chaves abaixo são PÚBLICAS por design (config web do Firebase): elas só
// identificam o projeto no front. A segurança de verdade vem das *regras* do
// Firestore (quem pode ler/escrever cada coleção) — não do sigilo da apiKey.
// Por isso podem ficar no código versionado sem problema.
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyB0wvONtPSbE8dleIYlzmWxeylVxfkZGm0',
  authDomain: 'estudio-de-marcas-ka.firebaseapp.com',
  projectId: 'estudio-de-marcas-ka',
  storageBucket: 'estudio-de-marcas-ka.firebasestorage.app',
  messagingSenderId: '977694040491',
  appId: '1:977694040491:web:f45a0675e42efeb1ea72ee',
}

export const firebaseApp = initializeApp(firebaseConfig)
export const auth = getAuth(firebaseApp)
export const db = getFirestore(firebaseApp)

// Login com Google: como a KA já usa conta Google, o acesso é "1 clique",
// sem senha para lembrar.
export const googleProvider = new GoogleAuthProvider()

// E-mail(s) com acesso de admin (a própria KA). O painel de gestão só libera
// as abas para estes e-mails.
export const ADMIN_EMAILS = ['kellyalbertka@gmail.com']

export function ehAdmin(email?: string | null): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
}

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Config do Firebase — chaves PÚBLICAS (vêm do .env / painel do Netlify).
// O que protege os dados são as Regras de Segurança do Firestore (firestore.rules),
// não o segredo dessas chaves. Por isso podem ficar no front.
const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Se faltar a config, o app mostra um aviso amigável em vez de quebrar.
export const configurado = Boolean(cfg.apiKey && cfg.projectId);

let auth = null;
let db = null;
let storage = null;
if (configurado) {
  const app = initializeApp(cfg);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export { auth, db, storage };

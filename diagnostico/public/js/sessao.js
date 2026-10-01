// Login (Google ou link mágico por e-mail) e chamadas ao servidor.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut,
  sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { CONFIG } from "./config.js";

const app = initializeApp(CONFIG.firebase);
export const auth = getAuth(app);
export const banco = getFirestore(app);
auth.languageCode = "pt";

const CHAVE_EMAIL = "mce_email_login";

export function guardarEmail(email) {
  try { localStorage.setItem(CHAVE_EMAIL, email); } catch {}
}
export function emailGuardado() {
  try { return localStorage.getItem(CHAVE_EMAIL) || ""; } catch { return ""; }
}

export function entrarComGoogle() {
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export async function enviarLinkMagico(email) {
  await sendSignInLinkToEmail(auth, email, {
    url: `${location.origin}/entrar`,
    handleCodeInApp: true,
  });
  guardarEmail(email);
}

export function linkMagicoNaUrl() {
  return isSignInWithEmailLink(auth, location.href);
}

export async function concluirLinkMagico(email) {
  const resultado = await signInWithEmailLink(auth, email, location.href);
  guardarEmail(email);
  history.replaceState(null, "", "/entrar");
  return resultado;
}

// Resolve com o usuário logado (ou null) assim que o Firebase souber.
export function usuarioAtual() {
  return new Promise((resolve) => {
    const parar = onAuthStateChanged(auth, (u) => { parar(); resolve(u); });
  });
}

export function sair() {
  return signOut(auth).then(() => { location.href = "/"; });
}

// Chamada autenticada às funções do servidor.
export async function api(caminho, opcoes = {}) {
  const usuario = auth.currentUser;
  const token = usuario ? await usuario.getIdToken() : "";
  const resp = await fetch(caminho, {
    ...opcoes,
    headers: { "content-type": "application/json", authorization: `Bearer ${token}`, ...(opcoes.headers || {}) },
  });
  const dados = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, dados };
}

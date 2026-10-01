// Acesso ao Firebase (login e banco de dados) a partir do servidor.
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function app() {
  if (getApps().length) return getApps()[0];
  // FIREBASE_SERVICE_ACCOUNT: o JSON da conta de serviço, codificado em base64.
  const bruto = Netlify.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!bruto) throw new Error("FIREBASE_SERVICE_ACCOUNT não configurada.");
  const credencial = JSON.parse(Buffer.from(bruto, "base64").toString("utf8"));
  return initializeApp({ credential: cert(credencial) });
}

export function db(): Firestore {
  return getFirestore(app());
}

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type Usuario = { uid: string; email: string };

// Lê o token de login enviado pelo navegador (cabeçalho Authorization: Bearer ...).
export async function usuarioDaRequisicao(req: Request): Promise<Usuario | null> {
  const cabecalho = req.headers.get("authorization") ?? "";
  const token = cabecalho.startsWith("Bearer ") ? cabecalho.slice(7) : "";
  if (!token) return null;
  try {
    const dados = await getAuth(app()).verifyIdToken(token);
    if (!dados.email || !dados.email_verified) return null;
    return { uid: dados.uid, email: normalizarEmail(dados.email) };
  } catch {
    return null;
  }
}

export type Acesso = { ativo: boolean; expiraEm: string | null; motivo?: string };

// Verifica se o e-mail tem uma compra ativa (registrada pelo aviso da Hotmart).
export async function verificarAcesso(email: string): Promise<Acesso> {
  // E-mails liberados manualmente (testes, cortesias): lista separada por vírgula.
  const liberados = (Netlify.env.get("EMAILS_LIBERADOS") ?? "")
    .split(",")
    .map(normalizarEmail)
    .filter(Boolean);
  if (liberados.includes(email)) return { ativo: true, expiraEm: null };

  const doc = await db().collection("compras").doc(email).get();
  if (!doc.exists) return { ativo: false, expiraEm: null, motivo: "sem_compra" };

  const compra = doc.data() as { status: string; expiraEm?: string };
  if (compra.status !== "ativo") return { ativo: false, expiraEm: null, motivo: "compra_" + compra.status };
  if (compra.expiraEm && new Date(compra.expiraEm) < new Date()) {
    return { ativo: false, expiraEm: compra.expiraEm, motivo: "expirado" };
  }
  return { ativo: true, expiraEm: compra.expiraEm ?? null };
}

export function json(dados: unknown, status = 200): Response {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

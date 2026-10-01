// Recebe os avisos de venda da Hotmart (Postback / Webhook 2.0) e libera ou revoga o acesso.
import type { Config } from "@netlify/functions";
import { db, json, normalizarEmail } from "../lib/firebase.mts";

const LIBERA = new Set(["PURCHASE_APPROVED", "PURCHASE_COMPLETE"]);
const REVOGA = new Set(["PURCHASE_REFUNDED", "PURCHASE_CHARGEBACK", "PURCHASE_CANCELED", "PURCHASE_PROTEST"]);

export default async (req: Request) => {
  if (req.method !== "POST") return json({ erro: "método não permitido" }, 405);

  const corpo = await req.json().catch(() => null);
  if (!corpo) return json({ erro: "corpo inválido" }, 400);

  // O hottok confirma que o aviso veio mesmo da Hotmart.
  const hottok = req.headers.get("x-hotmart-hottok") ?? corpo.hottok;
  if (!hottok || hottok !== Netlify.env.get("HOTMART_HOTTOK")) return json({ erro: "não autorizado" }, 401);

  const evento: string = corpo.event ?? "";
  const dados = corpo.data ?? {};
  const emailBruto: string | undefined = dados.buyer?.email;
  if (!emailBruto) return json({ ok: true, ignorado: "sem e-mail" });

  // Se houver mais de um produto na conta Hotmart, só o do diagnóstico libera acesso.
  const produtoEsperado = Netlify.env.get("HOTMART_PRODUTO_ID");
  if (produtoEsperado && String(dados.product?.id) !== produtoEsperado) {
    return json({ ok: true, ignorado: "outro produto" });
  }

  const email = normalizarEmail(emailBruto);
  const ref = db().collection("compras").doc(email);
  const agora = new Date();
  const registro = {
    email,
    nome: dados.buyer?.name ?? "",
    transacao: dados.purchase?.transaction ?? "",
    produto: dados.product?.name ?? "",
    ultimoEvento: evento,
    atualizadoEm: agora.toISOString(),
  };

  if (LIBERA.has(evento)) {
    const dias = Number(Netlify.env.get("DIAS_ACESSO") ?? "90");
    const expiraEm = new Date(agora.getTime() + dias * 24 * 60 * 60 * 1000).toISOString();
    await ref.set({ ...registro, status: "ativo", liberadoEm: agora.toISOString(), expiraEm }, { merge: true });
  } else if (REVOGA.has(evento)) {
    await ref.set({ ...registro, status: "revogado" }, { merge: true });
  } else {
    await ref.set({ ultimoEvento: evento, atualizadoEm: agora.toISOString() }, { merge: true });
  }

  return json({ ok: true });
};

export const config: Config = { path: "/api/hotmart" };

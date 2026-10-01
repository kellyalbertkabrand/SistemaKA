// Valida o pedido de diagnóstico e dispara a geração em segundo plano.
import type { Config, Context } from "@netlify/functions";
import { db, json, usuarioDaRequisicao, verificarAcesso } from "../lib/firebase.mts";
import { perguntasPendentes } from "../lib/pontuacao.mts";

const MAX_GERACOES = 2;

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return json({ erro: "método não permitido" }, 405);

  const usuario = await usuarioDaRequisicao(req);
  if (!usuario) return json({ erro: "faça login novamente" }, 401);

  const acesso = await verificarAcesso(usuario.email);
  if (!acesso.ativo) return json({ erro: "acesso inativo", motivo: acesso.motivo }, 403);

  const respostasDoc = await db().collection("respostas").doc(usuario.uid).get();
  const dados = respostasDoc.data() ?? {};
  const faltando = perguntasPendentes(dados.respostas ?? {});
  if (faltando.length) return json({ erro: "ainda há perguntas sem resposta", faltando }, 400);

  const resultadoRef = db().collection("resultados").doc(usuario.uid);
  const atual = (await resultadoRef.get()).data();
  // Se uma geração anterior travou há mais de 10 minutos, permite tentar de novo.
  const travada = atual?.iniciadoEm && Date.now() - new Date(atual.iniciadoEm).getTime() > 10 * 60 * 1000;
  if (atual?.status === "gerando" && !travada) return json({ ok: true, status: "gerando" });
  const geracoes = Number(atual?.geracoes ?? 0);
  if (geracoes >= MAX_GERACOES) return json({ erro: "limite de diagnósticos atingido" }, 429);

  await resultadoRef.set(
    { status: "gerando", geracoes: geracoes + 1, iniciadoEm: new Date().toISOString(), erro: null },
    { merge: true },
  );

  // A geração leva cerca de 1 minuto, por isso roda em uma função de segundo plano.
  await fetch(new URL("/.netlify/functions/gerar-diagnostico-background", context.site.url ?? req.url), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-chave-interna": Netlify.env.get("CHAVE_INTERNA") ?? "",
    },
    body: JSON.stringify({ uid: usuario.uid }),
  });

  return json({ ok: true, status: "gerando" });
};

export const config: Config = { path: "/api/gerar" };

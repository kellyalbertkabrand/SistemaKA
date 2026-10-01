// Diz ao navegador se a pessoa logada tem acesso ativo ao diagnóstico.
import type { Config } from "@netlify/functions";
import { json, usuarioDaRequisicao, verificarAcesso } from "../lib/firebase.mts";

export default async (req: Request) => {
  const usuario = await usuarioDaRequisicao(req);
  if (!usuario) return json({ erro: "faça login novamente" }, 401);
  const acesso = await verificarAcesso(usuario.email);
  return json({ email: usuario.email, ...acesso });
};

export const config: Config = { path: "/api/acesso" };

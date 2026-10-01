// Entrega as perguntas do diagnóstico para o navegador.
import type { Config } from "@netlify/functions";
import { conteudoPublico } from "../lib/conteudo.mts";

export default async () =>
  new Response(JSON.stringify(conteudoPublico()), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300" },
  });

export const config: Config = { path: "/api/conteudo" };

// Netlify Function: transforma a fala (ou um texto digitado) num lançamento.
//
// O front manda { texto, etapas? } por POST. Esta função chama a API da
// Anthropic (Claude Haiku) com SAÍDA ESTRUTURADA e devolve um JSON limpo:
//   { etapa, descricao, valor, status }.
//
// A chave da Anthropic fica só aqui no servidor (variável ANTHROPIC_API_KEY),
// nunca no navegador.

const MODEL = "claude-haiku-4-5";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

const SISTEMA = `Você organiza lançamentos de custos de obra a partir de uma frase falada em português do Brasil.

Extraia quatro campos:
- "etapa": a fase/categoria da obra (ex.: "Fundação", "Alvenaria", "Elétrica", "Hidráulica", "Acabamento", "Material", "Mão de obra"). Use letra maiúscula no início.
- "descricao": um resumo curto e claro do gasto.
- "valor": o número em reais, apenas o número (ex.: 3500.00). Interprete números por extenso ("três mil e quinhentos" = 3500).
- "status": "pago" ou "pendente".

Regras de status: se a frase mencionar Pix, dinheiro, cartão, "já paguei" ou similar, use "pago". Se mencionar "a pagar", "pendente", "vou pagar", "fica devendo", use "pendente". Na dúvida, use "pago".

Se a obra já tiver etapas cadastradas, reaproveite o nome exato de uma delas quando a frase encaixar naquela etapa.`;

export default async (req) => {
  if (req.method !== "POST") return json({ erro: "method_not_allowed" }, 405);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ erro: "anthropic_key_missing" }, 500);

  let texto = "";
  let etapas = [];
  try {
    const body = await req.json();
    texto = (body?.texto ?? "").toString().trim();
    if (Array.isArray(body?.etapas)) etapas = body.etapas.filter(Boolean);
  } catch {
    return json({ erro: "body_invalido" }, 400);
  }
  if (!texto) return json({ erro: "texto_vazio" }, 400);

  const dica = etapas.length
    ? `\n\nEtapas já cadastradas nesta obra: ${etapas.join(", ")}.`
    : "";

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system: SISTEMA,
        messages: [{ role: "user", content: texto + dica }],
        // Saída estruturada: garante um JSON no formato exato que esperamos.
        output_config: {
          format: {
            type: "json_schema",
            schema: {
              type: "object",
              properties: {
                etapa: { type: "string" },
                descricao: { type: "string" },
                valor: { type: "number" },
                status: { type: "string", enum: ["pago", "pendente"] },
              },
              required: ["etapa", "descricao", "valor", "status"],
              additionalProperties: false,
            },
          },
        },
      }),
    });

    if (!resp.ok) {
      const detalhe = await resp.text();
      return json({ erro: "anthropic_error", status: resp.status, detalhe }, 502);
    }

    const data = await resp.json();
    const bloco = (data.content || []).find((b) => b.type === "text");
    if (!bloco) return json({ erro: "sem_resposta" }, 502);

    const lancamento = JSON.parse(bloco.text);
    return json({ ok: true, lancamento });
  } catch (e) {
    return json({ erro: "falha", detalhe: String(e) }, 502);
  }
};

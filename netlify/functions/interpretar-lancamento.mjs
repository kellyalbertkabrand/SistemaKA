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

// Prompt enxuto: o schema já garante o formato, então aqui ficam só as regras
// de interpretação. Prompt curto = menos tokens de entrada por chamada.
const SISTEMA = `Extraia um lançamento de custo de obra de uma frase em pt-BR.
- etapa: categoria, inicial maiúscula (Fundação, Elétrica, Hidráulica, Acabamento, Material, Mão de obra...). Havendo etapas cadastradas, reutilize o nome exato que encaixar.
- descricao: resumo em poucas palavras.
- valor: reais como número (ex.: 3500.00); entenda por extenso ("três mil e quinhentos"=3500).
- status: "pago" se citar Pix/dinheiro/cartão/"já paguei"; "pendente" se citar "a pagar"/"vou pagar"/"fica devendo"; senão "pago".`;

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

  const dica = etapas.length ? ` Etapas cadastradas: ${etapas.join(", ")}.` : "";

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
        max_tokens: 120, // a saída é um JSON curto; cap baixo evita gerar tokens à toa
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

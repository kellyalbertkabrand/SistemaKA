// Netlify Function: transforma a fala (ou um texto digitado) num lançamento.
//
// O front manda { texto, etapas? } por POST. Esta função chama a API da
// Anthropic (Claude Haiku) e devolve um JSON limpo:
//   { etapa, descricao, valor, status }.
//
// A chave da Anthropic fica só aqui no servidor (variável ANTHROPIC_API_KEY),
// nunca no navegador.
//
// Observação: devolvemos SEMPRE status HTTP 200 com { ok, mensagem }, para o
// front conseguir mostrar a causa exata do erro (chave inválida, sem créditos,
// limite, etc.) em vez de uma mensagem genérica.

const MODEL = "claude-haiku-4-5";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

// Regras para EXTRAIR um novo lançamento (ação "lancar"). Mantidas iguais.
const SISTEMA = `Extraia um lançamento de custo de obra de uma frase em pt-BR.
- etapa: categoria, inicial maiúscula (Fundação, Elétrica, Hidráulica, Acabamento, Material, Mão de obra...). Havendo etapas cadastradas, reutilize o nome exato que encaixar.
- descricao: resumo em poucas palavras.
- valor: reais como número (ex.: 3500.00); entenda por extenso ("três mil e quinhentos"=3500).
- status: "pago" se citar Pix/dinheiro/cartão/"já paguei"; "pendente" se citar "a pagar"/"vou pagar"/"fica devendo"; senão "pago".`;

const SCHEMA = {
  type: "object",
  properties: {
    etapa: { type: "string" },
    descricao: { type: "string" },
    valor: { type: "number" },
    status: { type: "string", enum: ["pago", "pendente"] },
  },
  required: ["etapa", "descricao", "valor", "status"],
  additionalProperties: false,
};

function chamarAnthropic(apiKey, corpo) {
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(corpo),
  });
}

// Extrai o JSON da resposta, mesmo que venha com algum texto em volta.
function extrairJSON(texto) {
  if (!texto) return null;
  try { return JSON.parse(texto); } catch { /* tenta extrair abaixo */ }
  const m = String(texto).match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* desiste */ } }
  return null;
}

function normalizar(l) {
  if (!l || typeof l !== "object") return null;
  const valor = Number(String(l.valor ?? 0).toString().replace(/[^\d.,-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
  return {
    etapa: (l.etapa || "Geral").toString().trim() || "Geral",
    descricao: (l.descricao || "").toString().trim() || null,
    valor: Number.isFinite(valor) ? valor : 0,
    status: l.status === "pendente" ? "pendente" : "pago",
  };
}

export default async (req) => {
  if (req.method !== "POST") return json({ ok: false, erro: "method_not_allowed" }, 405);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json({
      ok: false, erro: "sem_chave",
      mensagem: "A chave da IA não está configurada no servidor. No Netlify, em Site settings → Environment variables, adicione ANTHROPIC_API_KEY e publique de novo.",
    });
  }

  let texto = "";
  let etapas = [];
  let lancamentos = [];
  try {
    const body = await req.json();
    texto = (body?.texto ?? "").toString().trim();
    if (Array.isArray(body?.etapas)) etapas = body.etapas.filter(Boolean);
    // Lançamentos existentes (para a IA poder MUDAR o status de um já lançado).
    // O front manda uma lista enxuta e numerada; a IA devolve o(s) número(s).
    if (Array.isArray(body?.lancamentos)) {
      lancamentos = body.lancamentos
        .filter((l) => l && typeof l === "object")
        .slice(0, 60)
        .map((l) => ({
          etapa: (l.etapa || "").toString().slice(0, 60),
          descricao: (l.descricao || "").toString().slice(0, 80),
          fornecedor: (l.fornecedor || "").toString().slice(0, 60),
          valor: Number(l.valor || 0),
          status: l.status === "pendente" ? "pendente" : "pago",
        }));
    }
  } catch {
    return json({ ok: false, erro: "body_invalido", mensagem: "Pedido inválido." }, 400);
  }
  if (!texto) return json({ ok: false, erro: "texto_vazio", mensagem: "Escreva ou fale o lançamento primeiro." }, 400);

  const dica = etapas.length ? ` Etapas cadastradas: ${etapas.join(", ")}.` : "";

  // Lista numerada dos lançamentos existentes, para a IA referenciar por número.
  const listaLanc = lancamentos.length
    ? "\n\nLançamentos já existentes (para a ação \"status\"), numerados:\n" +
      lancamentos.map((l, i) =>
        `${i + 1}) [${l.status}] ${l.etapa}${l.fornecedor ? " · " + l.fornecedor : ""}${l.descricao ? " · " + l.descricao : ""} · R$ ${l.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
      ).join("\n")
    : "";

  // Instrução de intenção: a IA primeiro decide se é um NOVO lançamento
  // ("lancar") ou MUDAR O STATUS de um já existente ("status").
  const instrucao =
    `Primeiro decida a AÇÃO da frase:\n` +
    `- "lancar": descreve um NOVO custo/gasto da obra.\n` +
    `- "status": pede para MUDAR O STATUS (pago/pendente) de um lançamento que JÁ existe na lista numerada acima (ex.: "marca a fundação como paga", "o concreto da Argamazza já foi pago", "voltar os muros para pendente"). Só use "status" quando a frase se referir a algo já lançado e NÃO traga um novo gasto.\n\n` +
    SISTEMA + `\n\n` +
    `Responda SOMENTE com um JSON válido, sem texto antes ou depois.\n` +
    `Se a ação for "lancar": {"acao":"lancar","etapa":"...","descricao":"...","valor":0,"status":"pago"}\n` +
    `Se a ação for "status": {"acao":"status","novoStatus":"pago","alvos":[N]}\n` +
    `- novoStatus: só "pago" ou "pendente", conforme a frase.\n` +
    `- alvos: os NÚMEROS da lista acima que correspondem ao que a pessoa citou. Inclua mais de um só se estiver genuinamente ambíguo; se nada corresponder, use [].`;

  const corpo = {
    model: MODEL,
    max_tokens: 350,
    system: instrucao + listaLanc,
    messages: [{ role: "user", content: texto + dica }],
  };

  try {
    const resp = await chamarAnthropic(apiKey, corpo);

    if (!resp.ok) {
      const detalhe = await resp.text().catch(() => "");
      const txt = String(detalhe);
      if (resp.status === 401 || resp.status === 403) {
        return json({ ok: false, erro: "chave_invalida",
          mensagem: "A chave da IA foi recusada (inválida ou expirada). Gere uma nova chave em console.anthropic.com e atualize ANTHROPIC_API_KEY no Netlify (depois faça um redeploy)." });
      }
      if (/credit|billing|quota|insufficient|balance/i.test(txt)) {
        return json({ ok: false, erro: "sem_credito",
          mensagem: "A conta da IA está sem créditos. Adicione créditos em console.anthropic.com (Plans & Billing) e tente de novo." });
      }
      if (resp.status === 429 || /rate|overloaded/i.test(txt)) {
        return json({ ok: false, erro: "limite",
          mensagem: "A IA está ocupada no momento. Aguarde alguns segundos e tente de novo." });
      }
      return json({ ok: false, erro: "anthropic_error", status: resp.status,
        mensagem: `A IA retornou um erro (${resp.status}). Tente de novo em instantes.`,
        detalhe: txt.slice(0, 300) });
    }

    const data = await resp.json().catch(() => null);
    const bloco = (data?.content || []).find((b) => b.type === "text");
    const obj = extrairJSON(bloco?.text);

    // Ação "status": mudar o status de um lançamento já existente.
    if (obj && obj.acao === "status") {
      const novoStatus = obj.novoStatus === "pendente" ? "pendente" : "pago";
      const total = lancamentos.length;
      const alvos = Array.isArray(obj.alvos)
        ? [...new Set(obj.alvos.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n >= 1 && n <= total))]
        : [];
      return json({ ok: true, mudancaStatus: { novoStatus, alvos } });
    }

    // Ação "lancar" (padrão): devolve o lançamento como sempre.
    const lancamento = normalizar(obj);
    if (!lancamento) {
      return json({ ok: false, erro: "sem_resposta",
        mensagem: "A IA não entendeu a frase. Tente reformular (ex.: \"material elétrico, 300 reais, pago no pix\")." });
    }
    return json({ ok: true, lancamento });
  } catch (e) {
    return json({ ok: false, erro: "falha",
      mensagem: "Falha de conexão com a IA. Verifique a internet e tente de novo.", detalhe: String(e).slice(0, 200) });
  }
};

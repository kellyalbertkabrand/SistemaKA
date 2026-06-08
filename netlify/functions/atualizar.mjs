// Função do painel: dispara a coleta de notícias (workflow_dispatch no GitHub).
// O painel chama POST /.netlify/functions/atualizar e isto pede ao GitHub para
// rodar o workflow "daily.yml" — a mesma coleta das 07h/16h, só que na hora.
//
// Requer a variável de ambiente GITHUB_DISPATCH_TOKEN no Netlify:
//   - chave (fine-grained PAT) com permissão "Actions: Read and write" no repo.

const REPO = "kellyalbertkabrand/SistemaKA";
const WORKFLOW = "daily.yml";
const REF = "claude/branding-ai-news-aggregator-pY5az"; // branch principal do repo

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export default async (req) => {
  if (req.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token) {
    return json({ ok: false, error: "token_missing" }, 500);
  }
  try {
    const resp = await fetch(
      `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "sistemaka-panel",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: REF }),
      }
    );
    if (resp.status === 204) {
      return json({ ok: true }, 200);
    }
    const detail = await resp.text();
    return json({ ok: false, error: "github_error", status: resp.status, detail }, 502);
  } catch (e) {
    return json({ ok: false, error: "fetch_failed", detail: String(e) }, 502);
  }
};

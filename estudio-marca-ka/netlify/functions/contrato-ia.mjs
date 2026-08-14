// ============================================================================
// FUNÇÃO DE SERVIDOR (Netlify) — Assistente de IA para ajustar contratos.
//
// Recebe do front { contrato, instrucao } e pede à IA (Claude / Anthropic) o
// contrato revisado. A CHAVE da Anthropic fica SÓ aqui, na variável de ambiente
// ANTHROPIC_API_KEY do Netlify — NUNCA vai para o navegador.
//
// Configurar no Netlify (Site settings → Environment variables):
//   ANTHROPIC_API_KEY = sk-ant-...            (obrigatória)
//   ANTHROPIC_MODEL   = claude-sonnet-5       (opcional; padrão abaixo)
// ============================================================================

const MODELO = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5'

const SISTEMA = [
  'Você é um assistente que ajuda a Kelly Albert (designer de marca) a ajustar CONTRATOS de prestação de serviço, em português do Brasil.',
  'Você recebe o TEXTO ATUAL do contrato e uma INSTRUÇÃO de ajuste da Kelly.',
  'Responda SEMPRE em JSON válido, sem nenhum texto fora do JSON, com exatamente duas chaves:',
  '"contrato": o texto COMPLETO do contrato já com o ajuste pedido (não devolva só o trecho — devolva o contrato inteiro);',
  '"resumo": uma frase curta, em português, do que você mudou.',
  'Regras: preserve intactos os campos entre chaves como {{cliente_nome}}, {{cliente_documento}}, {{data}} se existirem; mantenha a formatação e o tom; escreva cláusulas claras e justas para os dois lados; não invente cláusulas abusivas nem promessas irreais.',
  'Se a instrução não fizer sentido jurídico ou for arriscada, faça o melhor possível e avise no "resumo".',
].join(' ')

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return resposta(405, { erro: 'Método não permitido.' })
  }

  // Aceita os dois nomes (a KA cadastrou como ANTHROPIC_API_KEY_CONTRATO) e
  // remove espaços/quebras de linha acidentais coladas junto com a chave.
  const chave = (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY_CONTRATO || '').trim()
  if (!chave) {
    // Diagnóstico: a função não achou ANTHROPIC_API_KEY. Lista os NOMES de
    // variáveis parecidos (só nomes, nunca valores) para revelar um erro de
    // digitação no nome ou um escopo que não inclui "Functions".
    const parecidas = Object.keys(process.env).filter((k) => /anthro|antro|api.?key|_key$/i.test(k))
    const dica = parecidas.length
      ? ` [A função enxerga estas variáveis parecidas: ${parecidas.join(', ')} — confira se o nome é exatamente ANTHROPIC_API_KEY.]`
      : ' [A função NÃO enxerga nenhuma variável parecida — provavelmente o escopo da variável não inclui "Functions", ou ela foi salva em outro site/contexto.]'
    return resposta(200, {
      erro:
        'A IA ainda não está configurada. Confira a variável ANTHROPIC_API_KEY no Netlify ' +
        '(nome exato + escopo incluindo Functions) e publique de novo.' +
        dica,
    })
  }

  let dados = {}
  try {
    dados = JSON.parse(event.body || '{}')
  } catch {
    dados = {}
  }
  const contrato = String(dados.contrato || '')
  const instrucao = String(dados.instrucao || '').trim()
  if (!instrucao) return resposta(400, { erro: 'Escreva o que você quer ajustar.' })

  const pergunta = `TEXTO ATUAL DO CONTRATO:\n"""\n${contrato}\n"""\n\nINSTRUÇÃO DA KELLY: ${instrucao}`

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': chave,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 4096,
        system: SISTEMA,
        messages: [{ role: 'user', content: pergunta }],
      }),
    })

    if (!r.ok) {
      const detalhe = await r.text().catch(() => '')
      let amigavel
      if (r.status === 401) {
        amigavel =
          'A chave da IA foi RECUSADA (inválida). Isso quase sempre é a chave copiada pela metade. ' +
          'Gere uma chave NOVA em console.anthropic.com → API Keys → Create Key, copie ela INTEIRA ' +
          '(começa com sk-ant- e é bem longa) e cole de novo no Netlify na variável ' +
          'ANTHROPIC_API_KEY_CONTRATO; depois publique.'
      } else if (r.status === 400 && /credit|balance|insufficient/i.test(detalhe)) {
        amigavel = 'A conta da IA está sem crédito. Adicione crédito em console.anthropic.com → Billing e tente de novo.'
      } else if (r.status === 429) {
        amigavel = 'A IA atingiu o limite de uso por agora. Tente de novo em instantes.'
      } else {
        amigavel = `A IA respondeu com um erro (${r.status}). ${detalhe.slice(0, 200)}`
      }
      return resposta(200, { erro: amigavel })
    }

    const j = await r.json()
    const texto = (j.content || []).map((c) => c?.text || '').join('').trim()

    // A resposta deve ser um JSON { contrato, resumo }. Se vier "sujo", tenta
    // extrair o primeiro bloco { ... }.
    let out
    try {
      out = JSON.parse(texto)
    } catch {
      const m = texto.match(/\{[\s\S]*\}/)
      out = m ? JSON.parse(m[0]) : { contrato: texto, resumo: 'Ajuste aplicado.' }
    }

    return resposta(200, {
      contrato: String(out.contrato || contrato),
      resumo: String(out.resumo || 'Ajuste aplicado.'),
    })
  } catch {
    return resposta(200, { erro: 'Não deu para falar com a IA agora. Tente de novo em instantes.' })
  }
}

function resposta(statusCode, corpo) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(corpo),
  }
}

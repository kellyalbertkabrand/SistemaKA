// Renderiza o conteúdo de um contrato.
//
// O corpo vai num <pre> (preserva quebras de linha). Se o texto tiver o marcador
// [ASSINATURAS], tudo o que vem depois é lido como bloco de assinaturas, uma por
// linha no formato  PAPEL | Nome | Documento  — e desenhado centralizado, com um
// traço maior (a "linha de assinatura"). Sem o marcador, renderiza igual a antes
// (compatível com os modelos antigos).

interface Assinatura {
  papel: string
  nome: string
  doc: string
}

function lerAssinaturas(bloco: string): Assinatura[] {
  return bloco
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      // papel | nome | doc — o "doc" pode conter '|' (ex.: "KA | Inteligência
      // para Marcas"), então junta o que sobrar depois do 2º separador.
      const partes = l.split('|')
      const papel = (partes[0] ?? '').trim()
      const nome = (partes[1] ?? '').trim()
      const doc = partes.slice(2).join('|').trim()
      return { papel, nome, doc }
    })
}

/**
 * Separa o "fecho" do contrato (o encerramento "E, por estarem…", o foro e a
 * data) do restante do corpo, para o fecho ficar SEMPRE junto das assinaturas na
 * impressão — nunca uma assinatura órfã no topo de uma página. Se não achar o
 * encerramento, usa o último parágrafo como fecho.
 */
function separarFecho(corpo: string): { principal: string; fecho: string } {
  const p = corpo.toLowerCase().indexOf('por estarem')
  if (p >= 0) {
    const ini = corpo.lastIndexOf('\n', p)
    const corte = ini >= 0 ? ini : 0
    return { principal: corpo.slice(0, corte).replace(/\s+$/, ''), fecho: corpo.slice(corte).trim() }
  }
  const idx = corpo.lastIndexOf('\n\n')
  if (idx >= 0) return { principal: corpo.slice(0, idx).replace(/\s+$/, ''), fecho: corpo.slice(idx).trim() }
  return { principal: '', fecho: corpo }
}

export function ContratoView({ conteudo }: { conteudo: string }) {
  const marca = '[ASSINATURAS]'
  const i = conteudo.indexOf(marca)
  if (i === -1) {
    return <pre className="conteudo">{conteudo}</pre>
  }
  const corpo = conteudo.slice(0, i).replace(/\s+$/, '')
  const assinaturas = lerAssinaturas(conteudo.slice(i + marca.length))
  const { principal, fecho } = separarFecho(corpo)
  return (
    <div className="contrato-doc">
      {principal && <pre className="conteudo">{principal}</pre>}
      {/* Fecho (encerramento + foro + data) + assinaturas ficam JUNTOS na
          impressão — não quebram no meio (ver .contrato-fecho em gestao.css). */}
      <div className="contrato-fecho">
        {fecho && <pre className="conteudo contrato-fecho__texto">{fecho}</pre>}
        <div className="assinaturas">
          {assinaturas.map((a, k) => (
            <div className="assinatura" key={k}>
              {a.papel && <div className="assinatura__papel">{a.papel}</div>}
              <div className="assinatura__traco" />
              {a.nome && <div className="assinatura__nome">{a.nome}</div>}
              {a.doc && <div className="assinatura__doc">{a.doc}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

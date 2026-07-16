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
      const [papel = '', nome = '', doc = ''] = l.split('|').map((s) => s.trim())
      return { papel, nome, doc }
    })
}

export function ContratoView({ conteudo }: { conteudo: string }) {
  const marca = '[ASSINATURAS]'
  const i = conteudo.indexOf(marca)
  if (i === -1) {
    return <pre className="conteudo">{conteudo}</pre>
  }
  const corpo = conteudo.slice(0, i).replace(/\s+$/, '')
  const assinaturas = lerAssinaturas(conteudo.slice(i + marca.length))
  return (
    <div className="contrato-doc">
      <pre className="conteudo">{corpo}</pre>
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
  )
}

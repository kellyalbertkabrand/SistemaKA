import { useState } from 'react'
import { templatesDoCliente } from '../templates/registry'
import type { Template } from '../templates/types'
import { EditorPeca } from './EditorPeca'

// Estúdio de uma marca: lista os templates daquela marca e abre o editor real.
// Reutilizado pelo painel da KA (por cliente) e pela área do cliente.
export function BrandStudio({ slug }: { slug: string }) {
  const templates = templatesDoCliente(slug)
  const [sel, setSel] = useState<Template | null>(
    templates.length === 1 ? templates[0] : null,
  )

  if (templates.length === 0) {
    return (
      <div className="card">
        <h3>Nenhum template para esta marca ainda.</h3>
        <p>Os layouts desta marca serão adicionados em breve.</p>
      </div>
    )
  }

  if (sel) {
    return (
      <>
        <div className="page__head">
          <div className="eyebrow">{sel.clienteNome}</div>
          <h1>{sel.nome}</h1>
          <p>{sel.descricao}</p>
          {templates.length > 1 && (
            <p style={{ marginTop: '0.7rem' }}>
              <button className="btn btn--ghost" onClick={() => setSel(null)}>
                ← Trocar template
              </button>
            </p>
          )}
        </div>
        <EditorPeca template={sel} />
      </>
    )
  }

  return (
    <>
      <div className="page__head">
        <div className="eyebrow">{templates[0].clienteNome}</div>
        <h1>Escolha um template</h1>
        <p>Selecione o modelo que você quer gerar.</p>
      </div>
      {templates.map((t) => (
        <button
          key={t.id}
          className="card"
          style={{ display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer' }}
          onClick={() => setSel(t)}
        >
          <h3>{t.nome}</h3>
          <p>{t.descricao}</p>
        </button>
      ))}
    </>
  )
}

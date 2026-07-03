import { useState } from 'react'
import { templatesDoCliente } from '../templates/registry'
import type { Template } from '../templates/types'
import { EditorPeca } from './EditorPeca'
import { Carrossel } from './Carrossel'

type Selecao = Template | 'carrossel' | null

// Estúdio de uma marca: lista os templates daquela marca e abre o editor real.
// Reutilizado pelo painel da KA (por cliente) e pela área do cliente.
export function BrandStudio({ slug }: { slug: string }) {
  const templates = templatesDoCliente(slug)
  const [sel, setSel] = useState<Selecao>(null)

  if (templates.length === 0) {
    return (
      <div className="card">
        <h3>Nenhum template para esta marca ainda.</h3>
        <p>Os layouts desta marca serão adicionados em breve.</p>
      </div>
    )
  }

  if (sel === 'carrossel') {
    return (
      <>
        <div className="page__head">
          <div className="eyebrow">{templates[0].clienteNome}</div>
          <h1>Montar carrossel</h1>
          <p>Até 10 slides. Em cada slide, escolha o template e preencha.</p>
          <p style={{ marginTop: '0.7rem' }}>
            <button className="btn btn--ghost" onClick={() => setSel(null)}>
              ← Voltar
            </button>
          </p>
        </div>
        <Carrossel templates={templates} />
      </>
    )
  }

  if (sel) {
    return (
      <>
        <div className="page__head">
          <div className="eyebrow">{sel.clienteNome}</div>
          <h1>{sel.nome}</h1>
          <p>{sel.descricao}</p>
          <p style={{ marginTop: '0.7rem' }}>
            <button className="btn btn--ghost" onClick={() => setSel(null)}>
              ← Trocar template
            </button>
          </p>
        </div>
        <EditorPeca template={sel} />
      </>
    )
  }

  return (
    <>
      <div className="page__head">
        <div className="eyebrow">{templates[0].clienteNome}</div>
        <h1>O que você quer criar?</h1>
        <p>Escolha um modelo para uma peça única, ou monte um carrossel.</p>
      </div>

      <button
        className="card"
        style={{ display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer' }}
        onClick={() => setSel('carrossel')}
      >
        <h3>🎞️ Montar carrossel</h3>
        <p>Sequência de até 10 slides, cada um com o template que você escolher.</p>
      </button>

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

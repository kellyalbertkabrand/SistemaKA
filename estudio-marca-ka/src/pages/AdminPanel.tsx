import { useState } from 'react'
import { TopBar } from '../components/TopBar'
import { clientesComTemplates } from '../templates/registry'
import { marcaVisual } from '../templates/marcas'
import { BrandStudio } from '../components/BrandStudio'
import { GateAdmin } from './gestao/GateAdmin'
import { GestaoClientes } from './gestao/GestaoClientes'
import { GestaoOrcamentos } from './gestao/GestaoOrcamentos'
import { GestaoContratos } from './gestao/GestaoContratos'
import { GestaoCobrancas } from './gestao/GestaoCobrancas'
import '../styles/painel.css'
import '../styles/gestao.css'

type Aba = 'estudio' | 'clientes' | 'orcamentos' | 'contratos' | 'cobrancas'

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'estudio', rotulo: 'Estúdio' },
  { id: 'clientes', rotulo: 'Clientes & Acessos' },
  { id: 'orcamentos', rotulo: 'Orçamentos' },
  { id: 'contratos', rotulo: 'Contratos' },
  { id: 'cobrancas', rotulo: 'Cobranças' },
]

const CABECALHOS: Record<Aba, { titulo: string; sub: string }> = {
  estudio: { titulo: 'Seus clientes', sub: 'Selecione um cliente para gerar as artes na identidade dele.' },
  clientes: { titulo: 'Clientes & Acessos', sub: 'Ficha com os dados de cada cliente e quem pode entrar no sistema.' },
  orcamentos: { titulo: 'Orçamentos', sub: 'Monte a proposta, envie o link; aprovado, vira contrato + cobrança.' },
  contratos: { titulo: 'Contratos', sub: 'Modelo padrão, contratos gerados e assinaturas (aceite digital).' },
  cobrancas: { titulo: 'Cobranças', sub: 'Mensalidades e cobranças avulsas — boleto, PIX e cartão via Mercado Pago.' },
}

// Painel da KA: estúdio (aberto) + gestão (restrita à admin logada).
export function AdminPanel() {
  const [aba, setAba] = useState<Aba>('estudio')
  const [slug, setSlug] = useState<string | null>(null)
  const clientes = clientesComTemplates()
  const cab = CABECALHOS[aba]

  return (
    <>
      <TopBar />
      <div className="page">
        <nav className="painel-abas" aria-label="Seções do painel">
          {ABAS.map((a) => (
            <button
              key={a.id}
              className={`painel-aba ${aba === a.id ? 'ativa' : ''}`}
              onClick={() => {
                setAba(a.id)
                setSlug(null)
              }}
            >
              {a.rotulo}
            </button>
          ))}
        </nav>

        {aba === 'estudio' && slug ? (
          <>
            <p style={{ marginBottom: '1rem' }}>
              <button className="btn--voltar" onClick={() => setSlug(null)}>
                ← Todos os clientes
              </button>
            </p>
            <BrandStudio slug={slug} />
          </>
        ) : (
          <>
            <div className="page__head">
              <div className="eyebrow">Painel KA</div>
              <h1>{cab.titulo}</h1>
              <p>{cab.sub}</p>
            </div>

            {aba === 'estudio' && (
              <>
                {clientes.length === 0 && (
                  <div className="card">
                    <h3>Nenhum cliente ainda.</h3>
                    <p>Os clientes aparecem aqui conforme seus layouts são integrados ao sistema.</p>
                  </div>
                )}
                <div className="grade-clientes">
                  {clientes.map((c) => {
                    const m = marcaVisual(c.slug)
                    return (
                      <button key={c.slug} className="cliente-card" onClick={() => setSlug(c.slug)}>
                        <div
                          className="cliente-card__capa"
                          style={{
                            backgroundColor: m.corPrincipal,
                            backgroundImage: m.capa ? `url(${m.capa})` : undefined,
                          }}
                        >
                          {m.logo ? <img src={m.logo} alt="" /> : <span>{c.nome}</span>}
                        </div>
                        <div className="cliente-card__corpo">
                          <h3>{c.nome}</h3>
                          {m.tagline && <div className="cliente-card__tagline">{m.tagline}</div>}
                          {m.paleta.length > 0 && (
                            <div className="cliente-card__paleta">
                              {m.paleta.map((cor) => (
                                <span key={cor} style={{ background: cor }} />
                              ))}
                            </div>
                          )}
                          <div className="cliente-card__rodape">
                            <span className="cliente-card__qtd">
                              {c.qtd} template{c.qtd > 1 ? 's' : ''}
                            </span>
                            <span className="cliente-card__cta">Abrir estúdio →</span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {aba === 'clientes' && (
              <GateAdmin>
                <GestaoClientes />
              </GateAdmin>
            )}
            {aba === 'orcamentos' && (
              <GateAdmin>
                <GestaoOrcamentos />
              </GateAdmin>
            )}
            {aba === 'contratos' && (
              <GateAdmin>
                <GestaoContratos />
              </GateAdmin>
            )}
            {aba === 'cobrancas' && (
              <GateAdmin>
                <GestaoCobrancas />
              </GateAdmin>
            )}
          </>
        )}
      </div>
    </>
  )
}

import type { ReactNode } from 'react'
import type { PropostaCampos } from '../../lib/database.types'
import { formatarData } from '../../lib/gestao'
import '../../styles/proposta.css'

// ============================================================================
// PROPOSTA COMERCIAL no layout KA, o documento que o cliente abre pelo link
// do orçamento (/orcamento/:token) quando a KA preenche o bloco "Proposta".
// Capa creme com a logo, ficha do cliente, seções numeradas em caramelo,
// cards de investimento e aceite. Imprimível em A4 (Baixar em PDF).
// ============================================================================

// `*asteriscos*` viram negrito (padrão dos textos da KA).
function negrito(texto: string): ReactNode[] {
  return texto.split('*').map((p, i) => (i % 2 === 1 ? <b key={i}>{p}</b> : <span key={i}>{p}</span>))
}

// Divide um bloco em linhas não vazias.
const linhas = (t?: string) => (t ?? '').split('\n').map((l) => l.trim()).filter(Boolean)

// Painel da seção 02: 1ª linha TÍTULO, 2ª subtítulo, demais = itens.
function Painel({ bloco }: { bloco: string }) {
  const [titulo, sub, ...itens] = linhas(bloco)
  if (!titulo) return null
  return (
    <div className="prop-painel">
      <h3>{titulo}</h3>
      {sub && <div className="sub">{sub}</div>}
      <ul>
        {itens.map((it, i) => (
          <li key={i}>{negrito(it)}</li>
        ))}
      </ul>
    </div>
  )
}

export interface PropostaDocDados {
  titulo: string
  destinatario_nome: string
  criado_em: string
  validade: string | null
  proposta: PropostaCampos
}

export function PropostaDoc({ dados }: { dados: PropostaDocDados }) {
  const p = dados.proposta
  const numDoc = formatarData(dados.criado_em).split('/').join('')
  const rodape = (
    <div className="prop-rodape">
      <span>KA · Inteligência para Marcas</span>
      <span>
        Proposta nº {numDoc}
        {p.cidade_rodape ? ` · ${p.cidade_rodape}` : ''}
      </span>
    </div>
  )

  // Numeração dinâmica: só as seções preenchidas contam.
  let n = 0
  const num = () => String(++n).padStart(2, '0')

  const [destaqueTitulo, ...destaqueResto] = linhas(p.destaque)
  const fases = linhas(p.fases).map((l) => {
    const [nome, ...resto] = l.split('|')
    return { nome: nome.trim(), desc: resto.join('|').trim() }
  })

  return (
    <div className="prop-doc">
      {/* ---- Capa ---- */}
      <div className="prop-topo">
        <div className="prop-topo__linha">
          <img className="prop-topo__logo" src="/logo-ka.png" alt="KA | Inteligência para Marcas" />
          <div className="prop-topo__doc">
            Proposta comercial
            <br />
            <b>Documento nº {numDoc}</b>
          </div>
        </div>
        <div className="prop-capa">
          <h1>{dados.titulo}</h1>
          {p.subtitulo && <p>{negrito(p.subtitulo)}</p>}
        </div>
        <div className="prop-fichas">
          <div className="prop-ficha">
            <div className="rot">Cliente</div>
            <div className="val">{dados.destinatario_nome}</div>
          </div>
          {p.cidade && (
            <div className="prop-ficha">
              <div className="rot">Endereço</div>
              <div className="val menor">{p.cidade}</div>
            </div>
          )}
          <div className="prop-ficha">
            <div className="rot">Emissão</div>
            <div className="val">{formatarData(dados.criado_em)}</div>
          </div>
          {dados.validade && (
            <div className="prop-ficha">
              <div className="rot">Validade</div>
              <div className="val">{formatarData(dados.validade)}</div>
            </div>
          )}
        </div>
      </div>

      {/* ---- 01 · Objeto ---- */}
      {p.objeto && (
        <div className="prop-secao">
          <div className="prop-secao__titulo">
            <span className="num">{num()}</span>
            <h2>Objeto da proposta</h2>
          </div>
          <p className="prop-texto">{negrito(p.objeto)}</p>
        </div>
      )}

      {/* ---- 02 · Escopo (painéis + destaque) ---- */}
      {(p.painel_a || p.painel_b || p.destaque) && (
        <div className="prop-secao prop-quebra">
          <div className="prop-secao__titulo">
            <span className="num">{num()}</span>
            <h2>O que o estúdio contempla</h2>
          </div>
          {(p.painel_a || p.painel_b) && (
            <div className="prop-paineis">
              {p.painel_a && <Painel bloco={p.painel_a} />}
              {p.painel_b && <Painel bloco={p.painel_b} />}
            </div>
          )}
          {destaqueTitulo && (
            <div className="prop-destaque">
              <h3>{destaqueTitulo}</h3>
              <p className="prop-texto">{negrito(destaqueResto.join(' '))}</p>
            </div>
          )}
        </div>
      )}

      {/* ---- 03 · Incluído na mensalidade ---- */}
      {p.incluso && (
        <div className="prop-secao prop-quebra">
          <div className="prop-secao__titulo">
            <span className="num">{num()}</span>
            <h2>O que está incluído na mensalidade</h2>
          </div>
          <p className="prop-texto" style={{ marginBottom: '4mm' }}>
            O plano mensal é <b>tudo incluído</b>: a KA cuida de toda a infraestrutura e da operação.
          </p>
          <div className="prop-checks">
            {linhas(p.incluso).map((l, i) => (
              <div className="prop-check" key={i}>
                <span className="ok">✓</span>
                <span>{negrito(l)}</span>
              </div>
            ))}
          </div>
          {p.necessario && (
            <div className="prop-aviso">
              <h4>Necessário da cliente</h4>
              <p className="prop-texto">{negrito(p.necessario)}</p>
            </div>
          )}
        </div>
      )}

      {/* ---- 04 · Prazo e entrega ---- */}
      {(p.prazo || p.entrega) && (
        <div className="prop-secao">
          <div className="prop-secao__titulo">
            <span className="num">{num()}</span>
            <h2>Prazo e entrega</h2>
          </div>
          <div className="prop-condicoes" style={{ marginTop: 0 }}>
            {p.prazo && (
              <div className="prop-cond">
                <span className="rot">Prazo de implantação</span>
                <span>{negrito(p.prazo)}</span>
              </div>
            )}
            {p.entrega && (
              <div className="prop-cond">
                <span className="rot">Entrega</span>
                <span>{negrito(p.entrega)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- 05 · Fases futuras ---- */}
      {fases.length > 0 && (
        <div className="prop-secao prop-quebra">
          <div className="prop-secao__titulo">
            <span className="num">{num()}</span>
            <h2>Evolução e próximas fases</h2>
          </div>
          <p className="prop-texto" style={{ marginBottom: '4mm' }}>
            O estúdio é modular e cresce conforme a necessidade da marca. Fases futuras são
            opcionais e orçadas à parte.
          </p>
          <div>
            {fases.map((f, i) => (
              <div className="prop-fase" key={i}>
                <span className="num">FASE {i + 1}</span>
                <div>
                  <h4>{f.nome}</h4>
                  {f.desc && <p>{negrito(f.desc)}</p>}
                </div>
                <span className="sob">SOB CONSULTA</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- 06 · Investimento ---- */}
      {(p.impl_valor || p.mensal_valor) && (
        <div className="prop-secao">
          <div className="prop-secao__titulo">
            <span className="num">{num()}</span>
            <h2>Investimento</h2>
          </div>
          <div className="prop-invest">
            {p.impl_valor && (
              <div className="prop-card-preco">
                <h4>{p.impl_titulo || 'Valor da implantação'}</h4>
                <div className="preco">{p.impl_valor}</div>
                {p.impl_sub && <div className="detalhe">{negrito(p.impl_sub)}</div>}
                {p.impl_desc && <p>{negrito(p.impl_desc)}</p>}
              </div>
            )}
            {p.mensal_valor && (
              <div className="prop-card-preco borda">
                <h4>{p.mensal_titulo || 'Mensalidade'}</h4>
                <div className="preco">{p.mensal_valor}</div>
                {p.mensal_desc &&
                  linhas(p.mensal_desc).map((l, i) => (
                    <p key={i} style={i ? { marginTop: '2mm' } : undefined}>
                      {negrito(l)}
                    </p>
                  ))}
              </div>
            )}
          </div>
          {(p.pagamento || p.fidelidade || p.reajuste) && (
            <div className="prop-condicoes">
              {p.pagamento && (
                <div className="prop-cond">
                  <span className="rot">Forma de pagamento</span>
                  <span>{negrito(p.pagamento)}</span>
                </div>
              )}
              {p.fidelidade && (
                <div className="prop-cond">
                  <span className="rot">Fidelidade</span>
                  <span>{negrito(p.fidelidade)}</span>
                </div>
              )}
              {p.reajuste && (
                <div className="prop-cond">
                  <span className="rot">Reajuste</span>
                  <span>{negrito(p.reajuste)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---- Aceite ---- */}
      <div className="prop-aceite">
        <h3>Aceite da proposta</h3>
        <p className="prop-texto">
          Ao aprovar, <b>{dados.destinatario_nome}</b> aceita o escopo e as condições descritas
          neste documento e autoriza a KA a iniciar a implantação.
          {dados.validade && (
            <>
              {' '}
              Proposta válida até <b>{formatarData(dados.validade)}</b>.
            </>
          )}
        </p>
        {p.proximos && (
          <p className="prop-texto" style={{ marginTop: '3mm' }}>
            <b>Próximos passos:</b> {negrito(p.proximos)}
          </p>
        )}
        <div className="prop-assinaturas">
          <div className="prop-ass">
            <b>{dados.destinatario_nome}</b>
            <span>CONTRATANTE</span>
          </div>
          <div className="prop-ass">
            <b>KA · Inteligência para Marcas</b>
            <span>CONTRATADA</span>
          </div>
        </div>
      </div>

      {rodape}
    </div>
  )
}

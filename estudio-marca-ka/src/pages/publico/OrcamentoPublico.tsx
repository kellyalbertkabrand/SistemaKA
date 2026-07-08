import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  orcamentoPorToken,
  responderOrcamento,
  formatarBRL,
  formatarData,
  type OrcamentoPublico as Orc,
} from '../../lib/gestao'
import { PropostaDoc } from './PropostaDoc'
import '../../styles/gestao.css'

// Página que o cliente/prospect abre pelo link enviado pela KA.
// Aprovar gera contrato + cobrança e leva direto à página do contrato.
export function OrcamentoPublico() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [orc, setOrc] = useState<Orc | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [respondendo, setRespondendo] = useState(false)
  const [aceitando, setAceitando] = useState(false)
  const [nome, setNome] = useState('')
  const [documento, setDocumento] = useState('')

  useEffect(() => {
    if (!token) return
    orcamentoPorToken(token)
      .then((o) => {
        setOrc(o)
        if (o) setNome(o.destinatario_nome)
      })
      .catch((e) => setErro(e instanceof Error ? e.message : String(e)))
      .finally(() => setCarregando(false))
  }, [token])

  async function aprovar(e: FormEvent) {
    e.preventDefault()
    if (!token) return
    setRespondendo(true)
    setErro(null)
    try {
      const contratoToken = await responderOrcamento(token, true, nome, documento)
      if (contratoToken) {
        navigate(`/contrato/${contratoToken}`)
      } else {
        const o = await orcamentoPorToken(token)
        setOrc(o)
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err))
    } finally {
      setRespondendo(false)
    }
  }

  async function recusar() {
    if (!token || !window.confirm('Recusar este orçamento?')) return
    setRespondendo(true)
    setErro(null)
    try {
      await responderOrcamento(token, false)
      const o = await orcamentoPorToken(token)
      setOrc(o)
      setAceitando(false)
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err))
    } finally {
      setRespondendo(false)
    }
  }

  if (carregando) {
    return (
      <div className="pub-wrap">
        <div className="pub-doc">Carregando…</div>
      </div>
    )
  }

  if (!orc) {
    return (
      <div className="pub-wrap">
        <div className="pub-doc">
          <h1>Orçamento não encontrado</h1>
          <p style={{ marginTop: '0.6rem', color: 'var(--t-500)' }}>
            Confira se o link foi copiado por inteiro, ou fale com a Kelly.
          </p>
        </div>
      </div>
    )
  }

  const aberto = orc.status === 'enviado'
  const temProposta = !!orc.proposta && Object.values(orc.proposta).some((v) => String(v ?? '').trim())

  // Com a proposta no layout KA preenchida, o documento vira a PROPOSTA
  // COMERCIAL completa; senão, o orçamento simples de sempre (tabela).
  return (
    <div className="pub-wrap">
      <div className="pub-doc" style={temProposta ? { padding: 0, background: 'transparent', boxShadow: 'none' } : undefined}>
        {temProposta ? (
          <PropostaDoc
            dados={{
              titulo: orc.titulo,
              destinatario_nome: orc.destinatario_nome,
              criado_em: orc.criado_em,
              validade: orc.validade,
              proposta: orc.proposta!,
            }}
          />
        ) : (
          <>
            <div className="pub-doc__head">
              <div className="eyebrow">Orçamento · Kelly Albert, KA</div>
              <h1>{orc.titulo}</h1>
              <div className="pub-doc__meta">
                Para {orc.destinatario_nome} · emitido em {formatarData(orc.criado_em)}
                {orc.validade && <> · válido até {formatarData(orc.validade)}</>}
              </div>
            </div>

            {orc.descricao && <p style={{ marginBottom: '0.6rem' }}>{orc.descricao}</p>}

            <table className="pub-tabela">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="num">Qtd</th>
                  <th className="num">Valor</th>
                  <th className="num">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {orc.itens.map((i, idx) => (
                  <tr key={idx}>
                    <td>{i.descricao}</td>
                    <td className="num">{i.qtd}</td>
                    <td className="num">{formatarBRL(i.valor)}</td>
                    <td className="num">{formatarBRL(i.qtd * i.valor)}</td>
                  </tr>
                ))}
                {orc.desconto > 0 && (
                  <tr>
                    <td colSpan={3}>Desconto</td>
                    <td className="num">− {formatarBRL(orc.desconto)}</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="pub-total">
              Total <strong>{formatarBRL(orc.valor_total)}</strong>
            </div>

            {orc.condicoes && (
              <p style={{ fontSize: '0.82rem', color: 'var(--t-500)' }}>{orc.condicoes}</p>
            )}
          </>
        )}

        {erro && <div className="erro-msg" style={{ marginTop: '1rem' }}>{erro}</div>}

        {aberto && !aceitando && (
          <div className="pub-acoes nao-imprimir">
            <button className="btn" onClick={() => setAceitando(true)}>
              Aprovar orçamento
            </button>
            <button className="btn btn--recusar" disabled={respondendo} onClick={() => void recusar()}>
              Recusar
            </button>
            <button className="btn--voltar" onClick={() => window.print()}>
              Baixar em PDF
            </button>
          </div>
        )}

        {aberto && aceitando && (
          <form onSubmit={(e) => void aprovar(e)} className="nao-imprimir" style={{ marginTop: '1.4rem' }}>
            <p style={{ fontSize: '0.85rem', marginBottom: '0.8rem' }}>
              Para aprovar, confirme seus dados, eles entram no contrato gerado em seguida.
            </p>
            <div className="form-grade">
              <div className="field">
                <label>Nome completo</label>
                <input value={nome} onChange={(e) => setNome(e.target.value)} required />
              </div>
              <div className="field">
                <label>CPF ou CNPJ</label>
                <input value={documento} onChange={(e) => setDocumento(e.target.value)} required />
              </div>
            </div>
            <div className="pub-acoes">
              <button className="btn" type="submit" disabled={respondendo}>
                {respondendo ? 'Gerando contrato…' : 'Confirmar aprovação'}
              </button>
              <button type="button" className="btn--voltar" onClick={() => setAceitando(false)}>
                Voltar
              </button>
            </div>
          </form>
        )}

        {!aberto && (
          <div className={orc.status === 'aprovado' ? 'pub-assinado' : 'nota'} style={{ marginTop: '1.2rem' }}>
            {orc.status === 'aprovado' && (
              <>Orçamento aprovado em {formatarData(orc.respondido_em)}. O contrato foi gerado, o link foi exibido na aprovação (a Kelly também pode reenviar).</>
            )}
            {orc.status === 'recusado' && <>Este orçamento foi recusado em {formatarData(orc.respondido_em)}.</>}
            {orc.status === 'expirado' && <>Este orçamento expirou. Fale com a Kelly para uma nova proposta.</>}
            {orc.status === 'rascunho' && <>Este orçamento ainda não foi liberado para resposta.</>}
          </div>
        )}

        <div className="pub-rodape">Sistema Visual de Publicações da Marca · KA</div>
      </div>
    </div>
  )
}

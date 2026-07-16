import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import {
  assinarContrato,
  contratoPorToken,
  formatarData,
  type ContratoPublico as Ctr,
} from '../../lib/gestao'
import { ContratoView } from '../../components/ContratoView'
import { imprimirComoPdf } from '../../lib/ui'
import '../../styles/gestao.css'

// Página pública do contrato: o cliente lê e registra o aceite digital
// (nome + CPF/CNPJ + data/hora ficam gravados no contrato).
export function ContratoPublico() {
  const { token } = useParams<{ token: string }>()
  const [contrato, setContrato] = useState<Ctr | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [documento, setDocumento] = useState('')
  const [aceite, setAceite] = useState(false)
  const [assinando, setAssinando] = useState(false)

  async function carregar() {
    if (!token) return
    try {
      setContrato(await contratoPorToken(token))
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    void carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function assinar(e: FormEvent) {
    e.preventDefault()
    if (!token) return
    setAssinando(true)
    setErro(null)
    try {
      await assinarContrato(token, nome, documento)
      await carregar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err))
    } finally {
      setAssinando(false)
    }
  }

  if (carregando) {
    return (
      <div className="pub-wrap">
        <div className="pub-doc">Carregando…</div>
      </div>
    )
  }

  if (!contrato) {
    return (
      <div className="pub-wrap">
        <div className="pub-doc">
          <h1>Contrato não encontrado</h1>
          <p style={{ marginTop: '0.6rem', color: 'var(--t-500)' }}>
            Confira se o link foi copiado por inteiro, ou fale com a Kelly.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="pub-wrap">
      <div className="pub-doc">
        <div className="pub-doc__head">
          <div className="eyebrow">Contrato · Kelly Albert, KA</div>
          <h1>{contrato.titulo}</h1>
          <div className="pub-doc__meta">emitido em {formatarData(contrato.criado_em)}</div>
        </div>

        <ContratoView conteudo={contrato.conteudo} />

        {erro && <div className="erro-msg" style={{ marginTop: '1rem' }}>{erro}</div>}

        {contrato.status === 'assinado' && (
          <div className="pub-assinado">
            ✓ Contrato assinado por {contrato.assinatura_nome} em {formatarData(contrato.assinado_em)}.
            Guarde este link como comprovante, e você pode salvar em PDF no botão abaixo.
          </div>
        )}

        {contrato.status === 'cancelado' && (
          <div className="nota" style={{ marginTop: '1.2rem' }}>
            Este contrato foi cancelado.
          </div>
        )}

        {(contrato.status === 'enviado' || contrato.status === 'rascunho') && (
          <form onSubmit={(e) => void assinar(e)} className="nao-imprimir" style={{ marginTop: '1.6rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.7rem' }}>Aceite digital</h3>
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
            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.82rem', marginBottom: '1rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={aceite}
                onChange={(e) => setAceite(e.target.checked)}
                style={{ marginTop: 3 }}
              />
              <span>
                Li e concordo com os termos deste contrato. Entendo que este aceite eletrônico
                (nome, documento, data e hora) registra minha concordância.
              </span>
            </label>
            <div className="pub-acoes">
              <button className="btn" type="submit" disabled={assinando || !aceite}>
                {assinando ? 'Registrando…' : 'Assinar contrato'}
              </button>
              <button
                type="button"
                className="btn--voltar"
                onClick={() => imprimirComoPdf(contrato.titulo, nome || contrato.assinatura_nome)}
              >
                Baixar em PDF
              </button>
            </div>
          </form>
        )}

        {contrato.status === 'assinado' && (
          <div className="pub-acoes nao-imprimir">
            <button className="btn--voltar" onClick={() => window.print()}>
              Baixar em PDF
            </button>
          </div>
        )}

        <div className="pub-rodape">Sistema Visual de Publicações da Marca · KA</div>
      </div>
    </div>
  )
}

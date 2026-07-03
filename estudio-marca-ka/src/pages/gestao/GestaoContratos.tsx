import { useEffect, useState } from 'react'
import type { Contrato, ContratoStatus, ModeloContrato } from '../../lib/database.types'
import {
  atualizarContrato,
  excluirContrato,
  listarContratos,
  linkPublicoContrato,
  listarModelosContrato,
  salvarModeloContrato,
  formatarData,
} from '../../lib/gestao'

const BADGE_CONTRATO: Record<ContratoStatus, string> = {
  rascunho: 'badge--cinza',
  enviado: 'badge--azul',
  assinado: 'badge--verde',
  cancelado: 'badge--vermelho',
}

// Contratos: gerados automaticamente na aprovação do orçamento; aqui a KA
// acompanha, copia o link de assinatura e edita o MODELO padrão.
export function GestaoContratos() {
  const [lista, setLista] = useState<Contrato[]>([])
  const [vendo, setVendo] = useState<Contrato | null>(null)
  const [editandoModelo, setEditandoModelo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)

  async function recarregar() {
    try {
      setCarregando(true)
      setLista(await listarContratos())
      setErro(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    void recarregar()
  }, [])

  async function copiarLink(c: Contrato) {
    await navigator.clipboard.writeText(linkPublicoContrato(c.token))
    setMsg(`Link de assinatura de "${c.titulo}" copiado.`)
    setTimeout(() => setMsg(null), 4000)
  }

  async function cancelar(c: Contrato) {
    if (!window.confirm(`Cancelar o contrato "${c.titulo}"?`)) return
    try {
      await atualizarContrato(c.id, { status: 'cancelado' })
      await recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    }
  }

  async function excluir(c: Contrato) {
    if (!window.confirm(`Excluir o contrato "${c.titulo}"? Essa ação não pode ser desfeita.`)) return
    try {
      await excluirContrato(c.id)
      await recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    }
  }

  if (editandoModelo) {
    return <EditorModelo aoVoltar={() => setEditandoModelo(false)} />
  }

  if (vendo) {
    return (
      <>
        <p className="nao-imprimir" style={{ marginBottom: '1rem', display: 'flex', gap: '0.6rem' }}>
          <button className="btn--voltar" onClick={() => setVendo(null)}>
            ← Contratos
          </button>
          <button className="btn--voltar" onClick={() => window.print()}>
            Imprimir / PDF
          </button>
          <button className="btn--voltar" onClick={() => void copiarLink(vendo)}>
            Copiar link de assinatura
          </button>
        </p>
        <div className="pub-doc">
          <div className="pub-doc__head">
            <div className="eyebrow">Contrato · Kelly Albert — KA</div>
            <h1>{vendo.titulo}</h1>
            <div className="pub-doc__meta">
              criado em {formatarData(vendo.criado_em)} ·{' '}
              <span className={`badge ${BADGE_CONTRATO[vendo.status]}`}>{vendo.status}</span>
            </div>
          </div>
          <pre className="conteudo">{vendo.conteudo}</pre>
          {vendo.status === 'assinado' && (
            <div className="pub-assinado">
              Assinado por {vendo.assinatura_nome} ({vendo.assinatura_documento}) em{' '}
              {formatarData(vendo.assinado_em)}.
            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <>
      <div className="gestao-acoes">
        <span className="espaco" />
        <button className="btn--voltar" onClick={() => setEditandoModelo(true)}>
          Editar modelo de contrato
        </button>
      </div>

      {erro && <div className="erro-msg">{erro}</div>}
      {msg && <div className="nota">{msg}</div>}
      {carregando && <p style={{ color: 'var(--t-500)', fontSize: '0.85rem' }}>Carregando…</p>}

      {!carregando && lista.length === 0 && !erro && (
        <div className="card">
          <h3>Nenhum contrato ainda.</h3>
          <p>
            Contratos nascem automaticamente quando um orçamento é aprovado pelo cliente. Você
            também pode ajustar o <strong>modelo</strong> no botão acima.
          </p>
        </div>
      )}

      {lista.length > 0 && (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Contrato</th>
                <th>Criado</th>
                <th>Assinatura</th>
                <th>Status</th>
                <th className="acoes"></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.titulo}</strong>
                  </td>
                  <td>{formatarData(c.criado_em)}</td>
                  <td>
                    {c.status === 'assinado'
                      ? `${c.assinatura_nome} · ${formatarData(c.assinado_em)}`
                      : '—'}
                  </td>
                  <td>
                    <span className={`badge ${BADGE_CONTRATO[c.status]}`}>{c.status}</span>
                  </td>
                  <td className="acoes">
                    <button className="btn-mini" onClick={() => setVendo(c)}>
                      Ver
                    </button>
                    {c.status !== 'cancelado' && (
                      <button className="btn-mini" onClick={() => void copiarLink(c)}>
                        Copiar link
                      </button>
                    )}
                    {c.status === 'enviado' && (
                      <button className="btn-mini btn-mini--perigo" onClick={() => void cancelar(c)}>
                        Cancelar
                      </button>
                    )}
                    {c.status !== 'assinado' && (
                      <button className="btn-mini btn-mini--perigo" onClick={() => void excluir(c)}>
                        Excluir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Editor do modelo padrão de contrato ({{placeholders}}).
// ---------------------------------------------------------------------------
function EditorModelo({ aoVoltar }: { aoVoltar: () => void }) {
  const [modelo, setModelo] = useState<ModeloContrato | null>(null)
  const [conteudo, setConteudo] = useState('')
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    listarModelosContrato()
      .then((ms) => {
        const m = ms.find((x) => x.padrao) ?? ms[0] ?? null
        setModelo(m)
        setNome(m?.nome ?? 'Contrato padrão de design — KA')
        setConteudo(m?.conteudo ?? '')
      })
      .catch((e) => setErro(e instanceof Error ? e.message : String(e)))
  }, [])

  async function salvar() {
    setSalvando(true)
    setErro(null)
    try {
      await salvarModeloContrato({
        ...(modelo ? { id: modelo.id } : {}),
        nome,
        conteudo,
        padrao: true,
      })
      setMsg('Modelo salvo — os próximos contratos usam esta versão.')
      setTimeout(() => setMsg(null), 3000)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
      <p style={{ marginBottom: '1rem' }}>
        <button className="btn--voltar" onClick={aoVoltar}>
          ← Contratos
        </button>
      </p>
      <div className="card">
        <h3>Modelo de contrato</h3>
        <p style={{ marginBottom: '0.9rem' }}>
          Este texto vira o contrato quando um orçamento é aprovado. Os campos entre chaves são
          preenchidos sozinhos: <code>{'{{cliente_nome}}'}</code>, <code>{'{{cliente_documento}}'}</code>,{' '}
          <code>{'{{cliente_email}}'}</code>, <code>{'{{titulo}}'}</code>, <code>{'{{descricao}}'}</code>,{' '}
          <code>{'{{itens}}'}</code>, <code>{'{{valor_total}}'}</code>, <code>{'{{condicoes}}'}</code> e{' '}
          <code>{'{{data}}'}</code>.
        </p>
        {erro && <div className="erro-msg">{erro}</div>}
        {msg && <div className="nota">{msg}</div>}
        <div className="field">
          <label>Nome do modelo</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="field">
          <label>Texto do contrato</label>
          <textarea
            rows={22}
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', lineHeight: 1.55 }}
          />
        </div>
        <button className="btn" disabled={salvando || !conteudo.trim()} onClick={() => void salvar()}>
          {salvando ? 'Salvando…' : 'Salvar modelo'}
        </button>
      </div>
    </>
  )
}

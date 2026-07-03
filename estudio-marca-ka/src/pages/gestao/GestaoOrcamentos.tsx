import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Cliente, Orcamento, OrcamentoItem, OrcamentoStatus } from '../../lib/database.types'
import { listarClientes } from '../../lib/api'
import {
  criarOrcamento,
  atualizarOrcamento,
  enviarOrcamento,
  excluirOrcamento,
  listarOrcamentos,
  linkPublicoOrcamento,
  valorTotalOrcamento,
  formatarBRL,
  formatarData,
  type NovoOrcamento,
} from '../../lib/gestao'

const BADGE_ORC: Record<OrcamentoStatus, string> = {
  rascunho: 'badge--cinza',
  enviado: 'badge--azul',
  aprovado: 'badge--verde',
  recusado: 'badge--vermelho',
  expirado: 'badge--dourado',
}

// Orçamentos: a KA monta, envia o link ao cliente; ao aprovar, o sistema gera
// contrato + cobrança automaticamente (RPC responder_orcamento).
export function GestaoOrcamentos() {
  const [lista, setLista] = useState<Orcamento[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [editando, setEditando] = useState<Orcamento | 'novo' | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)

  async function recarregar() {
    try {
      setCarregando(true)
      const [o, c] = await Promise.all([listarOrcamentos(), listarClientes()])
      setLista(o)
      setClientes(c)
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

  async function copiarLink(o: Orcamento) {
    await navigator.clipboard.writeText(linkPublicoOrcamento(o.token))
    setMsg(`Link do orçamento "${o.titulo}" copiado — envie ao cliente por WhatsApp ou e-mail.`)
    setTimeout(() => setMsg(null), 4000)
  }

  async function enviar(o: Orcamento) {
    try {
      await enviarOrcamento(o.id)
      await copiarLink(o)
      await recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    }
  }

  async function excluir(o: Orcamento) {
    if (!window.confirm(`Excluir o orçamento "${o.titulo}"?`)) return
    try {
      await excluirOrcamento(o.id)
      await recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    }
  }

  if (editando) {
    return (
      <EditorOrcamento
        original={editando === 'novo' ? null : editando}
        clientes={clientes}
        aoVoltar={() => {
          setEditando(null)
          void recarregar()
        }}
      />
    )
  }

  return (
    <>
      <div className="gestao-acoes">
        <span className="espaco" />
        <button className="btn" onClick={() => setEditando('novo')}>
          + Novo orçamento
        </button>
      </div>

      {erro && <div className="erro-msg">{erro}</div>}
      {msg && <div className="nota">{msg}</div>}
      {carregando && <p style={{ color: 'var(--t-500)', fontSize: '0.85rem' }}>Carregando…</p>}

      {!carregando && lista.length === 0 && !erro && (
        <div className="card">
          <h3>Nenhum orçamento ainda.</h3>
          <p>
            Crie o primeiro em “+ Novo orçamento”. Quando o cliente aprovar pelo link, o contrato
            e a cobrança são gerados sozinhos.
          </p>
        </div>
      )}

      {lista.length > 0 && (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Título</th>
                <th>Para</th>
                <th>Valor</th>
                <th>Validade</th>
                <th>Status</th>
                <th className="acoes"></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((o) => (
                <tr key={o.id}>
                  <td>
                    <strong>{o.titulo}</strong>
                  </td>
                  <td>{o.destinatario_nome}</td>
                  <td className="num">{formatarBRL(o.valor_total)}</td>
                  <td>{formatarData(o.validade)}</td>
                  <td>
                    <span className={`badge ${BADGE_ORC[o.status]}`}>{o.status}</span>
                  </td>
                  <td className="acoes">
                    {o.status === 'rascunho' && (
                      <>
                        <button className="btn-mini" onClick={() => setEditando(o)}>
                          Editar
                        </button>
                        <button className="btn-mini" onClick={() => void enviar(o)}>
                          Enviar (copiar link)
                        </button>
                        <button className="btn-mini btn-mini--perigo" onClick={() => void excluir(o)}>
                          Excluir
                        </button>
                      </>
                    )}
                    {o.status !== 'rascunho' && (
                      <button className="btn-mini" onClick={() => void copiarLink(o)}>
                        Copiar link
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
// Editor de orçamento (novo/rascunho).
// ---------------------------------------------------------------------------
function EditorOrcamento({
  original,
  clientes,
  aoVoltar,
}: {
  original: Orcamento | null
  clientes: Cliente[]
  aoVoltar: () => void
}) {
  const [f, setF] = useState<NovoOrcamento>(
    original ?? {
      cliente_id: null,
      destinatario_nome: '',
      destinatario_email: null,
      destinatario_documento: null,
      titulo: '',
      descricao: null,
      itens: [{ descricao: '', qtd: 1, valor: 0 }],
      desconto: 0,
      valor_total: 0,
      condicoes: 'Pagamento à vista (boleto, PIX ou cartão) em até 7 dias após a aprovação.',
      validade: null,
    },
  )
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const total = useMemo(() => valorTotalOrcamento(f.itens, f.desconto), [f.itens, f.desconto])

  function campo<K extends keyof NovoOrcamento>(k: K, v: NovoOrcamento[K]) {
    setF((atual) => ({ ...atual, [k]: v }))
  }

  function mudarItem(i: number, patch: Partial<OrcamentoItem>) {
    campo(
      'itens',
      f.itens.map((item, idx) => (idx === i ? { ...item, ...patch } : item)),
    )
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro(null)
    try {
      const dados: NovoOrcamento = {
        ...f,
        itens: f.itens.filter((i) => i.descricao.trim()),
        valor_total: total,
      }
      if (original) await atualizarOrcamento(original.id, dados)
      else await criarOrcamento(dados)
      aoVoltar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err))
      setSalvando(false)
    }
  }

  // Ao escolher um cliente cadastrado, pré-preenche o destinatário.
  function escolherCliente(id: string) {
    const c = clientes.find((x) => x.id === id) ?? null
    setF((atual) => ({
      ...atual,
      cliente_id: c?.id ?? null,
      destinatario_nome: atual.destinatario_nome || c?.responsavel || c?.nome_marca || '',
      destinatario_email: atual.destinatario_email ?? c?.email_cobranca ?? c?.email_contato ?? null,
      destinatario_documento: atual.destinatario_documento ?? c?.documento ?? null,
    }))
  }

  return (
    <>
      <p style={{ marginBottom: '1rem' }}>
        <button className="btn--voltar" onClick={aoVoltar}>
          ← Orçamentos
        </button>
      </p>

      <div className="card">
        <h3>{original ? 'Editar orçamento' : 'Novo orçamento'}</h3>
        <p style={{ marginBottom: '1rem' }}>
          Ao enviar, você recebe um link para mandar ao cliente; ele aprova por lá e o contrato +
          cobrança saem sozinhos.
        </p>
        {erro && <div className="erro-msg">{erro}</div>}

        <form onSubmit={(e) => void salvar(e)}>
          <div className="form-grade">
            <div className="field campo-2">
              <label>Título do orçamento</label>
              <input
                value={f.titulo}
                onChange={(e) => campo('titulo', e.target.value)}
                placeholder="ex.: Identidade visual + templates de feed"
                required
              />
            </div>
            <div className="field">
              <label>Cliente cadastrado (opcional)</label>
              <select value={f.cliente_id ?? ''} onChange={(e) => escolherCliente(e.target.value)}>
                <option value="">— prospect / sem cadastro —</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome_marca}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Validade da proposta</label>
              <input
                type="date"
                value={f.validade ?? ''}
                onChange={(e) => campo('validade', e.target.value || null)}
              />
            </div>
            <div className="field">
              <label>Nome do destinatário</label>
              <input
                value={f.destinatario_nome}
                onChange={(e) => campo('destinatario_nome', e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>E-mail do destinatário</label>
              <input
                type="email"
                value={f.destinatario_email ?? ''}
                onChange={(e) => campo('destinatario_email', e.target.value || null)}
              />
            </div>
            <div className="field">
              <label>CPF/CNPJ (para o contrato)</label>
              <input
                value={f.destinatario_documento ?? ''}
                onChange={(e) => campo('destinatario_documento', e.target.value || null)}
              />
            </div>
            <div className="field campo-toda">
              <label>Descrição / contexto</label>
              <textarea
                rows={2}
                value={f.descricao ?? ''}
                onChange={(e) => campo('descricao', e.target.value || null)}
                placeholder="Resumo do projeto que aparece no orçamento e no contrato."
              />
            </div>
          </div>

          <h3 style={{ margin: '0.4rem 0 0.7rem' }}>Itens</h3>
          <div className="itens-orcamento">
            <div className="item-orcamento" style={{ color: 'var(--t-400)', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
              <span>Descrição</span>
              <span>Qtd</span>
              <span>Valor unit. (R$)</span>
              <span />
            </div>
            {f.itens.map((item, i) => (
              <div className="item-orcamento" key={i}>
                <input
                  value={item.descricao}
                  onChange={(e) => mudarItem(i, { descricao: e.target.value })}
                  placeholder="ex.: Template de post de produto"
                />
                <input
                  type="number"
                  min={1}
                  value={item.qtd}
                  onChange={(e) => mudarItem(i, { qtd: Number(e.target.value) || 1 })}
                />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.valor}
                  onChange={(e) => mudarItem(i, { valor: Number(e.target.value) || 0 })}
                />
                <button
                  type="button"
                  className="remover"
                  title="Remover item"
                  onClick={() => campo('itens', f.itens.filter((_, idx) => idx !== i))}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <p style={{ marginBottom: '0.8rem' }}>
            <button
              type="button"
              className="btn-mini"
              onClick={() => campo('itens', [...f.itens, { descricao: '', qtd: 1, valor: 0 }])}
            >
              + Adicionar item
            </button>
          </p>

          <div className="form-grade">
            <div className="field">
              <label>Desconto (R$)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={f.desconto}
                onChange={(e) => campo('desconto', Number(e.target.value) || 0)}
              />
            </div>
            <div className="field campo-2">
              <label>Condições (pagamento, prazos, o que inclui)</label>
              <textarea
                rows={2}
                value={f.condicoes ?? ''}
                onChange={(e) => campo('condicoes', e.target.value || null)}
              />
            </div>
          </div>

          <div className="orcamento-total">
            Total do orçamento <strong>{formatarBRL(total)}</strong>
          </div>

          <button className="btn" type="submit" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar rascunho'}
          </button>
        </form>
      </div>
    </>
  )
}

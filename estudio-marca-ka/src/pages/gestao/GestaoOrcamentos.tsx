import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type {
  Cliente,
  Orcamento,
  OrcamentoItem,
  OrcamentoStatus,
  PropostaCampos,
} from '../../lib/database.types'
import { listarClientes } from '../../lib/api'
import { confirmar } from '../../lib/confirmar'
import {
  criarOrcamento,
  atualizarOrcamento,
  enviarOrcamento,
  excluirOrcamento,
  listarOrcamentos,
  linkPublicoOrcamento,
  valorTotalOrcamento,
  modeloPropostaPadrao,
  formatarBRL,
  formatarData,
  type NovoOrcamento,
} from '../../lib/gestao'
import { abrirWhatsApp, primeiroNome } from '../../lib/whatsapp'
import { rotuloStatus } from '../../lib/rotulos'

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
    setMsg(`Link do orçamento "${o.titulo}" copiado, envie ao cliente por WhatsApp ou e-mail.`)
    setTimeout(() => setMsg(null), 4000)
  }

  function enviarWhatsApp(o: Orcamento) {
    const cliente = o.cliente_id ? clientes.find((c) => c.id === o.cliente_id) : null
    const nome = primeiroNome(o.destinatario_nome || cliente?.responsavel)
    const mensagem = [
      `Oi${nome ? `, ${nome}` : ''}! 💛`,
      '',
      `Preparei o orçamento "${o.titulo}" para você.`,
      `Veja os detalhes e aprove por aqui: ${linkPublicoOrcamento(o.token)}`,
      ...(o.validade ? ['', `A proposta vale até ${formatarData(o.validade)}.`] : []),
      '',
      'Qualquer dúvida, me chama! Kelly',
    ].join('\n')
    abrirWhatsApp(
      o.destinatario_telefone ?? cliente?.telefone,
      mensagem,
      o.destinatario_nome || cliente?.nome_marca,
    )
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
    const aviso =
      o.status === 'aprovado'
        ? `Excluir o orçamento "${o.titulo}"? O contrato e a cobrança que ele gerou NÃO são apagados junto. Apague-os nas abas Contratos e Cobranças se também forem teste.`
        : `Excluir o orçamento "${o.titulo}"? Essa ação não pode ser desfeita.`
    if (!(await confirmar(aviso, { perigo: true, confirmar: 'Excluir' }))) return
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
                  <td className="cel-nome" data-label="Título">
                    <button className="cel-abrir" onClick={() => setEditando(o)} title="Abrir proposta">
                      <strong>{o.titulo}</strong>
                    </button>
                  </td>
                  <td data-label="Para">{o.destinatario_nome}</td>
                  <td className="num" data-label="Valor">{formatarBRL(o.valor_total)}</td>
                  <td data-label="Validade">{formatarData(o.validade)}</td>
                  <td data-label="Status">
                    <span className={`badge ${BADGE_ORC[o.status]}`}>{rotuloStatus('orcamento', o.status)}</span>
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
                      <>
                        <button className="btn-mini" onClick={() => setEditando(o)}>
                          Editar
                        </button>
                        <button className="btn-mini btn-mini--whats" onClick={() => enviarWhatsApp(o)}>
                          WhatsApp
                        </button>
                        <button className="btn-mini" onClick={() => void copiarLink(o)}>
                          Copiar link
                        </button>
                        <button className="btn-mini btn-mini--perigo" onClick={() => void excluir(o)}>
                          Excluir
                        </button>
                      </>
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
      destinatario_telefone: null,
      destinatario_documento: null,
      titulo: '',
      descricao: null,
      itens: [{ descricao: '', qtd: 1, valor: 0 }],
      desconto: 0,
      valor_total: 0,
      condicoes: 'Pagamento à vista (boleto, PIX ou cartão) em até 7 dias após a aprovação.',
      validade: null,
      proposta: null,
    },
  )
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const total = useMemo(() => valorTotalOrcamento(f.itens, f.desconto), [f.itens, f.desconto])

  function campo<K extends keyof NovoOrcamento>(k: K, v: NovoOrcamento[K]) {
    setF((atual) => ({ ...atual, [k]: v }))
  }

  // Campos da proposta no layout KA (documento completo no link público).
  function prop<K extends keyof PropostaCampos>(k: K, v: string) {
    setF((atual) => ({ ...atual, proposta: { ...(atual.proposta ?? {}), [k]: v } }))
  }

  function mudarItem(i: number, patch: Partial<OrcamentoItem>) {
    campo(
      'itens',
      f.itens.map((item, idx) => (idx === i ? { ...item, ...patch } : item)),
    )
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    const itens = f.itens.filter((i) => i.descricao.trim())
    if (itens.length === 0) {
      setErro('Adicione ao menos um item (descrição e valor) antes de salvar.')
      return
    }
    setSalvando(true)
    setErro(null)
    try {
      const dados: NovoOrcamento = {
        ...f,
        itens,
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

  // Ao escolher um cliente cadastrado, pré-preenche o destinatário (quem assina
  // o contrato): prefere os "dados para o contrato" da ficha, se houver.
  function escolherCliente(id: string) {
    const c = clientes.find((x) => x.id === id) ?? null
    setF((atual) => ({
      ...atual,
      cliente_id: c?.id ?? null,
      destinatario_nome:
        atual.destinatario_nome || c?.contrato_nome || c?.responsavel || c?.nome_marca || '',
      destinatario_email:
        atual.destinatario_email ?? c?.contrato_email ?? c?.email_cobranca ?? c?.email_contato ?? null,
      destinatario_telefone: atual.destinatario_telefone ?? c?.telefone ?? null,
      destinatario_documento:
        atual.destinatario_documento ?? c?.contrato_documento ?? c?.documento ?? null,
      razao_social: atual.razao_social ?? c?.razao_social ?? null,
      fundador_nome: atual.fundador_nome ?? c?.fundador_nome ?? null,
      fundador_cpf: atual.fundador_cpf ?? c?.fundador_cpf ?? null,
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
                <option value="">- prospect / sem cadastro -</option>
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
              <label>WhatsApp do destinatário</label>
              <input
                type="tel"
                inputMode="tel"
                value={f.destinatario_telefone ?? ''}
                onChange={(e) => campo('destinatario_telefone', e.target.value || null)}
                placeholder="ex.: 41 99999-0000"
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

          <h3 style={{ margin: '1rem 0 0.3rem' }}>Proposta no layout KA (opcional)</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--t-500)', marginBottom: '0.7rem' }}>
            Preenchendo este bloco, o link público vira a <strong>proposta comercial completa</strong>{' '}
            (capa com a logo, seções numeradas, investimento e aceite), imprimível em PDF. Seção
            deixada em branco não aparece. Use *asteriscos* para <strong>negrito</strong>.
          </p>
          <p style={{ marginBottom: '0.8rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-mini"
              onClick={() => campo('proposta', modeloPropostaPadrao())}
            >
              {f.proposta ? 'Repreencher com o modelo padrão' : 'Preencher com o modelo padrão'}
            </button>
            {f.proposta && (
              <button type="button" className="btn-mini btn-mini--perigo" onClick={() => campo('proposta', null)}>
                Remover proposta (voltar ao documento simples)
              </button>
            )}
          </p>

          {f.proposta && (
            <div className="form-grade" style={{ marginBottom: '0.8rem' }}>
              <div className="field campo-toda">
                <label>Frase da capa (sob o título)</label>
                <textarea rows={2} value={f.proposta.subtitulo ?? ''} onChange={(e) => prop('subtitulo', e.target.value)} />
              </div>
              <div className="field">
                <label>Cidade/UF do cliente</label>
                <input value={f.proposta.cidade ?? ''} onChange={(e) => prop('cidade', e.target.value)} placeholder="ex.: Curitiba/PR" />
              </div>
              <div className="field">
                <label>Cidade do rodapé</label>
                <input value={f.proposta.cidade_rodape ?? ''} onChange={(e) => prop('cidade_rodape', e.target.value)} placeholder="ex.: Porto Alegre, RS" />
              </div>
              <div className="field campo-toda">
                <label>01 · Objeto da proposta</label>
                <textarea rows={4} value={f.proposta.objeto ?? ''} onChange={(e) => prop('objeto', e.target.value)} />
              </div>
              <div className="field campo-2">
                <label>02 · Painel esquerdo (1ª linha = título, 2ª = subtítulo, demais = itens)</label>
                <textarea rows={7} value={f.proposta.painel_a ?? ''} onChange={(e) => prop('painel_a', e.target.value)} />
              </div>
              <div className="field campo-2">
                <label>02 · Painel direito (mesmo formato)</label>
                <textarea rows={7} value={f.proposta.painel_b ?? ''} onChange={(e) => prop('painel_b', e.target.value)} />
              </div>
              <div className="field campo-toda">
                <label>02 · Box de destaque (1ª linha = título, resto = texto)</label>
                <textarea rows={3} value={f.proposta.destaque ?? ''} onChange={(e) => prop('destaque', e.target.value)} />
              </div>
              <div className="field campo-2">
                <label>03 · Incluído na mensalidade (um ✓ por linha)</label>
                <textarea rows={6} value={f.proposta.incluso ?? ''} onChange={(e) => prop('incluso', e.target.value)} />
              </div>
              <div className="field campo-2">
                <label>03 · Necessário da cliente</label>
                <textarea rows={6} value={f.proposta.necessario ?? ''} onChange={(e) => prop('necessario', e.target.value)} />
              </div>
              <div className="field campo-2">
                <label>04 · Prazo de implantação</label>
                <textarea rows={2} value={f.proposta.prazo ?? ''} onChange={(e) => prop('prazo', e.target.value)} />
              </div>
              <div className="field campo-2">
                <label>04 · Entrega</label>
                <textarea rows={2} value={f.proposta.entrega ?? ''} onChange={(e) => prop('entrega', e.target.value)} />
              </div>
              <div className="field campo-toda">
                <label>05 · Fases futuras (uma por linha: Nome | descrição)</label>
                <textarea rows={3} value={f.proposta.fases ?? ''} onChange={(e) => prop('fases', e.target.value)} />
              </div>
              <div className="field">
                <label>06 · Implantação, rótulo do card</label>
                <input value={f.proposta.impl_titulo ?? ''} onChange={(e) => prop('impl_titulo', e.target.value)} />
              </div>
              <div className="field">
                <label>06 · Implantação, valor em destaque</label>
                <input value={f.proposta.impl_valor ?? ''} onChange={(e) => prop('impl_valor', e.target.value)} placeholder="ex.: 2× de R$ 1.250 no Pix" />
              </div>
              <div className="field">
                <label>06 · Implantação, linha abaixo do valor</label>
                <input value={f.proposta.impl_sub ?? ''} onChange={(e) => prop('impl_sub', e.target.value)} placeholder="ex.: Total: R$ 2.500." />
              </div>
              <div className="field">
                <label>06 · Implantação, descrição</label>
                <input value={f.proposta.impl_desc ?? ''} onChange={(e) => prop('impl_desc', e.target.value)} />
              </div>
              <div className="field">
                <label>06 · Mensalidade, rótulo do card</label>
                <input value={f.proposta.mensal_titulo ?? ''} onChange={(e) => prop('mensal_titulo', e.target.value)} />
              </div>
              <div className="field">
                <label>06 · Mensalidade, valor em destaque</label>
                <input value={f.proposta.mensal_valor ?? ''} onChange={(e) => prop('mensal_valor', e.target.value)} placeholder="ex.: R$ 420/mês" />
              </div>
              <div className="field campo-2">
                <label>06 · Mensalidade, descrição (uma frase por linha)</label>
                <textarea rows={2} value={f.proposta.mensal_desc ?? ''} onChange={(e) => prop('mensal_desc', e.target.value)} />
              </div>
              <div className="field campo-2">
                <label>Forma de pagamento</label>
                <textarea rows={2} value={f.proposta.pagamento ?? ''} onChange={(e) => prop('pagamento', e.target.value)} />
              </div>
              <div className="field">
                <label>Fidelidade</label>
                <input value={f.proposta.fidelidade ?? ''} onChange={(e) => prop('fidelidade', e.target.value)} />
              </div>
              <div className="field">
                <label>Reajuste</label>
                <input value={f.proposta.reajuste ?? ''} onChange={(e) => prop('reajuste', e.target.value)} />
              </div>
              <div className="field campo-toda">
                <label>Próximos passos (no box de aceite)</label>
                <textarea rows={2} value={f.proposta.proximos ?? ''} onChange={(e) => prop('proximos', e.target.value)} />
              </div>
            </div>
          )}

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

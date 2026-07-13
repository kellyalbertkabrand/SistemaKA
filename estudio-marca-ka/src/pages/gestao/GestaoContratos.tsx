import { useEffect, useState, type FormEvent } from 'react'
import type { Cliente, Contrato, ContratoStatus, ModeloContrato } from '../../lib/database.types'
import { confirmar } from '../../lib/confirmar'
import { listarClientes } from '../../lib/api'
import { abrirWhatsApp, primeiroNome } from '../../lib/whatsapp'
import { rotuloStatus } from '../../lib/rotulos'
import { useFichaUrl } from '../../hooks/useFichaUrl'
import { Busca, normalizar } from '../../components/Busca'
import {
  atualizarContrato,
  criarContratoDoModelo,
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
  const { idAberto, abrir: abrirUrl, fechar } = useFichaUrl('id')
  const [lista, setLista] = useState<Contrato[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  // Edição do CONTEÚDO de um contrato (não do modelo).
  const [editando, setEditando] = useState(false)
  const [editTitulo, setEditTitulo] = useState('')
  const [editConteudo, setEditConteudo] = useState('')
  const [salvandoEd, setSalvandoEd] = useState(false)
  // Assistente de IA (dentro do editor de contrato)
  const [iaInstrucao, setIaInstrucao] = useState('')
  const [iaCarregando, setIaCarregando] = useState(false)
  const [iaProposta, setIaProposta] = useState<string | null>(null)
  const [iaResumo, setIaResumo] = useState<string | null>(null)
  const [iaErro, setIaErro] = useState<string | null>(null)
  const [iaHistorico, setIaHistorico] = useState<{ instrucao: string; resumo: string }[]>([])

  function limparIA() {
    setIaInstrucao('')
    setIaProposta(null)
    setIaResumo(null)
    setIaErro(null)
    setIaHistorico([])
  }

  // Pede um ajuste à IA (função de servidor guarda a chave). A resposta vira
  // uma PROPOSTA que a KA revisa e aplica (ou descarta).
  async function pedirIA() {
    const instrucao = iaInstrucao.trim()
    if (!instrucao) return
    setIaCarregando(true)
    setIaErro(null)
    setIaProposta(null)
    setIaResumo(null)
    try {
      const r = await fetch('/.netlify/functions/contrato-ia', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contrato: editConteudo, instrucao }),
      })
      const data = await r.json().catch(() => ({ erro: 'Resposta inválida da IA.' }))
      if (data.erro) {
        setIaErro(data.erro)
        return
      }
      setIaProposta(String(data.contrato ?? ''))
      setIaResumo(String(data.resumo ?? 'Ajuste pronto.'))
    } catch {
      setIaErro('Não deu para falar com a IA. Confira sua conexão e tente de novo.')
    } finally {
      setIaCarregando(false)
    }
  }

  function aplicarIA() {
    if (iaProposta == null) return
    setEditConteudo(iaProposta)
    setIaHistorico((h) => [...h, { instrucao: iaInstrucao.trim(), resumo: iaResumo ?? 'Ajuste aplicado.' }])
    setIaProposta(null)
    setIaResumo(null)
    setIaInstrucao('')
  }

  const listaFiltrada = (() => {
    const q = normalizar(busca).trim()
    if (!q) return lista
    return lista.filter((c) =>
      normalizar(`${c.titulo} ${c.assinatura_nome ?? ''}`).includes(q),
    )
  })()

  // Sub-telas na URL: ?id=novo (gerar), ?id=modelo (editar modelo),
  // ?id=<uuid> (ver contrato) — F5 e "voltar" do navegador funcionam.
  const criando = idAberto === 'novo'
  const editandoModelo = idAberto === 'modelo'
  const vendo: Contrato | null =
    idAberto && idAberto !== 'novo' && idAberto !== 'modelo'
      ? (lista.find((c) => c.id === idAberto) ?? null)
      : null

  const [clientes, setClientes] = useState<Cliente[]>([])

  async function recarregar() {
    try {
      setCarregando(true)
      const [cs, cl] = await Promise.all([listarContratos(), listarClientes()])
      setLista(cs)
      setClientes(cl)
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

  // Abrir para VER (sai do modo edição) ou para EDITAR (entra no modo edição).
  function verContrato(c: Contrato) {
    setEditando(false)
    abrirUrl(c.id)
  }
  function editarContrato(c: Contrato) {
    setEditTitulo(c.titulo)
    setEditConteudo(c.conteudo)
    limparIA()
    setEditando(true)
    abrirUrl(c.id)
  }
  function fecharFicha() {
    setEditando(false)
    fechar()
  }
  async function salvarEdicao(id: string, tituloOriginal: string) {
    setSalvandoEd(true)
    setErro(null)
    try {
      await atualizarContrato(id, { titulo: editTitulo.trim() || tituloOriginal, conteudo: editConteudo })
      await recarregar()
      setEditando(false)
      setMsg('Contrato atualizado.')
      setTimeout(() => setMsg(null), 4000)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setSalvandoEd(false)
    }
  }

  async function copiarLink(c: Contrato) {
    await navigator.clipboard.writeText(linkPublicoContrato(c.token))
    setMsg(`Link de assinatura de "${c.titulo}" copiado.`)
    setTimeout(() => setMsg(null), 4000)
  }

  function enviarWhatsApp(c: Contrato) {
    const cliente = c.cliente_id ? clientes.find((x) => x.id === c.cliente_id) : null
    const nome = primeiroNome(cliente?.responsavel ?? cliente?.nome_marca)
    const mensagem = [
      `Oi${nome ? `, ${nome}` : ''}! ✍️`,
      '',
      `O contrato "${c.titulo}" está pronto para a sua assinatura.`,
      `Leia com calma e assine por aqui: ${linkPublicoContrato(c.token)}`,
      '',
      'Qualquer dúvida, me chama! Kelly',
    ].join('\n')
    abrirWhatsApp(
      c.telefone ?? cliente?.telefone,
      mensagem,
      cliente ? (cliente.responsavel ?? cliente.nome_marca) : c.titulo,
    )
  }

  async function cancelar(c: Contrato) {
    if (!(await confirmar(`Cancelar o contrato "${c.titulo}"?`, { perigo: true, confirmar: 'Cancelar contrato' }))) return
    try {
      await atualizarContrato(c.id, { status: 'cancelado' })
      await recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    }
  }

  async function excluir(c: Contrato) {
    const aviso =
      c.status === 'assinado'
        ? `ATENÇÃO: "${c.titulo}" está ASSINADO. O registro do aceite digital será apagado junto e não dá para recuperar. Excluir mesmo assim? (Use só para limpar testes.)`
        : `Excluir o contrato "${c.titulo}"? Essa ação não pode ser desfeita.`
    if (!(await confirmar(aviso, { perigo: true, confirmar: 'Excluir' }))) return
    try {
      await excluirContrato(c.id)
      await recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    }
  }

  if (editandoModelo) {
    return <EditorModelo aoVoltar={fechar} />
  }

  if (criando) {
    return (
      <NovoContrato
        clientes={clientes}
        aoVoltar={fechar}
        aoCriar={(c) => {
          setLista((l) => [c, ...l])
          verContrato(c)
        }}
      />
    )
  }

  if (vendo) {
    // MODO EDIÇÃO do contrato (só quando não está assinado).
    if (editando) {
      return (
        <>
          <p className="nao-imprimir" style={{ marginBottom: '1rem', display: 'flex', gap: '0.6rem' }}>
            <button className="btn--voltar" onClick={() => setEditando(false)}>
              ← Ver contrato
            </button>
          </p>
          <div className="card">
            <h3>Editar contrato</h3>
            <p style={{ marginBottom: '0.9rem', fontSize: '0.85rem', color: 'var(--t-600)' }}>
              Ajuste o texto livremente. As alterações valem para este contrato (não mudam o
              modelo padrão). {vendo.status === 'enviado' && 'O link de assinatura continua o mesmo.'}
            </p>
            {erro && <div className="erro-msg">{erro}</div>}
            <div className="field">
              <label>Título</label>
              <input value={editTitulo} onChange={(e) => setEditTitulo(e.target.value)} />
            </div>
            <div className="field">
              <label>Texto do contrato</label>
              <textarea
                rows={22}
                value={editConteudo}
                onChange={(e) => setEditConteudo(e.target.value)}
                style={{ fontFamily: 'ui-monospace, monospace', fontSize: '16px', lineHeight: 1.55 }}
              />
            </div>
            <p style={{ display: 'flex', gap: '0.7rem', marginTop: '0.4rem' }}>
              <button
                className="btn"
                disabled={salvandoEd || !editConteudo.trim()}
                onClick={() => void salvarEdicao(vendo.id, vendo.titulo)}
              >
                {salvandoEd ? 'Salvando…' : 'Salvar alterações'}
              </button>
              <button className="btn--voltar" onClick={() => setEditando(false)}>
                Cancelar
              </button>
            </p>
          </div>

          {/* Assistente de IA — pede ajustes em português e aplica no texto acima */}
          <div className="card ia-chat">
            <h4 className="ia-chat__tit">🤖 Assistente de IA</h4>
            <p className="ia-chat__dica">
              Peça um ajuste em português e revise antes de aplicar. Ex.: “deixe o pagamento em 3×”,
              “adicione uma cláusula de cancelamento com 30 dias de aviso”, “deixe a linguagem mais simples”.
            </p>

            {iaHistorico.length > 0 && (
              <ul className="ia-chat__log">
                {iaHistorico.map((h, i) => (
                  <li key={i}>
                    <strong>Você:</strong> {h.instrucao} <span className="ia-chat__ok">✓ {h.resumo}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="ia-chat__entrada">
              <textarea
                rows={2}
                value={iaInstrucao}
                onChange={(e) => setIaInstrucao(e.target.value)}
                placeholder="O que você quer ajustar no contrato?"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void pedirIA()
                  }
                }}
              />
              <button className="btn" disabled={iaCarregando || !iaInstrucao.trim()} onClick={() => void pedirIA()}>
                {iaCarregando ? 'Pensando…' : 'Pedir à IA'}
              </button>
            </div>

            {iaErro && <div className="erro-msg" style={{ marginTop: '0.6rem' }}>{iaErro}</div>}

            {iaProposta != null && (
              <div className="ia-proposta">
                <div className="ia-proposta__resumo">✨ {iaResumo}</div>
                <div className="ia-proposta__rot">Prévia do contrato com o ajuste:</div>
                <pre className="ia-proposta__preview">{iaProposta}</pre>
                <div className="ia-proposta__acoes">
                  <button className="btn" onClick={aplicarIA}>
                    Aplicar no contrato
                  </button>
                  <button
                    className="btn--voltar"
                    onClick={() => {
                      setIaProposta(null)
                      setIaResumo(null)
                    }}
                  >
                    Descartar
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )
    }
    return (
      <>
        <p className="nao-imprimir" style={{ marginBottom: '1rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button className="btn--voltar" onClick={fecharFicha}>
            ← Contratos
          </button>
          {vendo.status !== 'assinado' && vendo.status !== 'cancelado' && (
            <button className="btn--voltar" onClick={() => editarContrato(vendo)}>
              ✏️ Editar contrato
            </button>
          )}
          <button className="btn--voltar" onClick={() => window.print()}>
            Salvar em PDF / Imprimir
          </button>
          <button className="btn--voltar" onClick={() => void copiarLink(vendo)}>
            Copiar link de assinatura
          </button>
        </p>
        <div className="pub-doc">
          <div className="pub-doc__head">
            <div className="eyebrow">Contrato · Kelly Albert, KA</div>
            <h1>{vendo.titulo}</h1>
            <div className="pub-doc__meta">
              criado em {formatarData(vendo.criado_em)} ·{' '}
              <span className={`badge ${BADGE_CONTRATO[vendo.status]}`}>{rotuloStatus('contrato', vendo.status)}</span>
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
        <button className="btn--voltar" onClick={() => abrirUrl('modelo')}>
          Editar modelo de contrato
        </button>
        <button className="btn" onClick={() => abrirUrl('novo')}>
          + Novo contrato
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
        <Busca valor={busca} aoMudar={setBusca} placeholder="Buscar contrato por título…" />
      )}
      {lista.length > 0 && listaFiltrada.length === 0 && (
        <p className="ativ-vazio">Nenhum contrato encontrado para “{busca}”.</p>
      )}

      {listaFiltrada.length > 0 && (
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
              {listaFiltrada.map((c) => (
                <tr key={c.id}>
                  <td className="cel-nome" data-label="Contrato">
                    <button className="cel-abrir" onClick={() => verContrato(c)} title="Ver contrato">
                      <strong>{c.titulo}</strong>
                    </button>
                  </td>
                  <td data-label="Criado">{formatarData(c.criado_em)}</td>
                  <td data-label="Assinatura">
                    {c.status === 'assinado'
                      ? `${c.assinatura_nome} · ${formatarData(c.assinado_em)}`
                      : '-'}
                  </td>
                  <td data-label="Status">
                    <span className={`badge ${BADGE_CONTRATO[c.status]}`}>{rotuloStatus('contrato', c.status)}</span>
                  </td>
                  <td className="acoes">
                    <button className="btn-mini" onClick={() => verContrato(c)}>
                      Ver
                    </button>
                    {c.status !== 'cancelado' && c.status !== 'assinado' && (
                      <button className="btn-mini" onClick={() => editarContrato(c)}>
                        Editar
                      </button>
                    )}
                    {c.status !== 'cancelado' && c.status !== 'assinado' && (
                      <button className="btn-mini btn-mini--whats" onClick={() => enviarWhatsApp(c)}>
                        WhatsApp
                      </button>
                    )}
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
                    <button className="btn-mini btn-mini--perigo" onClick={() => void excluir(c)}>
                      Excluir
                    </button>
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
// Novo contrato: gera um contrato a partir do modelo padrão, preenchendo o
// nome e o documento do cliente. Depois é só ver e salvar em PDF.
// ---------------------------------------------------------------------------
function NovoContrato({
  clientes,
  aoVoltar,
  aoCriar,
}: {
  clientes: Cliente[]
  aoVoltar: () => void
  aoCriar: (c: Contrato) => void
}) {
  const [clienteId, setClienteId] = useState('')
  const [nome, setNome] = useState('')
  const [documento, setDocumento] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [razao, setRazao] = useState('')
  const [titulo, setTitulo] = useState('')
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // Ao escolher um cliente, PUXA os dados da ficha dele para os campos (a KA
  // ainda pode ajustar antes de gerar).
  function escolherCliente(id: string) {
    setClienteId(id)
    const c = clientes.find((x) => x.id === id)
    if (!c) return
    setNome((c.responsavel || c.nome_marca || '').trim())
    setDocumento((c.contrato_documento || c.documento || '').trim())
    setEmail((c.email_contato || '').trim())
    setTelefone((c.telefone || '').trim())
    setRazao((c.razao_social || '').trim())
    if (!titulo.trim()) setTitulo(`Contrato: ${c.nome_marca}`)
  }

  async function gerar(e: FormEvent) {
    e.preventDefault()
    setGerando(true)
    setErro(null)
    try {
      const c = await criarContratoDoModelo({
        cliente_id: clienteId || undefined,
        cliente_nome: nome.trim() || undefined,
        cliente_documento: documento.trim() || undefined,
        cliente_email: email.trim() || undefined,
        razao_social: razao.trim() || undefined,
        telefone: telefone.trim() || undefined,
        titulo: titulo.trim() || undefined,
      })
      aoCriar(c)
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err))
    } finally {
      setGerando(false)
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
        <h3>Novo contrato</h3>
        <p style={{ marginBottom: '0.9rem' }}>
          O contrato é gerado a partir do <strong>modelo padrão</strong>, já com os seus dados. Há
          duas formas de usar:
        </p>
        <ul style={{ margin: '0 0 1rem 1.1rem', fontSize: '0.85rem', color: 'var(--t-600)', lineHeight: 1.6 }}>
          <li>
            <strong>Você preenche:</strong> digite o nome e o CPF/CNPJ do cliente abaixo e o texto
            já sai completo.
          </li>
          <li>
            <strong>O cliente preenche:</strong> deixe os campos <strong>em branco</strong> e clique
            em gerar. Depois copie o <strong>link de assinatura</strong> e envie ao cliente, ele
            preenche o nome e o CPF/CNPJ dele ao assinar, e esses dados entram no contrato
            automaticamente.
          </li>
        </ul>
        {erro && <div className="erro-msg">{erro}</div>}
        <form onSubmit={(e) => void gerar(e)}>
          <div className="form-grade">
            <div className="field campo-toda">
              <label>Puxar dados de um cliente</label>
              <select value={clienteId} onChange={(e) => escolherCliente(e.target.value)}>
                <option value="">— Escolher cliente (preenche os campos abaixo) —</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome_marca}
                    {c.responsavel ? ` · ${c.responsavel}` : ''}
                  </option>
                ))}
              </select>
              <span className="campo-ajuda">
                Escolha um cliente para preencher nome, documento, e-mail e telefone da ficha dele.
                Você ainda pode ajustar antes de gerar.
              </span>
            </div>
            <div className="field">
              <label>Nome do cliente (opcional)</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Deixe em branco p/ o cliente preencher" />
            </div>
            <div className="field">
              <label>CPF / CNPJ do cliente (opcional)</label>
              <input value={documento} onChange={(e) => setDocumento(e.target.value)} placeholder="Deixe em branco p/ o cliente preencher" />
            </div>
            <div className="field">
              <label>E-mail (opcional)</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ex.: cliente@email.com" />
            </div>
            <div className="field">
              <label>Telefone (opcional)</label>
              <input type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(41) 9…" />
            </div>
            <div className="field campo-toda">
              <label>Razão social (opcional)</label>
              <input value={razao} onChange={(e) => setRazao(e.target.value)} placeholder="se for empresa" />
            </div>
            <div className="field campo-toda">
              <label>Título do contrato (opcional)</label>
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex.: Contrato, Marca do Cliente"
              />
            </div>
          </div>
          <p>
            <button className="btn" type="submit" disabled={gerando}>
              {gerando ? 'Gerando…' : 'Gerar contrato'}
            </button>
          </p>
        </form>
      </div>
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
        setNome(m?.nome ?? 'Contrato padrão de design, KA')
        setConteudo(m?.conteudo ?? '')
      })
      .catch((e) => setErro(e instanceof Error ? e.message : String(e)))
  }, [])

  async function salvar() {
    setSalvando(true)
    setErro(null)
    setMsg(null)
    try {
      const salvo = await salvarModeloContrato({
        ...(modelo ? { id: modelo.id } : {}),
        nome,
        conteudo,
        padrao: true,
      })
      // Guarda o modelo salvo para os próximos cliques atualizarem em vez de
      // criar um novo (evita modelos duplicados).
      setModelo(salvo)
      setMsg('✓ Modelo salvo, os próximos contratos usam esta versão.')
      setTimeout(() => setMsg(null), 4000)
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
            style={{ fontFamily: 'ui-monospace, monospace', fontSize: '16px', lineHeight: 1.55 }}
          />
        </div>
        <p style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.4rem' }}>
          <button className="btn" disabled={salvando || !conteudo.trim()} onClick={() => void salvar()}>
            {salvando ? 'Salvando…' : 'Salvar modelo'}
          </button>
          {msg && <span style={{ color: '#2e6b45', fontSize: '0.82rem' }}>{msg}</span>}
          {erro && <span style={{ color: 'var(--erro)', fontSize: '0.82rem' }}>{erro}</span>}
        </p>
      </div>
    </>
  )
}

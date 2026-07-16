import { useEffect, useState, type FormEvent } from 'react'
import type { Cliente, Contrato, ContratoStatus, ModeloContrato } from '../../lib/database.types'
import { confirmar } from '../../lib/confirmar'
import { listarClientes } from '../../lib/api'
import { abrirWhatsApp, primeiroNome } from '../../lib/whatsapp'
import { rotuloStatus } from '../../lib/rotulos'
import { useToast } from '../../components/Toast'
import { useFichaUrl } from '../../hooks/useFichaUrl'
import { Busca, normalizar } from '../../components/Busca'
import { acharCnpj, acharCpf } from '../../lib/documento'
import { ContratoView } from '../../components/ContratoView'
import {
  atualizarContrato,
  criarContratoDoModelo,
  excluirContrato,
  excluirModeloContrato,
  listarContratos,
  linkPublicoContrato,
  listarModelosContrato,
  salvarModeloContrato,
  tornarModeloPadrao,
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
          {/* Assistente de IA no TOPO — pede ajustes em português e aplica no texto abaixo */}
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

          <div className="card">
            <h3>Editar contrato</h3>
            <p style={{ marginBottom: '0.9rem', fontSize: '0.85rem', color: 'var(--t-600)' }}>
              Ajuste o texto livremente (ou use o assistente acima). As alterações valem para este
              contrato (não mudam o modelo padrão).{' '}
              {vendo.status === 'enviado' && 'O link de assinatura continua o mesmo.'}
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
          <ContratoView conteudo={vendo.conteudo} />
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
          Modelos de contrato
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
  const [modelos, setModelos] = useState<ModeloContrato[]>([])
  const [modeloId, setModeloId] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [nome, setNome] = useState('')
  const [documento, setDocumento] = useState('')
  const [documentoRep, setDocumentoRep] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [razao, setRazao] = useState('')
  const [endereco, setEndereco] = useState('')
  const [titulo, setTitulo] = useState('')
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // Carrega os modelos disponíveis; já seleciona o padrão (ou o 1º).
  useEffect(() => {
    listarModelosContrato()
      .then((ms) => {
        setModelos(ms)
        const padrao = ms.find((m) => m.padrao) ?? ms[0]
        if (padrao) setModeloId(padrao.id)
      })
      .catch(() => setModelos([]))
  }, [])

  // Ao escolher um cliente, PUXA os dados da ficha dele para os campos (a KA
  // ainda pode ajustar antes de gerar).
  function escolherCliente(id: string) {
    setClienteId(id)
    const c = clientes.find((x) => x.id === id)
    if (!c) return
    // Nome da PESSOA para o contrato: sempre do "Quem assina" / "Fundador(a)" /
    // "Responsável" — NUNCA o nome da marca (a marca não é a pessoa). Só usa a
    // marca como último recurso, se nenhum nome de pessoa estiver cadastrado.
    const pessoa = (c.contrato_nome || c.fundador_nome || c.responsavel || '').trim()
    setNome(pessoa || c.nome_marca.trim())
    // Inteligência do documento: um cliente pode ter DOIS documentos — o CNPJ da
    // empresa e o CPF da pessoa. Se houver empresa (razão social e/ou CNPJ), o
    // documento principal do contrato é o CNPJ e o CPF vira o do representante.
    const cnpj = acharCnpj(c.documento, c.contrato_documento)
    const cpf = acharCpf(c.fundador_cpf, c.contrato_documento, c.documento)
    const temEmpresa = !!(c.razao_social || '').trim() || !!cnpj
    if (temEmpresa && cnpj) {
      setDocumento(cnpj)
      setDocumentoRep(cpf)
    } else {
      setDocumento((c.contrato_documento || c.documento || '').trim())
      setDocumentoRep('')
    }
    setEmail((c.contrato_email || c.email_contato || '').trim())
    setTelefone((c.telefone || '').trim())
    setRazao((c.razao_social || '').trim())
    // Endereço para o contrato: junta endereço + cidade da ficha.
    const end = [(c.endereco || '').trim(), (c.cidade || '').trim()].filter(Boolean).join(', ')
    setEndereco(end)
    if (!titulo.trim()) setTitulo(`Contrato: ${c.nome_marca}`)
  }

  async function gerar(e: FormEvent) {
    e.preventDefault()
    setGerando(true)
    setErro(null)
    try {
      const c = await criarContratoDoModelo({
        modelo_id: modeloId || undefined,
        cliente_id: clienteId || undefined,
        cliente_nome: nome.trim() || undefined,
        cliente_documento: documento.trim() || undefined,
        cliente_documento_representante: documentoRep.trim() || undefined,
        cliente_email: email.trim() || undefined,
        razao_social: razao.trim() || undefined,
        cliente_endereco: endereco.trim() || undefined,
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
              <label>Modelo de contrato</label>
              <select value={modeloId} onChange={(e) => setModeloId(e.target.value)}>
                {modelos.length === 0 && <option value="">Modelo padrão</option>}
                {modelos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                    {m.padrao ? ' (padrão)' : ''}
                  </option>
                ))}
              </select>
              <span className="campo-ajuda">
                Escolha qual contrato usar como base. Gerencie os modelos no botão “Modelos de
                contrato” (na lista de contratos).
              </span>
            </div>
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
              <span className="campo-ajuda">
                Se for empresa, coloque aqui o <strong>CNPJ</strong> (o contrato sai no nome da
                empresa; o CPF vai no campo do representante abaixo).
              </span>
            </div>
            <div className="field">
              <label>CPF do representante (se empresa)</label>
              <input
                value={documentoRep}
                onChange={(e) => setDocumentoRep(e.target.value)}
                placeholder="CPF de quem assina pela empresa"
              />
              <span className="campo-ajuda">
                Aparece como “neste ato representada por {nome || '…'}, inscrito(a) no CPF nº…”.
              </span>
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
              <label>Endereço do cliente (opcional)</label>
              <input
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Rua, nº, bairro, cidade/UF, CEP"
              />
              <span className="campo-ajuda">
                Entra na qualificação do contratante (“residente em…” / “com sede em…”). Puxado da
                ficha do cliente; ajuste se precisar.
              </span>
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
// Gerenciador de MODELOS de contrato: lista + editor de cada um. A KA pode ter
// vários (ex.: "Design de marca" e "Gestão de sistema para arquitetura"),
// marcar qual é o padrão, duplicar e excluir.
function EditorModelo({ aoVoltar }: { aoVoltar: () => void }) {
  const { mostrar } = useToast()
  const [modelos, setModelos] = useState<ModeloContrato[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  // Editor aberto: null = lista; 'novo' = criar; senão o id do modelo.
  const [sel, setSel] = useState<string | null | 'novo'>(null)
  const [nome, setNome] = useState('')
  const [conteudo, setConteudo] = useState('')
  const [ehPadrao, setEhPadrao] = useState(false)
  const [salvando, setSalvando] = useState(false)

  async function recarregar() {
    try {
      setCarregando(true)
      setModelos(await listarModelosContrato())
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

  function abrirNovo(base?: ModeloContrato) {
    setSel('novo')
    setNome(base ? `${base.nome} (cópia)` : '')
    setConteudo(base?.conteudo ?? '')
    setEhPadrao(modelos.length === 0)
  }
  function abrirEditar(m: ModeloContrato) {
    setSel(m.id)
    setNome(m.nome)
    setConteudo(m.conteudo)
    setEhPadrao(m.padrao)
  }

  async function salvar() {
    if (!nome.trim() || !conteudo.trim()) {
      setErro('Dê um nome e escreva o texto do modelo.')
      return
    }
    setSalvando(true)
    setErro(null)
    try {
      const salvo = await salvarModeloContrato({
        ...(sel && sel !== 'novo' ? { id: sel } : {}),
        nome: nome.trim(),
        conteudo,
        padrao: ehPadrao,
      })
      if (ehPadrao) await tornarModeloPadrao(salvo.id) // só um padrão por vez
      mostrar('Modelo salvo ✓', 'ok')
      setSel(null)
      await recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setSalvando(false)
    }
  }

  async function definirPadrao(m: ModeloContrato) {
    try {
      await tornarModeloPadrao(m.id)
      mostrar(`“${m.nome}” agora é o modelo padrão ✓`, 'ok')
      await recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    }
  }

  async function excluir(m: ModeloContrato) {
    if (!(await confirmar(`Excluir o modelo “${m.nome}”? Os contratos já gerados não mudam.`, { perigo: true, confirmar: 'Excluir' }))) return
    try {
      await excluirModeloContrato(m.id)
      mostrar('Modelo excluído.', 'ok')
      await recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    }
  }

  // ----- Editor de um modelo -----
  if (sel !== null) {
    return (
      <>
        <p style={{ marginBottom: '1rem' }}>
          <button className="btn--voltar" onClick={() => setSel(null)}>
            ← Modelos
          </button>
        </p>
        <div className="card">
          <h3>{sel === 'novo' ? 'Novo modelo de contrato' : 'Editar modelo'}</h3>
          <p style={{ marginBottom: '0.9rem' }}>
            Os campos entre chaves são preenchidos sozinhos ao gerar: <code>{'{{cliente_nome}}'}</code>,{' '}
            <code>{'{{cliente_documento}}'}</code>, <code>{'{{cliente_email}}'}</code>,{' '}
            <code>{'{{razao_social}}'}</code>, <code>{'{{titulo}}'}</code> e <code>{'{{data}}'}</code>.
          </p>
          {erro && <div className="erro-msg">{erro}</div>}
          <div className="field">
            <label>Nome do modelo</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Gestão de sistema para arquitetura"
            />
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
          <label className="check-vm" style={{ marginBottom: '0.6rem' }}>
            <input type="checkbox" checked={ehPadrao} onChange={(e) => setEhPadrao(e.target.checked)} />
            <span>Usar este como modelo <strong>padrão</strong> (já vem selecionado ao criar um contrato)</span>
          </label>
          <p style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
            <button className="btn" disabled={salvando || !conteudo.trim() || !nome.trim()} onClick={() => void salvar()}>
              {salvando ? 'Salvando…' : 'Salvar modelo'}
            </button>
            <button className="btn--voltar" onClick={() => setSel(null)}>
              Cancelar
            </button>
          </p>
        </div>
      </>
    )
  }

  // ----- Lista de modelos -----
  return (
    <>
      <div className="gestao-acoes">
        <button className="btn--voltar" onClick={aoVoltar}>
          ← Contratos
        </button>
        <span className="espaco" />
        <button className="btn" onClick={() => abrirNovo()}>
          + Novo modelo
        </button>
      </div>
      {erro && <div className="erro-msg">{erro}</div>}
      {carregando && <p style={{ color: 'var(--t-500)', fontSize: '0.85rem' }}>Carregando…</p>}

      {!carregando && modelos.length === 0 && (
        <div className="card">
          <h3>Nenhum modelo ainda.</h3>
          <p>Crie o primeiro em “+ Novo modelo”. Ele vira a base dos contratos que você gera.</p>
        </div>
      )}

      {modelos.map((m) => (
        <div key={m.id} className="card" style={{ marginBottom: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0 }}>
              {m.nome}{' '}
              {m.padrao && <span className="badge badge--verde" style={{ marginLeft: 6 }}>padrão</span>}
            </h3>
            <div className="fase__acoes">
              <button className="btn-mini" onClick={() => abrirEditar(m)}>
                Editar
              </button>
              <button className="btn-mini" onClick={() => abrirNovo(m)} title="Criar um novo a partir deste">
                Duplicar
              </button>
              {!m.padrao && (
                <button className="btn-mini" onClick={() => void definirPadrao(m)}>
                  Tornar padrão
                </button>
              )}
              <button className="btn-mini btn-mini--perigo" onClick={() => void excluir(m)}>
                Excluir
              </button>
            </div>
          </div>
          <p style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--t-500)', whiteSpace: 'pre-wrap', maxHeight: 66, overflow: 'hidden' }}>
            {m.conteudo.slice(0, 180)}
            {m.conteudo.length > 180 ? '…' : ''}
          </p>
        </div>
      ))}
    </>
  )
}

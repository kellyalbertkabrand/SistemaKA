import { useEffect, useMemo, useState } from 'react'
import type { Cliente } from '../../lib/database.types'
import { listarClientes } from '../../lib/api'
import {
  ETAPAS_MARCA_ESSENCIA,
  camposDe,
  criarFormulario,
  definicaoFormulario,
  excluirFormulario,
  linkPublicoFormulario,
  listarFormularios,
  mensagemHistoria,
  prefillDoCliente,
  reabrirFormulario,
  rotuloEtapa,
  type EtapaProjeto,
  type Formulario,
} from '../../lib/formularios'
import { formatarData } from '../../lib/gestao'
import { imprimirComoPdf } from '../../lib/ui'
import { useCopiar } from '../../hooks/useCopiar'
import { abrirWhatsApp, primeiroNome } from '../../lib/whatsapp'
import { confirmar } from '../../lib/confirmar'
import { useToast } from '../../components/Toast'

// Página do Projeto Marca com Essência©: mostra as ETAPAS na ordem (01, 02, 03…)
// para qualquer pessoa da equipe entender o caminho e disparar cada etapa ao
// cliente. Etapas de FORMULÁRIO geram link; etapas de MENSAGEM só mandam o texto
// padrão no WhatsApp.
export function GestaoFormularios() {
  const [lista, setLista] = useState<Formulario[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [vendoId, setVendoId] = useState<string | null>(null)

  async function recarregar() {
    try {
      setCarregando(true)
      const [fs, cl] = await Promise.all([listarFormularios(), listarClientes()])
      setLista(fs)
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

  const vendo = vendoId ? lista.find((f) => f.id === vendoId) : null
  if (vendo)
    return <DetalheFormulario f={vendo} aoVoltar={() => setVendoId(null)} aoMudar={recarregar} />

  return (
    <div className="me-projeto">
      <div className="card me-intro">
        <h3>Projeto Marca com Essência©</h3>
        <p>
          Este é o caminho do cliente, em etapas. Escolha o cliente e <strong>dispare cada etapa
          por aqui</strong> (link do formulário ou mensagem pronta no WhatsApp). Acompanhe o status
          de cada uma.
        </p>
        <ol className="me-guia">
          {ETAPAS_MARCA_ESSENCIA.map((e) => (
            <li key={e.n}>
              <strong>{rotuloEtapa(e.n)}</strong> · {e.nome}
              <span> — {e.tipo === 'formulario' ? 'formulário' : 'mensagem (áudio no WhatsApp)'}</span>
            </li>
          ))}
        </ol>
      </div>

      {erro && <div className="erro-msg">{erro}</div>}
      {carregando && <p>Carregando…</p>}

      {!carregando &&
        ETAPAS_MARCA_ESSENCIA.map((etapa) =>
          etapa.tipo === 'formulario' ? (
            <EtapaFormulario
              key={etapa.n}
              etapa={etapa}
              clientes={clientes}
              lista={lista}
              aoMudar={recarregar}
              aoVer={setVendoId}
            />
          ) : (
            <EtapaMensagem key={etapa.n} etapa={etapa} clientes={clientes} />
          ),
        )}
    </div>
  )
}

// ---- Etapa de FORMULÁRIO (criar link + acompanhar respostas) ----------------
function EtapaFormulario({
  etapa,
  clientes,
  lista,
  aoMudar,
  aoVer,
}: {
  etapa: EtapaProjeto
  clientes: Cliente[]
  lista: Formulario[]
  aoMudar: () => Promise<void>
  aoVer: (id: string) => void
}) {
  const tipo = etapa.formTipo!
  const def = definicaoFormulario(tipo)
  const copiar = useCopiar()
  const { mostrar } = useToast()
  const [novo, setNovo] = useState(false)
  const [clienteId, setClienteId] = useState('')
  const [prefill, setPrefill] = useState(true)

  const clientePorId = useMemo(() => new Map(clientes.map((c) => [c.id, c])), [clientes])
  const daEtapa = lista.filter((f) => f.tipo === tipo)

  function rotuloLink(f: Formulario) {
    return primeiroNome(f.cliente_nome) || 'formulario'
  }

  async function criar() {
    try {
      const c = clienteId ? clientePorId.get(clienteId) : null
      const f = await criarFormulario({
        tipo,
        cliente_id: clienteId || null,
        cliente_nome: c ? c.responsavel || c.nome_marca : null,
        respostas: prefill && c ? prefillDoCliente(tipo, c) : undefined,
      })
      setNovo(false)
      setClienteId('')
      await aoMudar()
      await copiar(linkPublicoFormulario(f.token, rotuloLink(f)), 'Link do formulário copiado!')
    } catch (e) {
      mostrar(e instanceof Error ? e.message : String(e), 'erro')
    }
  }

  async function excluir(f: Formulario) {
    const ok = await confirmar(`Excluir o formulário de ${f.cliente_nome || 'cliente'}?`, {
      perigo: true,
      confirmar: 'Excluir',
    })
    if (!ok) return
    try {
      await excluirFormulario(f.id)
      await aoMudar()
    } catch (e) {
      mostrar(e instanceof Error ? e.message : String(e), 'erro')
    }
  }

  function enviarWhatsApp(f: Formulario) {
    const c = f.cliente_id ? clientePorId.get(f.cliente_id) : null
    const nome = primeiroNome(f.cliente_nome || c?.responsavel || c?.nome_marca)
    const msg = [
      `Olá${nome ? `, ${nome}` : ''}! Como vai?`,
      '',
      `Pra continuarmos o *Projeto Marca com Essência©*, o próximo passo é preencher o formulário *${
        def?.nome || 'do projeto'
      }*.`,
      '',
      'Segue o link abaixo:',
      linkPublicoFormulario(f.token, rotuloLink(f)),
      '',
      'Pode responder com calma: fica salvo automaticamente, dá pra parar e voltar depois no mesmo link.',
      'Qualquer dúvida, me chama!',
      '',
      '_Quando finalizar por favor me avise_',
    ].join('\n')
    abrirWhatsApp(c?.telefone, msg, f.cliente_nome || null)
  }

  return (
    <section className="me-etapa">
      <div className="me-etapa__cab">
        <span className="me-etapa__num">{rotuloEtapa(etapa.n)}</span>
        <h3 className="me-etapa__nome">{etapa.nome}</h3>
        <span className="me-etapa__tag">Formulário</span>
      </div>
      <p className="me-etapa__desc">{etapa.descricao}</p>

      <p style={{ margin: '0.6rem 0 0.4rem' }}>
        <button className="btn" onClick={() => setNovo((v) => !v)}>
          {novo ? 'Cancelar' : `+ Enviar ${etapa.nome} para um cliente`}
        </button>
      </p>

      {novo && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="form-grade">
            <div className="field campo-toda">
              <label>Cliente</label>
              <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                <option value="">Escolher cliente…</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome_marca}
                    {c.responsavel ? ` · ${c.responsavel}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="field campo-toda">
              <label>Como enviar</label>
              <div className="form-radio-linha">
                <label className="form-radio">
                  <input type="radio" checked={prefill} onChange={() => setPrefill(true)} />
                  Pré-preenchido com os dados do cliente
                </label>
                <label className="form-radio">
                  <input type="radio" checked={!prefill} onChange={() => setPrefill(false)} />
                  Em branco
                </label>
              </div>
            </div>
          </div>
          <p>
            <button className="btn" onClick={() => void criar()}>
              Criar e copiar o link
            </button>
          </p>
        </div>
      )}

      {daEtapa.length === 0 ? (
        <p className="me-etapa__vazio">Nenhum envio ainda nesta etapa.</p>
      ) : (
        <div className="form-cards">
          {daEtapa.map((f) => {
            const total = def ? camposDe(def).length : 0
            const resp = def
              ? camposDe(def).filter((c) => (f.respostas?.[c.id] || '').trim()).length
              : 0
            const completo = f.status === 'enviado' || (total > 0 && resp === total)
            return (
              <div key={f.id} className={`form-card ${completo ? 'form-card--ok' : ''}`}>
                <div className="form-card__topo">
                  <button className="cel-abrir" onClick={() => aoVer(f.id)}>
                    {f.cliente_nome || 'Sem cliente'}
                  </button>
                  <span className={`badge ${completo ? 'badge--verde' : 'badge--azul'}`}>
                    {completo ? 'Preenchido' : 'Em preenchimento'}
                  </span>
                </div>
                <div className="form-card__meta">
                  {resp}/{total} respostas
                  {f.enviado_em && ` · enviado em ${formatarData(f.enviado_em)}`}
                  {!f.enviado_em &&
                    f.atualizado_em &&
                    ` · atualizado em ${formatarData(f.atualizado_em)}`}
                </div>
                <div className="form-card__acoes">
                  <button className="btn--voltar" onClick={() => aoVer(f.id)}>
                    Ver respostas
                  </button>
                  <button
                    className="btn--voltar"
                    onClick={() => void copiar(linkPublicoFormulario(f.token, rotuloLink(f)), 'Link copiado!')}
                  >
                    Copiar link
                  </button>
                  <button className="btn--voltar btn--voltar-whats" onClick={() => enviarWhatsApp(f)}>
                    WhatsApp
                  </button>
                  <button className="btn--voltar btn--perigo-txt" onClick={() => void excluir(f)}>
                    Excluir
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

// ---- Etapa de MENSAGEM (WhatsApp, sem formulário) ---------------------------
function EtapaMensagem({ etapa, clientes }: { etapa: EtapaProjeto; clientes: Cliente[] }) {
  const [aberto, setAberto] = useState(false)
  const [clienteId, setClienteId] = useState('')
  const [comNome, setComNome] = useState(true)
  const clientePorId = useMemo(() => new Map(clientes.map((c) => [c.id, c])), [clientes])

  function enviar() {
    const c = clienteId ? clientePorId.get(clienteId) : null
    const nome = comNome ? primeiroNome(c?.responsavel || c?.nome_marca) : ''
    abrirWhatsApp(c?.telefone, mensagemHistoria(nome || null), c ? c.responsavel || c.nome_marca : null)
  }

  return (
    <section className="me-etapa">
      <div className="me-etapa__cab">
        <span className="me-etapa__num">{rotuloEtapa(etapa.n)}</span>
        <h3 className="me-etapa__nome">{etapa.nome}</h3>
        <span className="me-etapa__tag me-etapa__tag--audio">Áudio no WhatsApp</span>
      </div>
      <p className="me-etapa__desc">{etapa.descricao}</p>

      <p style={{ margin: '0.6rem 0 0.4rem' }}>
        <button className="btn" onClick={() => setAberto((v) => !v)}>
          {aberto ? 'Cancelar' : 'Enviar mensagem no WhatsApp'}
        </button>
      </p>

      {aberto && (
        <div className="card">
          <div className="form-grade">
            <div className="field campo-toda">
              <label>Cliente</label>
              <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                <option value="">Escolher cliente…</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome_marca}
                    {c.responsavel ? ` · ${c.responsavel}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="field campo-toda">
              <label className="form-radio">
                <input type="checkbox" checked={comNome} onChange={(e) => setComNome(e.target.checked)} />
                Incluir o nome do cliente na saudação
              </label>
            </div>
          </div>
          <p>
            <button className="btn btn--voltar-whats" onClick={enviar}>
              Abrir no WhatsApp
            </button>
          </p>
        </div>
      )}
    </section>
  )
}

function DetalheFormulario({
  f,
  aoVoltar,
  aoMudar,
}: {
  f: Formulario
  aoVoltar: () => void
  aoMudar: () => Promise<void>
}) {
  const def = definicaoFormulario(f.tipo)
  const copiar = useCopiar()
  if (!def) return null
  const rotulo = primeiroNome(f.cliente_nome) || 'formulario'
  return (
    <div>
      <p className="nao-imprimir" style={{ marginBottom: '1rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
        <button className="btn--voltar" onClick={aoVoltar}>
          ← Etapas
        </button>
        <button className="btn--voltar" onClick={() => imprimirComoPdf(def.nome, f.cliente_nome)}>
          Salvar em PDF
        </button>
        <button
          className="btn--voltar"
          onClick={() => void copiar(linkPublicoFormulario(f.token, rotulo), 'Link copiado!')}
        >
          Copiar link
        </button>
        {f.status === 'enviado' && (
          <button
            className="btn--voltar"
            onClick={async () => {
              await reabrirFormulario(f.id)
              await aoMudar()
              aoVoltar()
            }}
          >
            Reabrir p/ o cliente editar
          </button>
        )}
      </p>
      <div className="pub-doc">
        <div className="pub-doc__head">
          <div className="eyebrow">{def.etapa}</div>
          <h1>{def.nome}</h1>
          <div className="pub-doc__meta">
            {f.cliente_nome || 'Sem cliente'} ·{' '}
            {f.status === 'enviado' ? 'Preenchido' : 'Em preenchimento'}
          </div>
        </div>
        {def.secoes.map((sec) => (
          <section key={sec.titulo} className="form-resp__secao">
            <h3 className="form-resp__secao-tit">{sec.titulo}</h3>
            {sec.campos.map((c) => {
              const val = (f.respostas?.[c.id] || '').trim()
              return (
                <div key={c.id} className="form-resp__item">
                  <div className="form-resp__pergunta">{c.label}</div>
                  <div className={`form-resp__resposta ${val ? '' : 'form-resp__resposta--vazia'}`}>
                    {val || '(não respondido)'}
                  </div>
                </div>
              )
            })}
          </section>
        ))}
      </div>
    </div>
  )
}

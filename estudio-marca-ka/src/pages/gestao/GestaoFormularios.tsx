import { useEffect, useMemo, useState } from 'react'
import type { Cliente } from '../../lib/database.types'
import { listarClientes } from '../../lib/api'
import {
  FORMULARIOS,
  camposDe,
  criarFormulario,
  definicaoFormulario,
  excluirFormulario,
  linkPublicoFormulario,
  listarFormularios,
  prefillDoCliente,
  reabrirFormulario,
  type Formulario,
} from '../../lib/formularios'
import { formatarData } from '../../lib/gestao'
import { imprimirComoPdf } from '../../lib/ui'
import { useCopiar } from '../../hooks/useCopiar'
import { abrirWhatsApp, primeiroNome } from '../../lib/whatsapp'
import { confirmar } from '../../lib/confirmar'
import { useToast } from '../../components/Toast'
import { Busca, normalizar } from '../../components/Busca'

export function GestaoFormularios() {
  const [lista, setLista] = useState<Formulario[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [novo, setNovo] = useState(false)
  const [tipoNovo, setTipoNovo] = useState('ikigai')
  const [clienteNovo, setClienteNovo] = useState('')
  const [prefill, setPrefill] = useState(true)
  const [vendoId, setVendoId] = useState<string | null>(null)
  const copiar = useCopiar()
  const { mostrar } = useToast()

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

  const clientePorId = useMemo(() => new Map(clientes.map((c) => [c.id, c])), [clientes])

  async function criar() {
    try {
      const c = clienteNovo ? clientePorId.get(clienteNovo) : null
      const f = await criarFormulario({
        tipo: tipoNovo,
        cliente_id: clienteNovo || null,
        cliente_nome: c ? c.responsavel || c.nome_marca : null,
        // Duas opções: pré-preencher com os dados do cadastro ou enviar em branco.
        respostas: prefill && c ? prefillDoCliente(tipoNovo, c) : undefined,
      })
      setNovo(false)
      setClienteNovo('')
      await recarregar()
      // Já copia o link (limpo) pronto para enviar.
      await copiar(linkPublicoFormulario(f.token, rotuloLink(f)), 'Link do formulário copiado!')
    } catch (e) {
      mostrar(e instanceof Error ? e.message : String(e), 'erro')
    }
  }

  // Rótulo cosmético do link limpo: só o PRIMEIRO nome (URL mais curta).
  function rotuloLink(f: Formulario): string {
    return primeiroNome(f.cliente_nome) || 'formulario'
  }

  async function excluir(f: Formulario) {
    const ok = await confirmar(`Excluir o formulário de ${f.cliente_nome || 'cliente'}?`, {
      perigo: true,
      confirmar: 'Excluir',
    })
    if (!ok) return
    try {
      await excluirFormulario(f.id)
      await recarregar()
    } catch (e) {
      mostrar(e instanceof Error ? e.message : String(e), 'erro')
    }
  }

  function enviarWhatsApp(f: Formulario) {
    const c = f.cliente_id ? clientePorId.get(f.cliente_id) : null
    const nome = primeiroNome(f.cliente_nome || c?.responsavel || c?.nome_marca)
    const def = definicaoFormulario(f.tipo)
    const msg = [
      `Olá${nome ? `, ${nome}` : ''}! Como vai?`,
      '',
      `Pra começarmos o Projeto Marca com Essência©, o primeiro passo é preencher o formulário ${
        def?.nome || 'do projeto'
      }.`,
      '',
      'Segue o link abaixo:',
      linkPublicoFormulario(f.token, rotuloLink(f)),
      '',
      'Pode responder com calma: fica salvo automaticamente, dá pra parar e voltar depois no mesmo link.',
      'Qualquer dúvida, me chama!',
    ].join('\n')
    abrirWhatsApp(c?.telefone, msg, f.cliente_nome || null)
  }

  const filtrada = lista.filter((f) => {
    if (!busca.trim()) return true
    const alvo = normalizar(`${f.cliente_nome || ''} ${definicaoFormulario(f.tipo)?.nome || ''}`)
    return alvo.includes(normalizar(busca))
  })

  const vendo = vendoId ? lista.find((f) => f.id === vendoId) : null
  if (vendo) return <DetalheFormulario f={vendo} aoVoltar={() => setVendoId(null)} aoMudar={recarregar} />

  return (
    <div>
      <p style={{ marginBottom: '1rem' }}>
        <button className="btn" onClick={() => setNovo((v) => !v)}>
          {novo ? 'Cancelar' : '+ Novo formulário'}
        </button>
      </p>

      {novo && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3>Novo formulário</h3>
          <div className="form-grade">
            <div className="field">
              <label>Formulário</label>
              <select value={tipoNovo} onChange={(e) => setTipoNovo(e.target.value)}>
                {Object.values(FORMULARIOS).map((d) => (
                  <option key={d.tipo} value={d.tipo}>
                    {d.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Cliente</label>
              <select value={clienteNovo} onChange={(e) => setClienteNovo(e.target.value)}>
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
                  <input
                    type="radio"
                    checked={prefill}
                    onChange={() => setPrefill(true)}
                  />
                  Pré-preenchido com os dados do cliente
                </label>
                <label className="form-radio">
                  <input
                    type="radio"
                    checked={!prefill}
                    onChange={() => setPrefill(false)}
                  />
                  Em branco
                </label>
              </div>
              <span className="campo-ajuda">
                Pré-preenchido já preenche nome, e-mail e cidade do cadastro (se houver). O cliente
                ainda pode ajustar.
              </span>
            </div>
          </div>
          <p>
            <button className="btn" onClick={() => void criar()}>
              Criar e copiar o link
            </button>
          </p>
        </div>
      )}

      {erro && <div className="erro-msg">{erro}</div>}
      {carregando && <p>Carregando…</p>}

      {!carregando && lista.length > 0 && (
        <Busca valor={busca} aoMudar={setBusca} placeholder="Buscar por cliente…" />
      )}

      {!carregando && lista.length === 0 && !erro && (
        <div className="card">
          <h3>Nenhum formulário ainda.</h3>
          <p style={{ color: 'var(--t-600)' }}>
            Clique em <strong>+ Novo formulário</strong>, escolha o cliente e envie o link. Ele
            preenche sem login, e o que escrever fica salvo automaticamente.
          </p>
        </div>
      )}

      <div className="form-cards">
        {filtrada.map((f) => {
          const def = definicaoFormulario(f.tipo)
          const total = def ? camposDe(def).length : 0
          const resp = def
            ? camposDe(def).filter((c) => (f.respostas?.[c.id] || '').trim()).length
            : 0
          // "Preenchido" (verde) quando enviado OU quando o cliente respondeu tudo.
          const completo = f.status === 'enviado' || (total > 0 && resp === total)
          return (
            <div key={f.id} className={`form-card ${completo ? 'form-card--ok' : ''}`}>
              <div className="form-card__topo">
                <button className="cel-abrir" onClick={() => setVendoId(f.id)}>
                  {f.cliente_nome || 'Sem cliente'}
                </button>
                <span className={`badge ${completo ? 'badge--verde' : 'badge--azul'}`}>
                  {completo ? 'Preenchido' : 'Em preenchimento'}
                </span>
              </div>
              <div className="form-card__meta">
                {def?.nome} · {resp}/{total} respostas
                {f.enviado_em && ` · enviado em ${formatarData(f.enviado_em)}`}
                {!f.enviado_em && f.atualizado_em && ` · atualizado em ${formatarData(f.atualizado_em)}`}
              </div>
              <div className="form-card__acoes">
                <button className="btn--voltar" onClick={() => setVendoId(f.id)}>
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
    </div>
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
          ← Formulários
        </button>
        <button
          className="btn--voltar"
          onClick={() => imprimirComoPdf(def.nome, f.cliente_nome)}
        >
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

import { useEffect, useState } from 'react'
import { Busca, normalizar } from '../../components/Busca'
import { useToast } from '../../components/Toast'
import { useFichaUrl } from '../../hooks/useFichaUrl'
import { useArquivoXlsx } from '../../hooks/useArquivoXlsx'
import { confirmar } from '../../lib/confirmar'
import { formatarData } from '../../lib/gestao'
import { abrirWhatsApp } from '../../lib/whatsapp'
import {
  STATUS_LEAD,
  agruparLeads,
  ultimaAtividade,
  atualizarLead,
  excluirLead,
  listarLeads,
  mensagemLead,
  rotuloStatusLead,
  type Lead,
  type StatusLead,
} from '../../lib/leads'

// ============================================================================
// Aba LEADS — quem fez as ferramentas do site (Teste Valor real × Valor
// percebido). A KA acompanha o resultado de cada pessoa, chama no WhatsApp,
// marca o status (novo → contatado → inscrito na aula) e baixa em Excel.
// ============================================================================

type FiltroStatus = 'todos' | StatusLead

const CLASSE_STATUS: Record<StatusLead, string> = {
  novo: 'badge--azul',
  contatado: 'badge--dourado',
  inscrito: 'badge--verde',
  sem_interesse: 'badge--cinza',
}

function statusDe(l: Lead): StatusLead {
  return (l.status as StatusLead) || 'novo'
}

function dataHora(iso: string | null | undefined): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

function media(nums: (number | null | undefined)[]): number | null {
  const v = nums.filter((n): n is number => typeof n === 'number')
  if (!v.length) return null
  return Math.round(v.reduce((a, b) => a + b, 0) / v.length)
}

function maisComum(valores: (string | null | undefined)[]): string | null {
  const cont = new Map<string, number>()
  for (const v of valores) if (v) cont.set(v, (cont.get(v) ?? 0) + 1)
  let melhor: string | null = null
  let n = 0
  cont.forEach((q, k) => {
    if (q > n) {
      melhor = k
      n = q
    }
  })
  return melhor
}

export function GestaoLeads() {
  const { mostrar } = useToast()
  const { idAberto, abrir, fechar } = useFichaUrl('id')
  const [lista, setLista] = useState<Lead[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<FiltroStatus>('todos')
  const [perfil, setPerfil] = useState('')

  async function recarregar() {
    try {
      setCarregando(true)
      setLista(agruparLeads(await listarLeads()))
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

  const perfis = Array.from(new Set(lista.map((l) => l.perfil).filter(Boolean))) as string[]

  const filtrada = lista.filter((l) => {
    if (filtro !== 'todos' && statusDe(l) !== filtro) return false
    if (perfil && l.perfil !== perfil) return false
    const q = normalizar(busca).trim()
    if (!q) return true
    return normalizar(
      `${l.nome} ${l.email ?? ''} ${l.whatsapp ?? ''} ${l.segmento ?? ''} ${l.perfil ?? ''}`,
    ).includes(q)
  })

  const contagem = (s: FiltroStatus) =>
    s === 'todos' ? lista.length : lista.filter((l) => statusDe(l) === s).length

  // Planilha montada ANTES do clique (download confiável no iPhone).
  const { url: urlXlsx } = useArquivoXlsx(
    [
      'Data', 'Nome', 'E-mail', 'WhatsApp', 'Segmento', 'Valor real (%)', 'Valor percebido (%)',
      'Distância', 'Perfil', 'Status', 'Anotação', 'Origem', 'utm_source', 'utm_campaign', 'Respostas',
      'Testes feitos', 'Primeiro teste',
    ],
    filtrada.map((l) => [
      dataHora(ultimaAtividade(l)),
      l.nome,
      l.email ?? '',
      l.whatsapp ?? '',
      l.segmento ?? '',
      l.valor_real ?? null,
      l.valor_percebido ?? null,
      l.distancia ?? null,
      l.perfil ?? '',
      rotuloStatusLead(statusDe(l)),
      l.nota ?? '',
      l.origem ?? '',
      l.utm_source ?? '',
      l.utm_campaign ?? '',
      (l.respostas ?? []).map((r) => `${r.id}: ${r.resposta} (${r.pontos})`).join(' | '),
      l.testes ?? 1,
      dataHora(l.primeiro_em || l.criado_em),
    ]),
    'Leads',
  )

  async function mudarStatus(l: Lead, status: StatusLead) {
    setLista((ls) => ls.map((x) => (x.id === l.id ? { ...x, status } : x)))
    try {
      await atualizarLead(l.id, { status })
      mostrar(`${l.nome}: ${rotuloStatusLead(status)}.`, 'ok')
    } catch (e) {
      mostrar(e instanceof Error ? e.message : String(e), 'erro')
      void recarregar()
    }
  }

  async function excluir(l: Lead) {
    // Uma linha pode juntar vários envios da mesma pessoa (ela refez o teste) —
    // todos vão juntos para a lixeira, então o aviso diz quantos são.
    const juntos = 1 + (l.ids_extras?.length ?? 0)
    const aviso =
      juntos > 1
        ? `Mover para a lixeira os ${juntos} registros de ${l.nome}?`
        : `Mover o lead de ${l.nome} para a lixeira?`
    if (!(await confirmar(aviso, { perigo: true, confirmar: 'Excluir' }))) return
    setLista((ls) => ls.filter((x) => x.id !== l.id))
    try {
      await excluirLead(l.id, l.ids_extras ?? [])
      mostrar('Lead movido para a lixeira.', 'ok')
      if (idAberto === l.id) fechar()
    } catch (e) {
      mostrar(e instanceof Error ? e.message : String(e), 'erro')
      void recarregar()
    }
  }

  function chamar(l: Lead) {
    abrirWhatsApp(l.whatsapp, mensagemLead(l), l.nome)
    if (statusDe(l) === 'novo') void mudarStatus(l, 'contatado')
  }

  const sel = idAberto ? (lista.find((l) => l.id === idAberto) ?? null) : null
  if (sel) {
    return (
      <FichaLead
        key={sel.id}
        lead={sel}
        aoVoltar={fechar}
        aoStatus={(s) => void mudarStatus(sel, s)}
        aoChamar={() => chamar(sel)}
        aoExcluir={() => void excluir(sel)}
        aoSalvarNota={async (nota) => {
          await atualizarLead(sel.id, { nota })
          setLista((ls) => ls.map((x) => (x.id === sel.id ? { ...x, nota } : x)))
          mostrar('Anotação salva.', 'ok')
        }}
      />
    )
  }

  const novos = contagem('novo')
  const refizeram = lista.filter((l) => (l.testes ?? 1) > 1).length
  const mVR = media(lista.map((l) => l.valor_real))
  const mVP = media(lista.map((l) => l.valor_percebido))
  const perfilTop = maisComum(lista.map((l) => l.perfil))
  const segmentoTop = maisComum(lista.map((l) => l.segmento))

  return (
    <>
      <div className="gestao-acoes">
        <button className="btn--ghost" onClick={() => void recarregar()}>
          ↻ Atualizar
        </button>
        {filtrada.length > 0 &&
          (urlXlsx ? (
            <a className="btn--voltar" href={urlXlsx} download={`leads-${new Date().toISOString().slice(0, 10)}.xlsx`}>
              ⤓ Baixar em Excel
            </a>
          ) : (
            <span className="btn--voltar btn--esperando">Preparando planilha…</span>
          ))}
        <span className="espaco" />
      </div>

      {erro && <div className="erro-msg">{erro}</div>}
      {carregando && <p style={{ color: 'var(--t-500)', fontSize: '0.85rem' }}>Carregando…</p>}

      {!carregando && lista.length === 0 && !erro && (
        <div className="card">
          <h3>Nenhum lead ainda.</h3>
          <p>
            Cada pessoa que fizer o teste em kellyalbert.com.br/valorpercebido aparece aqui na hora,
            com o resultado, o segmento e o WhatsApp para você chamar.
          </p>
        </div>
      )}

      {lista.length > 0 && (
        <div className="fin-cards">
          <div className="fin-card">
            <div className="fin-card__quem">Leads</div>
            <div className="fin-card__valor">{lista.length}</div>
            <div className="fin-card__mensal">
              {novos} {novos === 1 ? 'novo' : 'novos'} para chamar
              {refizeram > 0 && ` · ${refizeram} ${refizeram === 1 ? 'refez' : 'refizeram'} o teste`}
            </div>
          </div>
          <div className="fin-card">
            <div className="fin-card__quem">Média do teste</div>
            <div className="fin-card__valor">
              {mVR ?? '-'}% × {mVP ?? '-'}%
            </div>
            <div className="fin-card__mensal">valor real × valor percebido</div>
          </div>
          <div className="fin-card">
            <div className="fin-card__quem">Perfil mais comum</div>
            <div className="fin-card__valor lead-card__texto">{perfilTop ?? '-'}</div>
          </div>
          <div className="fin-card">
            <div className="fin-card__quem">Segmento que mais respondeu</div>
            <div className="fin-card__valor lead-card__texto">{segmentoTop ?? '-'}</div>
          </div>
        </div>
      )}

      {lista.length > 0 && (
        <>
          <div className="chips" style={{ marginBottom: '0.6rem' }}>
            {(['todos', ...STATUS_LEAD.map((s) => s.valor)] as FiltroStatus[]).map((s) => (
              <button
                key={s}
                className={`chip ${filtro === s ? 'chip--on' : ''}`}
                onClick={() => setFiltro(s)}
              >
                {s === 'todos' ? 'Todos' : rotuloStatusLead(s)} <span className="chip__n">{contagem(s)}</span>
              </button>
            ))}
          </div>
          <div className="lead-filtros">
            <Busca valor={busca} aoMudar={setBusca} placeholder="Buscar por nome, segmento, e-mail…" />
            {perfis.length > 0 && (
              <select className="lead-filtros__perfil" value={perfil} onChange={(e) => setPerfil(e.target.value)} aria-label="Filtrar por perfil">
                <option value="">Todos os perfis</option>
                {perfis.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            )}
          </div>
        </>
      )}
      {lista.length > 0 && filtrada.length === 0 && <p className="ativ-vazio">Nenhum lead encontrado com esse filtro.</p>}

      {filtrada.length > 0 && (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Resultado</th>
                <th>Data</th>
                <th>Status</th>
                <th className="acoes"></th>
              </tr>
            </thead>
            <tbody>
              {filtrada.map((l) => (
                <tr key={l.id}>
                  <td className="cel-nome" data-label="Nome">
                    <button className="cel-abrir" onClick={() => abrir(l.id)}>
                      {l.nome}
                    </button>
                    <div className="lead-sub">{l.segmento || 'Segmento não informado'}</div>
                    {(l.testes ?? 1) > 1 && <span className="lead-badge">↻ Fez {l.testes} testes</span>}
                  </td>
                  <td data-label="Resultado">
                    <strong>{l.valor_real ?? '-'}%</strong> × <strong>{l.valor_percebido ?? '-'}%</strong>
                    <div className="lead-sub">{l.perfil ?? ''}</div>
                  </td>
                  <td data-label="Data">
                    {formatarData(ultimaAtividade(l))}
                    {(l.testes ?? 1) > 1 && <div className="lead-sub">1º em {formatarData(l.primeiro_em || l.criado_em)}</div>}
                  </td>
                  <td data-label="Status">
                    <select
                      className={`lead-status ${CLASSE_STATUS[statusDe(l)]}`}
                      value={statusDe(l)}
                      onChange={(e) => void mudarStatus(l, e.target.value as StatusLead)}
                      aria-label={`Status de ${l.nome}`}
                    >
                      {STATUS_LEAD.map((s) => (
                        <option key={s.valor} value={s.valor}>
                          {s.rotulo}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="acoes" data-label="">
                    <button className="btn-mini btn-mini--whats" onClick={() => chamar(l)}>
                      WhatsApp
                    </button>
                    <button className="btn-mini" onClick={() => abrir(l.id)}>
                      Ver
                    </button>
                    <button className="btn-mini btn-mini--perigo" onClick={() => void excluir(l)}>
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

function FichaLead({
  lead: l,
  aoVoltar,
  aoStatus,
  aoChamar,
  aoExcluir,
  aoSalvarNota,
}: {
  lead: Lead
  aoVoltar: () => void
  aoStatus: (s: StatusLead) => void
  aoChamar: () => void
  aoExcluir: () => void
  aoSalvarNota: (nota: string) => Promise<void>
}) {
  const [nota, setNota] = useState(l.nota ?? '')
  const [salvando, setSalvando] = useState(false)
  const { mostrar } = useToast()

  async function salvar() {
    setSalvando(true)
    try {
      await aoSalvarNota(nota.trim())
    } catch (e) {
      mostrar(e instanceof Error ? e.message : String(e), 'erro')
    } finally {
      setSalvando(false)
    }
  }

  const bloco1 = (l.respostas ?? []).filter((r) => Number(r.id.replace(/\D/g, '')) <= 6)
  const bloco2 = (l.respostas ?? []).filter((r) => Number(r.id.replace(/\D/g, '')) > 6)

  return (
    <>
      <p style={{ marginBottom: '1rem' }}>
        <button className="btn--voltar" onClick={aoVoltar}>
          ← Todos os leads
        </button>
      </p>

      <div className="card">
        <div className="lead-ficha__topo">
          <div>
            <h3 style={{ margin: 0 }}>{l.nome}</h3>
            <p className="lead-sub">
              {l.segmento || 'Segmento não informado'} · {dataHora(ultimaAtividade(l))}
              {l.ferramenta ? ` · ${l.ferramenta}` : ''}
            </p>
            {(l.testes ?? 1) > 1 && (
              <p className="lead-badge" style={{ marginTop: '.4rem' }}>
                ↻ Fez {l.testes} testes · o primeiro em {formatarData(l.primeiro_em || l.criado_em)}
              </p>
            )}
          </div>
          <select
            className={`lead-status ${CLASSE_STATUS[statusDe(l)]}`}
            value={statusDe(l)}
            onChange={(e) => aoStatus(e.target.value as StatusLead)}
            aria-label="Status do lead"
          >
            {STATUS_LEAD.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.rotulo}
              </option>
            ))}
          </select>
        </div>

        <div className="fin-cards" style={{ marginTop: '1rem' }}>
          <div className="fin-card">
            <div className="fin-card__quem">Valor real</div>
            <div className="fin-card__valor">{l.valor_real ?? '-'}%</div>
            <div className="fin-card__mensal">o que a marca entrega</div>
          </div>
          <div className="fin-card">
            <div className="fin-card__quem">Valor percebido</div>
            <div className="fin-card__valor">{l.valor_percebido ?? '-'}%</div>
            <div className="fin-card__mensal">o que o cliente enxerga</div>
          </div>
          <div className="fin-card">
            <div className="fin-card__quem">Perfil</div>
            <div className="fin-card__valor lead-card__texto">{l.perfil ?? '-'}</div>
            {l.distancia != null && <div className="fin-card__mensal">distância de {l.distancia} pontos</div>}
          </div>
        </div>

        <div className="lead-contato">
          <div>
            <span className="lead-rot">WhatsApp</span> {l.whatsapp || '-'}
          </div>
          <div>
            <span className="lead-rot">E-mail</span>{' '}
            {l.email ? <a href={`mailto:${l.email}`}>{l.email}</a> : '-'}
          </div>
          {(l.origem || l.utm_source) && (
            <div>
              <span className="lead-rot">Origem</span> {[l.origem, l.utm_source, l.utm_campaign].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>

        <div className="gestao-acoes" style={{ marginTop: '1rem' }}>
          <button className="btn btn--whats-lead" style={{ background: '#25D366', color: '#0B2615' }} onClick={aoChamar}>
            Chamar no WhatsApp
          </button>
          <span className="espaco" />
          <button className="btn--ghost" onClick={aoExcluir}>
            Excluir
          </button>
        </div>

        <div className="field" style={{ marginTop: '1rem' }}>
          <label>Anotações</label>
          <textarea
            rows={3}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ex.: chamei no dia 06/11, vai pensar na aula."
          />
          <button className="btn" style={{ marginTop: '0.5rem' }} disabled={salvando || nota === (l.nota ?? '')} onClick={() => void salvar()}>
            {salvando ? 'Salvando…' : 'Salvar anotação'}
          </button>
        </div>
      </div>

      {(l.historico ?? []).length > 0 && (
        <div className="card">
          <h3>Histórico de testes</h3>
          <ul className="lead-hist">
            <li className="lead-hist__atual">
              <span className="lead-hist__data">{dataHora(ultimaAtividade(l))} · mais recente</span>
              <span>
                <strong>{l.valor_real ?? '-'}% × {l.valor_percebido ?? '-'}%</strong> · {l.perfil ?? '-'}
              </span>
            </li>
            {(l.historico ?? []).map((h, i) => (
              <li key={i}>
                <span className="lead-hist__data">{dataHora(h.data)}</span>
                <span>
                  <strong>{h.valor_real ?? '-'}% × {h.valor_percebido ?? '-'}%</strong> · {h.perfil ?? '-'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(l.respostas ?? []).length > 0 && (
        <div className="card">
          <h3>Respostas do teste{(l.testes ?? 1) > 1 ? ' (mais recente)' : ''}</h3>
          {[
            ['Bloco 1 · Valor real', bloco1],
            ['Bloco 2 · Valor percebido', bloco2],
          ].map(([tit, rs]) =>
            (rs as typeof bloco1).length ? (
              <div key={tit as string} className="form-resp__secao">
                <div className="form-resp__secao-tit">{tit as string}</div>
                {(rs as typeof bloco1).map((r) => (
                  <div key={r.id} className="form-resp__item">
                    <div className="form-resp__pergunta">{r.pergunta}</div>
                    <div className="form-resp__resposta">
                      {r.resposta} <span className="lead-sub">({r.pontos} pontos)</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null,
          )}
        </div>
      )}
    </>
  )
}

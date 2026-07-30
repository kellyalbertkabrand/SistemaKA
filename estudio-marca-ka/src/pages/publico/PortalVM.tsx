import { useEffect, useState } from 'react'
import { listarClientes } from '../../lib/api'
import { formatarBRL, formatarData, listarCobrancas, statusEfetivo } from '../../lib/gestao'
import { listarProjetos, pendenciasDeProjetos, type Pendencia, type Projeto } from '../../lib/projetos'
import { linhasFinanceiro, rotuloForma, type LinhaFinanceiro } from '../../lib/financeiro'
import {
  listarAtividades,
  alternarAtividade,
  editarAtividade,
  criarAtividade,
  type Atividade,
} from '../../lib/atividades'
import type { Cliente, Cobranca } from '../../lib/database.types'
import { somarDinheiro, arredondar } from '../../lib/ui'
import { useTituloPagina } from '../../hooks/useTituloPagina'
import '../../styles/gestao.css'
import '../../styles/projeto.css'

// ============================================================================
// PORTAL DA VM ROCKS — página só-leitura, aberta por link (token).
// Mostra APENAS o que é da VM: as tarefas dela nos projetos + o que ela tem a
// receber (cobranças onde ela participa + pagamentos de contrato marcados VM).
// Não mostra clientes, caixa da KA, cuidadoras nem nada mais.
// ============================================================================

const ROTULO_FASE = { pendente: 'A seguir', andamento: '● Em andamento', concluida: 'Concluída' }

export function PortalVM() {
  const [projetos, setProjetos] = useState<Projeto[] | null>(null)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([])
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [novoTitulo, setNovoTitulo] = useState('')
  const [novaData, setNovaData] = useState('')
  const [adicionando, setAdicionando] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editTitulo, setEditTitulo] = useState('')
  useTituloPagina('Valores a receber e atividades · VM Rocks')

  useEffect(() => {
    Promise.all([listarProjetos(), listarClientes(), listarCobrancas(), listarAtividades()])
      .then(([ps, cs, cb, ativ]) => {
        setProjetos(ps)
        setClientes(cs)
        setCobrancas(cb)
        setAtividades(ativ)
      })
      .catch((e) => setErro(e instanceof Error ? e.message : String(e)))
      .finally(() => setCarregando(false))
  }, [])

  if (carregando) {
    return (
      <div className="proj-pub">
        <div className="proj-hero">
          <div className="proj-hero__eyebrow">Portal da parceira</div>
          <h1>Carregando…</h1>
        </div>
      </div>
    )
  }

  const nomeCliente = (id: string | null) => (id ? clientes.find((c) => c.id === id)?.nome_marca ?? '' : '')

  // Tarefas da VM (etapas em aberto onde o responsável é a VM), AGRUPADAS por
  // cliente — assim a VM vê organizado quem é quem.
  const tarefas: Pendencia[] = projetos ? pendenciasDeProjetos(projetos, 'VM') : []
  // Tarefas AVULSAS que a Kelly cria direto em Atividades com a categoria "VM
  // Rocks" (categoria 'vm'). A VM pode marcar como concluída e mudar a data — as
  // não feitas primeiro (por data), as concluídas por último.
  const tarefasAvulsas = atividades
    .filter((a) => a.categoria === 'vm')
    .sort(
      (a, b) => Number(a.feito) - Number(b.feito) || (a.data || '￿').localeCompare(b.data || '￿'),
    )

  // A VM ADICIONA uma tarefa — vira uma atividade da categoria "VM", que aparece
  // no painel de Atividades da Kelly e aqui no portal.
  async function adicionarTarefa(e: React.FormEvent) {
    e.preventDefault()
    const titulo = novoTitulo.trim()
    if (!titulo || adicionando) return
    setAdicionando(true)
    try {
      const menor = Math.min(0, ...atividades.filter((a) => a.categoria === 'vm').map((a) => a.ordem ?? 0))
      const nova = await criarAtividade({
        titulo,
        categoria: 'vm',
        data: novaData || null,
        ordem: menor - 1,
      })
      setAtividades((l) => [nova, ...l])
      setNovoTitulo('')
      setNovaData('')
      setErro(null)
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err))
    } finally {
      setAdicionando(false)
    }
  }

  // A VM EDITA o texto da própria tarefa (clica no título → vira campo).
  function iniciarEdicao(a: Atividade) {
    setEditId(a.id)
    setEditTitulo(a.titulo)
  }
  async function salvarEdicao() {
    const id = editId
    if (!id) return
    const titulo = editTitulo.trim()
    setEditId(null)
    if (!titulo) return
    setAtividades((l) => l.map((x) => (x.id === id ? { ...x, titulo } : x)))
    try {
      await editarAtividade(id, { titulo })
    } catch {
      /* mantém o valor otimista; ao recarregar vem o certo */
    }
  }

  // A VM marca/desmarca a própria tarefa e ajusta a data (atualiza na hora).
  async function alternarVM(a: Atividade) {
    const feito = !a.feito
    setAtividades((l) => l.map((x) => (x.id === a.id ? { ...x, feito } : x)))
    try {
      await alternarAtividade(a.id, feito)
    } catch {
      setAtividades((l) => l.map((x) => (x.id === a.id ? { ...x, feito: !feito } : x)))
    }
  }
  async function mudarDataVM(a: Atividade, data: string) {
    const nova = data || null
    setAtividades((l) => l.map((x) => (x.id === a.id ? { ...x, data: nova } : x)))
    try {
      await editarAtividade(a.id, { data: nova })
    } catch {
      /* mantém o valor otimista; recarregar traz o certo */
    }
  }
  const tarefasPorCliente = (() => {
    const map = new Map<string, { cliente: string; itens: Pendencia[] }>()
    for (const pd of tarefas) {
      const cliente = pd.cliente_nome || 'Sem cliente'
      const cur = map.get(cliente) ?? { cliente, itens: [] }
      cur.itens.push(pd)
      map.set(cliente, cur)
    }
    return [...map.values()].sort((a, b) => a.cliente.localeCompare(b.cliente))
  })()

  // A receber da VM: cobranças em aberto onde ela participa + pagamentos de
  // contrato marcados como "VM Rocks".
  const emAberto = (c: Cobranca) => {
    const s = statusEfetivo(c)
    return s === 'pendente' || s === 'atrasada'
  }
  const valorDaVM = (c: Cobranca) => Number(c.valor_vm ?? c.valor ?? 0)
  const vmCobrancas = cobrancas.filter((c) => emAberto(c) && c.vm_participa)
  const totalCobrancas = somarDinheiro(vmCobrancas.map(valorDaVM))

  const linhasVM: LinhaFinanceiro[] = linhasFinanceiro(clientes).filter((l) => l.rotulo === 'VM Rocks')
  const totalContratoUnico = somarDinheiro(linhasVM.map((l) => l.unico))
  const totalContratoMensal = somarDinheiro(linhasVM.map((l) => l.mensal))

  const totalGeral = arredondar(totalCobrancas + totalContratoUnico)
  const temAlgo = vmCobrancas.length > 0 || linhasVM.length > 0

  return (
    <div className="proj-pub vm-portal">
      <header className="proj-hero">
        <div className="proj-hero__eyebrow">Portal da parceira</div>
        <h1>VM Rocks</h1>
        <div className="proj-hero__meta">
          Valores a Receber e atividades em projetos em parceria com a KA | Inteligência para Marcas
        </div>
        <div className="proj-vivo">Você conclui e ajusta a data das suas tarefas aqui</div>
      </header>

      {erro && <div className="erro-msg" style={{ margin: '1rem' }}>{erro}</div>}

      {/* ===== A RECEBER ===== */}
      <div className="proj-card">
        <div className="proj-card__titulo">A Receber</div>
        <div className="vm-total">
          {formatarBRL(totalGeral)}
          {totalContratoMensal > 0 && <span className="vm-total__mes"> + {formatarBRL(totalContratoMensal)}/mês</span>}
        </div>

        {!temAlgo && <p className="ativ-vazio">Nada a receber registrado ainda.</p>}

        {vmCobrancas.length > 0 && (
          <section className="fin-secao" style={{ marginTop: '1rem' }}>
            <h3 className="fin-secao__tit">Cobranças em aberto</h3>
            <div className="fin-lista">
              {vmCobrancas
                .slice()
                .sort((a, b) => ((a.vencimento || '') < (b.vencimento || '') ? -1 : 1))
                .map((c) => (
                  <div key={c.id} className="mov mov--receber">
                    <div className="mov__corpo">
                      <div className="mov__desc">{c.descricao}</div>
                      <div className="mov__meta">
                        {nomeCliente(c.cliente_id) || 'cliente'} · vence {formatarData(c.vencimento)}
                        {statusEfetivo(c) === 'atrasada' ? ' · atrasada' : ''}
                      </div>
                    </div>
                    <div className="mov__valor mov__valor--receber">{formatarBRL(valorDaVM(c))}</div>
                  </div>
                ))}
            </div>
          </section>
        )}

        {linhasVM.length > 0 && (
          <section className="fin-secao" style={{ marginTop: '1rem' }}>
            <h3 className="fin-secao__tit">Por contrato</h3>
            <div className="fin-lista">
              {linhasVM
                .slice()
                .sort((a, b) => b.unico + b.mensal - (a.unico + a.mensal))
                .map((l, i) => (
                  <div key={`${l.cliente_id}-${i}`} className="mov mov--receber">
                    <div className="mov__corpo">
                      <div className="mov__desc">{l.cliente_nome}</div>
                      <div className="mov__meta">
                        {rotuloForma(l, formatarBRL)}
                        {l.data ? ` · ${formatarData(l.data)}` : ''}
                      </div>
                    </div>
                    <div className="mov__valor mov__valor--receber">
                      {l.unico > 0 && formatarBRL(l.unico)}
                      {l.mensal > 0 && `${formatarBRL(l.mensal)}/mês`}
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}
      </div>

      {/* ===== TAREFAS (a VM adiciona, conclui e ajusta a data) ===== */}
      <div className="proj-card">
        <div className="proj-card__titulo">Tarefas</div>
        <p className="ativ-vazio" style={{ marginTop: 0 }}>
          Adicione suas tarefas, marque quando concluir e ajuste a data — salva na hora e aparece
          para a Kelly no painel dela.
        </p>
        <form className="vm-add" onSubmit={(e) => void adicionarTarefa(e)}>
          <input
            value={novoTitulo}
            onChange={(e) => setNovoTitulo(e.target.value)}
            placeholder="Nova tarefa…"
          />
          <input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} title="Data (opcional)" />
          <button className="btn" type="submit" disabled={adicionando || !novoTitulo.trim()}>
            + Adicionar
          </button>
        </form>
        {tarefasAvulsas.length === 0 ? (
          <p className="ativ-vazio">Nenhuma tarefa ainda — adicione a primeira acima.</p>
        ) : (
          <div className="vm-tarefas">
            {tarefasAvulsas.map((a) => (
              <div key={a.id} className={`vm-tarefa vm-tarefa--${a.feito ? 'concluida' : 'pendente'}`}>
                <button
                  type="button"
                  className="vm-tarefa__check"
                  onClick={() => void alternarVM(a)}
                  title={a.feito ? 'Marcar como não feita' : 'Marcar como concluída'}
                  aria-pressed={a.feito}
                >
                  {a.feito ? '☑' : '☐'}
                </button>
                <div className="vm-tarefa__corpo">
                  {editId === a.id ? (
                    <input
                      className="vm-edit"
                      value={editTitulo}
                      autoFocus
                      onChange={(e) => setEditTitulo(e.target.value)}
                      onBlur={() => void salvarEdicao()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void salvarEdicao()
                        if (e.key === 'Escape') setEditId(null)
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="vm-tarefa__fase vm-tarefa__fase--btn"
                      style={a.feito ? { textDecoration: 'line-through', opacity: 0.6 } : undefined}
                      onClick={() => iniciarEdicao(a)}
                      title="Clique para editar"
                    >
                      {a.titulo}
                    </button>
                  )}
                  <div className="vm-tarefa__meta">
                    <span className="vm-tag">{a.cliente_nome ? a.cliente_nome : 'Geral'}</span>
                    <label className="vm-data">
                      <span className="vm-data__ic" aria-hidden>
                        📅
                      </span>
                      <input
                        type="date"
                        value={a.data ?? ''}
                        onChange={(e) => void mudarDataVM(a, e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== TAREFAS DA VM (agrupadas por cliente) ===== */}
      <div className="proj-card">
        <div className="proj-card__titulo">Atividades da VM nos projetos</div>
        {tarefas.length === 0 ? (
          <p className="ativ-vazio">Nenhuma etapa sua em aberto. Tudo em dia ✨</p>
        ) : (
          tarefasPorCliente.map((g) => (
            <section key={g.cliente} className="vm-grupo">
              <h3 className="vm-grupo__cli">
                {g.cliente} <span className="vm-grupo__n">{g.itens.length}</span>
              </h3>
              <div className="vm-tarefas">
                {g.itens.map((pd) => (
                  <div key={`${pd.projeto_id}-${pd.fase_idx}`} className={`vm-tarefa vm-tarefa--${pd.status}`}>
                    <div className="vm-tarefa__ponto">{pd.status === 'andamento' ? '●' : '○'}</div>
                    <div className="vm-tarefa__corpo">
                      <div className="vm-tarefa__fase">{pd.fase_nome}</div>
                      {pd.fase_desc && <div className="vm-tarefa__desc">{pd.fase_desc}</div>}
                      <div className="vm-tarefa__meta">
                        {pd.projeto_nome} · {ROTULO_FASE[pd.status]}
                        {pd.data ? ` · previsto ${formatarData(pd.data)}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      <p className="vm-nota">
        Esta página é atualizada quando você recarrega. Para dúvidas ou ajustes, fale com a Kelly.
      </p>

      <footer className="proj-rodape">
        <div className="proj-rodape__parceria">KA | Inteligência para Marcas | VM Rocks</div>
      </footer>
    </div>
  )
}

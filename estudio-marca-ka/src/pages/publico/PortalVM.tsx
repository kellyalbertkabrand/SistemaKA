import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { listarClientes } from '../../lib/api'
import { formatarBRL, formatarData, listarCobrancas, statusEfetivo } from '../../lib/gestao'
import { listarProjetos, pendenciasDeProjetos, type Pendencia, type Projeto } from '../../lib/projetos'
import { linhasFinanceiro, rotuloForma, type LinhaFinanceiro } from '../../lib/financeiro'
import type { Cliente, Cobranca } from '../../lib/database.types'
import { somarDinheiro, arredondar } from '../../lib/ui'
import { TOKEN_PORTAL_VM } from '../../lib/vm'
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
  const { token } = useParams<{ token: string }>()
  const tokenOk = token === TOKEN_PORTAL_VM

  const [projetos, setProjetos] = useState<Projeto[] | null>(null)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!tokenOk) {
      setCarregando(false)
      return
    }
    Promise.all([listarProjetos(), listarClientes(), listarCobrancas()])
      .then(([ps, cs, cb]) => {
        setProjetos(ps)
        setClientes(cs)
        setCobrancas(cb)
      })
      .catch((e) => setErro(e instanceof Error ? e.message : String(e)))
      .finally(() => setCarregando(false))
  }, [tokenOk])

  if (!tokenOk) {
    return (
      <div className="pub-wrap">
        <div className="pub-doc">
          <h1>Link inválido</h1>
          <p style={{ marginTop: '0.6rem', color: 'var(--t-500)' }}>
            Confira se o link foi copiado por inteiro, ou peça um novo à Kelly.
          </p>
        </div>
      </div>
    )
  }

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

  // Tarefas da VM (etapas em aberto onde o responsável é a VM).
  const tarefas: Pendencia[] = projetos ? pendenciasDeProjetos(projetos, 'VM') : []

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
          O que você tem a receber e suas tarefas — nos projetos que você faz com a KA
        </div>
        <div className="proj-vivo">Somente leitura</div>
      </header>

      {erro && <div className="erro-msg" style={{ margin: '1rem' }}>{erro}</div>}

      {/* ===== A RECEBER ===== */}
      <div className="proj-card">
        <div className="proj-card__titulo">Você tem a receber</div>
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

      {/* ===== TAREFAS DA VM ===== */}
      <div className="proj-card">
        <div className="proj-card__titulo">Suas tarefas nos projetos</div>
        {tarefas.length === 0 ? (
          <p className="ativ-vazio">Nenhuma etapa sua em aberto. Tudo em dia ✨</p>
        ) : (
          <div className="vm-tarefas">
            {tarefas.map((pd) => (
              <div key={`${pd.projeto_id}-${pd.fase_idx}`} className={`vm-tarefa vm-tarefa--${pd.status}`}>
                <div className="vm-tarefa__ponto">{pd.status === 'andamento' ? '●' : '○'}</div>
                <div className="vm-tarefa__corpo">
                  <div className="vm-tarefa__fase">{pd.fase_nome}</div>
                  {pd.fase_desc && <div className="vm-tarefa__desc">{pd.fase_desc}</div>}
                  <div className="vm-tarefa__meta">
                    {pd.projeto_nome}
                    {pd.cliente_nome ? ` · ${pd.cliente_nome}` : ''} · {ROTULO_FASE[pd.status]}
                    {pd.data ? ` · previsto ${formatarData(pd.data)}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
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

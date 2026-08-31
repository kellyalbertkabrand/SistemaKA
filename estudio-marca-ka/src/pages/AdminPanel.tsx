import { useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { SiteHeader, type ItemMenu } from '../components/SiteHeader'
import { clientesComTemplates } from '../templates/registry'
import { marcaVisual } from '../templates/marcas'
import { BrandStudio } from '../components/BrandStudio'
import { BackupBotao } from '../components/BackupBotao'
import { GateAdmin } from './gestao/GateAdmin'
import { GestaoClientes } from './gestao/GestaoClientes'
import { GestaoOrcamentos } from './gestao/GestaoOrcamentos'
import { GestaoContratos } from './gestao/GestaoContratos'
import { GestaoCobrancas } from './gestao/GestaoCobrancas'
import { GestaoCuidadoras } from './gestao/GestaoCuidadoras'
import { GestaoProjetos } from './gestao/GestaoProjetos'
import { GestaoAtividades } from './gestao/GestaoAtividades'
import { GestaoFinanceiro } from './gestao/GestaoFinanceiro'
import { GestaoRelatorios } from './gestao/GestaoRelatorios'
import { GestaoFormularios } from './gestao/GestaoFormularios'
import { GestaoLixeira } from './gestao/GestaoLixeira'
import '../styles/painel.css'
import '../styles/gestao.css'

type Aba =
  | 'inicio'
  | 'estudio'
  | 'clientes'
  | 'projetos'
  | 'orcamentos'
  | 'contratos'
  | 'cobrancas'
  | 'financeiro'
  | 'relatorios'
  | 'atividades'
  | 'cuidadoras'
  | 'formularios'
  | 'lixeira'

// Atalhos da HOME, agrupados por categoria. Ícones de linha (elegantes, no
// dourado da marca) desenhados abaixo em IconeAtalho.
const GRUPOS: { titulo: string; itens: { id: Aba; rotulo: string; icone: string }[] }[] = [
  {
    titulo: 'Criação',
    itens: [
      { id: 'estudio', rotulo: 'Estúdio', icone: 'estudio' },
      { id: 'atividades', rotulo: 'Atividades', icone: 'atividades' },
    ],
  },
  {
    titulo: 'Gestão do negócio',
    itens: [
      { id: 'clientes', rotulo: 'Clientes', icone: 'clientes' },
      { id: 'projetos', rotulo: 'Projetos', icone: 'projetos' },
      { id: 'formularios', rotulo: 'Formulários', icone: 'formularios' },
      { id: 'orcamentos', rotulo: 'Orçamentos', icone: 'orcamentos' },
      { id: 'contratos', rotulo: 'Contratos', icone: 'contratos' },
      { id: 'cobrancas', rotulo: 'Cobranças', icone: 'cobrancas' },
      { id: 'financeiro', rotulo: 'Financeiro', icone: 'financeiro' },
      { id: 'relatorios', rotulo: 'Relatórios', icone: 'relatorios' },
    ],
  },
  {
    titulo: 'Pessoal',
    itens: [
      { id: 'cuidadoras', rotulo: 'Cuidadoras', icone: 'cuidadoras' },
    ],
  },
]

// Ícones de linha finos (estilo editorial KA), herdam a cor por currentColor.
function IconeAtalho({ nome }: { nome: string }) {
  const p = {
    width: 26,
    height: 26,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  switch (nome) {
    case 'estudio':
      return (
        <svg {...p}>
          <path d="M12 3l1.7 6.3L20 12l-6.3 1.7L12 20l-1.7-6.3L4 12l6.3-1.7z" />
        </svg>
      )
    case 'clientes':
      return (
        <svg {...p}>
          <circle cx="12" cy="8" r="3.4" />
          <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
        </svg>
      )
    case 'projetos':
      return (
        <svg {...p}>
          <path d="M4 8a1 1 0 0 1 1-1h4l2 2h8a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
        </svg>
      )
    case 'orcamentos':
      return (
        <svg {...p}>
          <rect x="5" y="3" width="14" height="18" rx="1.6" />
          <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
        </svg>
      )
    case 'contratos':
      return (
        <svg {...p}>
          <rect x="5" y="3" width="14" height="18" rx="1.6" />
          <path d="M8.5 8h7M8.5 11.5h7" />
          <path d="M8.5 16.6q1.5-2 3 0t3 0" />
        </svg>
      )
    case 'cobrancas':
      return (
        <svg {...p}>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M3 10h18M6.5 14.5h3" />
        </svg>
      )
    case 'financeiro':
      return (
        <svg {...p}>
          <path d="M4 5v15h16" />
          <path d="M7.5 14l3-3.2 2.6 2.4 4.4-4.7" />
        </svg>
      )
    case 'relatorios':
      return (
        <svg {...p}>
          <rect x="5" y="3" width="14" height="18" rx="1.6" />
          <path d="M9 8h6" />
          <path d="M9 12h6M9 16h3" />
          <path d="M15.5 15.5l1.2 1.2 2-2.2" />
        </svg>
      )
    case 'atividades':
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="8.4" />
          <path d="M8.4 12.2l2.5 2.5 4.7-5" />
        </svg>
      )
    case 'cuidadoras':
      return (
        <svg {...p}>
          <path d="M12 19s-6-3.8-6-8.5A3.5 3.5 0 0 1 12 8a3.5 3.5 0 0 1 6 2.5C18 15.2 12 19 12 19z" />
        </svg>
      )
    case 'formularios':
      return (
        <svg {...p}>
          <rect x="5" y="3" width="14" height="18" rx="1.6" />
          <path d="M8.5 8h1M8.5 12h1M8.5 16h1" />
          <path d="M12 8h3.5M12 12h3.5M12 16h3.5" />
        </svg>
      )
    default:
      return null
  }
}

// Rótulos curtos para o menu (estilo site: maiúsculas, poucos caracteres).
// No desktop, o grupo "Gestão" abre como MENU SUSPENSO; no celular, os
// subitens aparecem listados na gaveta.
const MENU: ItemMenu[] = [
  { id: 'estudio', rotulo: 'Estúdio' },
  {
    id: 'gestao',
    rotulo: 'Gestão',
    filhos: [
      { id: 'clientes', rotulo: 'Clientes' },
      { id: 'projetos', rotulo: 'Projetos' },
      { id: 'formularios', rotulo: 'Formulários' },
      { id: 'orcamentos', rotulo: 'Orçamentos' },
      { id: 'contratos', rotulo: 'Contratos' },
      { id: 'cobrancas', rotulo: 'Cobranças' },
      { id: 'financeiro', rotulo: 'Financeiro' },
      { id: 'relatorios', rotulo: 'Relatórios' },
    ],
  },
  { id: 'atividades', rotulo: 'Atividades' },
  { id: 'cuidadoras', rotulo: 'Cuidadoras' },
  { id: 'lixeira', rotulo: 'Lixeira' },
]

const CABECALHOS: Record<Aba, { titulo: string; sub: string }> = {
  inicio: { titulo: 'Início', sub: 'Toque numa seção para abrir.' },
  estudio: { titulo: 'Seus clientes', sub: 'Selecione um cliente para gerar as artes na identidade dele.' },
  clientes: { titulo: 'Clientes & Acessos', sub: 'Ficha com os dados de cada cliente e quem pode entrar no sistema.' },
  orcamentos: { titulo: 'Orçamentos', sub: 'Monte a proposta, envie o link; aprovado, vira contrato + cobrança.' },
  contratos: { titulo: 'Contratos', sub: 'Modelo padrão, contratos gerados e assinaturas (aceite digital).' },
  cobrancas: { titulo: 'Cobranças', sub: 'Mensalidades e cobranças avulsas — boleto, PIX e cartão via Mercado Pago.' },
  financeiro: { titulo: 'Financeiro 🔒', sub: 'Seu caixa: entradas e saídas, a receber e quanto é seu vs da VM Rocks.' },
  relatorios: { titulo: 'Relatórios 🔒', sub: 'Gere relatórios financeiros por período e acompanhe o desempenho do site.' },
  projetos: { titulo: 'Projetos', sub: 'Fases de cada projeto — um clique para avançar; o cliente acompanha pelo link em tempo real.' },
  atividades: { titulo: 'Atividades 🔒', sub: 'Seu painel pessoal — tarefas da KA, da VM, BIA e Pessoal.' },
  cuidadoras: { titulo: 'Cuidadoras 🔒', sub: 'Seu controle pessoal — cadastro pelo link, ficha e documentos de cada cuidadora.' },
  formularios: { titulo: 'Formulários 🔒', sub: 'Etapas do Marca com Essência© — envie o link, o cliente preenche e salva sozinho.' },
  lixeira: { titulo: 'Lixeira 🗑️', sub: 'Itens excluídos. Restaure o que apagou por engano ou esvazie de vez.' },
}

const ABAS_VALIDAS: Aba[] = [
  'estudio',
  'clientes',
  'projetos',
  'orcamentos',
  'contratos',
  'cobrancas',
  'financeiro',
  'relatorios',
  'atividades',
  'cuidadoras',
  'formularios',
  'lixeira',
]

// Painel da KA: estúdio (aberto) + gestão (restrita à admin logada).
// A seção ativa fica no CAMINHO da URL (URLs limpas: /clientes, /financeiro…):
// assim o "voltar" do navegador funciona, dá para atualizar a página sem perder
// o lugar e compartilhar o link. A ficha aberta continua em ?id= (query).
export function AdminPanel() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  // Seção = 1ª parte do caminho (ex.: "/clientes" → "clientes"). "/" = início.
  const seg = location.pathname.replace(/^\/+/, '').split('/')[0]
  const abaPath = ABAS_VALIDAS.includes(seg as Aba) ? (seg as Aba) : null
  // Compatibilidade com links antigos (?aba=): usados como fallback + redirect.
  const paramAba = params.get('aba') as Aba | null
  const aba: Aba = abaPath ?? (paramAba && ABAS_VALIDAS.includes(paramAba) ? paramAba : 'inicio')

  // Link antigo /?aba=clientes → redireciona para a URL limpa /clientes,
  // preservando marca/id, sem poluir o histórico (replace).
  useEffect(() => {
    if (!abaPath && paramAba && ABAS_VALIDAS.includes(paramAba)) {
      const q = new URLSearchParams()
      const marca = params.get('marca')
      const id = params.get('id')
      if (marca) q.set('marca', marca)
      if (id) q.set('id', id)
      const qs = q.toString()
      navigate(`/${paramAba}${qs ? `?${qs}` : ''}`, { replace: true })
    }
  }, [abaPath, paramAba, params, navigate])

  // A marca aberta no Estúdio vive na URL (/estudio?marca=<slug>): F5 e "voltar"
  // do navegador não perdem o estúdio do cliente.
  const slug = aba === 'estudio' ? params.get('marca') : null
  const clientes = clientesComTemplates()
  const cab = CABECALHOS[aba]

  function irPara(id: Aba) {
    if (id !== 'inicio' && !ABAS_VALIDAS.includes(id)) return
    navigate(id === 'inicio' ? '/' : `/${id}`)
  }
  function abrirMarca(s: string) {
    navigate(`/estudio?marca=${encodeURIComponent(s)}`)
  }
  function fecharMarca() {
    navigate('/estudio')
  }

  return (
    <>
      <SiteHeader
        itens={MENU}
        ativo={aba}
        onSelecionar={(id) => irPara(id as Aba)}
      />
      <div className={`page${aba === 'inicio' ? ' page--inicio' : ''}`}>
        {aba === 'estudio' && slug ? (
          <>
            <p style={{ marginBottom: '1rem' }}>
              <button className="btn--voltar" onClick={fecharMarca}>
                ← Todos os clientes
              </button>
            </p>
            <BrandStudio slug={slug} admin />
          </>
        ) : (
          <>
            {/* Ao abrir um contrato, o próprio documento já tem cabeçalho — some
                o cabeçalho da aba (PAINEL KA / Contratos) p/ não duplicar. */}
            {!(aba === 'contratos' && (() => { const i = params.get('id'); return i && i !== 'novo' && i !== 'modelo' })()) && (
              <div className={`page__head${aba === 'inicio' ? ' page__head--inicio' : ''}`}>
                <div className="eyebrow">Painel KA</div>
                <h1>{cab.titulo}</h1>
                <p>{cab.sub}</p>
              </div>
            )}

            {aba === 'inicio' && (
              <div className="home-atalhos">
                {GRUPOS.map((g) => (
                  <div key={g.titulo} className="atalho-grupo">
                    <div className="atalho-grupo__tit">{g.titulo}</div>
                    <div className="grade-atalhos">
                      {g.itens.map((t) => (
                        <button key={t.id} className="atalho-card" onClick={() => irPara(t.id)}>
                          <span className="atalho-card__ico">
                            <IconeAtalho nome={t.icone} />
                          </span>
                          <span className="atalho-card__nome">{t.rotulo}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="atalho-grupo">
                  <div className="atalho-grupo__tit">Backup e segurança</div>
                  <BackupBotao />
                </div>
              </div>
            )}

            {aba === 'estudio' && (
              <>
                {clientes.length === 0 && (
                  <div className="card">
                    <h3>Nenhum cliente ainda.</h3>
                    <p>Os clientes aparecem aqui conforme seus layouts são integrados ao sistema.</p>
                  </div>
                )}
                <div className="grade-clientes">
                  {clientes.map((c) => {
                    const m = marcaVisual(c.slug)
                    return (
                      <button key={c.slug} className="cliente-card" onClick={() => abrirMarca(c.slug)}>
                        <div
                          className="cliente-card__capa"
                          style={{
                            backgroundColor: m.corPrincipal,
                            backgroundImage: m.capa ? `url(${m.capa})` : undefined,
                          }}
                        >
                          {m.logo ? <img src={m.logo} alt="" /> : <span>{c.nome}</span>}
                        </div>
                        <div className="cliente-card__corpo">
                          <h3>{c.nome}</h3>
                          {m.tagline && <div className="cliente-card__tagline">{m.tagline}</div>}
                          {m.paleta.length > 0 && (
                            <div className="cliente-card__paleta">
                              {m.paleta.map((cor) => (
                                <span key={cor} style={{ background: cor }} />
                              ))}
                            </div>
                          )}
                          <div className="cliente-card__rodape">
                            <span className="cliente-card__qtd">
                              {c.qtd} template{c.qtd > 1 ? 's' : ''}
                            </span>
                            <span className="cliente-card__cta">Abrir estúdio →</span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {aba === 'clientes' && (
              <GateAdmin>
                <GestaoClientes />
              </GateAdmin>
            )}
            {aba === 'orcamentos' && (
              <GateAdmin>
                <GestaoOrcamentos />
              </GateAdmin>
            )}
            {aba === 'contratos' && (
              <GateAdmin>
                <GestaoContratos />
              </GateAdmin>
            )}
            {aba === 'cobrancas' && (
              <GateAdmin>
                <GestaoCobrancas />
              </GateAdmin>
            )}
            {aba === 'cuidadoras' && (
              <GateAdmin>
                <GestaoCuidadoras />
              </GateAdmin>
            )}
            {aba === 'projetos' && (
              <GateAdmin>
                <GestaoProjetos />
              </GateAdmin>
            )}
            {aba === 'financeiro' && (
              <GateAdmin>
                <GestaoFinanceiro />
              </GateAdmin>
            )}
            {aba === 'relatorios' && (
              <GateAdmin>
                <GestaoRelatorios />
              </GateAdmin>
            )}
            {aba === 'atividades' && (
              <GateAdmin>
                <GestaoAtividades />
              </GateAdmin>
            )}
            {aba === 'formularios' && (
              <GateAdmin>
                <GestaoFormularios />
              </GateAdmin>
            )}
            {aba === 'lixeira' && (
              <GateAdmin>
                <GestaoLixeira />
              </GateAdmin>
            )}
          </>
        )}
      </div>
    </>
  )
}

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { formatarData } from '../../lib/gestao'
import {
  assinarProjetoPorToken,
  progressoProjeto,
  respClasse,
  rotuloResp,
  tokenDoParametro,
  type ProjetoPublico as Proj,
} from '../../lib/projetos'
import '../../styles/gestao.css'
import '../../styles/projeto.css'
import { useTituloPagina } from '../../hooks/useTituloPagina'

const LOGO_BRANCA = '/clientes/ka/ka-branco.png'

// Dados de demonstração (só em desenvolvimento, token "demo"): permite ver o
// layout da página sem banco — /projeto/demo
const DEMO: Proj = {
  nome: 'Marca com Essência©',
  cliente_nome: 'Cliente exemplo',
  descricao: 'Acompanhe aqui, em tempo real, cada etapa do seu projeto de marca.',
  status: 'ativo',
  inicio: '2026-06-20',
  atualizado_em: new Date().toISOString(),
  fases: [
    { nome: 'Revelação de Essência', descricao: 'IKIGAI Empresarial + Escuta Estratégica com os fundadores.', status: 'concluida', concluida_em: '2026-06-24T12:00:00Z', responsavel: 'KA', data: null },
    { nome: 'Base Estratégica + Identidade Verbal', descricao: 'Toda a inteligência da marca em um documento estratégico.', status: 'concluida', concluida_em: '2026-06-30T12:00:00Z', responsavel: 'KA', data: null },
    { nome: 'Identidade Visual', descricao: 'Tradução da essência em expressão estética. Parceria VM Rocks Design (Gabi Lucato).', status: 'andamento', concluida_em: null, responsavel: 'VM', data: '2026-07-18' },
    { nome: 'Personalização Instagram e WhatsApp', descricao: 'Canais de contato alinhados à identidade da marca.', status: 'pendente', concluida_em: null, responsavel: 'VM', data: '2026-07-25' },
    { nome: 'Linha de Produtos e Serviços', descricao: 'Reorganização estratégica da oferta, nomeação e proposta de valor.', status: 'pendente', concluida_em: null, responsavel: 'KA', data: null },
    { nome: 'Plano de Comunicação + Agente de IA', descricao: 'Pilares, calendário editorial e 01 agente de IA personalizado no ChatGPT, treinado com a essência da sua marca.', status: 'pendente', concluida_em: null, responsavel: 'KA', data: null },
  ],
}

// Página que o cliente abre pelo link: linha do tempo do projeto no visual da
// KA. Atualiza EM TEMPO REAL (onSnapshot) conforme as fases avançam.
export function ProjetoPublico() {
  useTituloPagina('Projeto')
  const { token: param } = useParams<{ token: string }>()
  const demo = import.meta.env.DEV && param === 'demo'
  // A URL pode vir personalizada ("boba-joy-<token>"); extraímos o token real.
  const token = param ? tokenDoParametro(param) : undefined
  const [proj, setProj] = useState<Proj | null>(demo ? DEMO : null)
  const [carregando, setCarregando] = useState(!demo)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!token || demo) return
    const parar = assinarProjetoPorToken(
      token,
      (p) => {
        setProj(p)
        setCarregando(false)
      },
      (e) => {
        setErro(e.message)
        setCarregando(false)
      },
    )
    return parar
  }, [token, demo])

  if (carregando) {
    return (
      <div className="proj-pub">
        <div className="proj-hero">
          <div className="proj-hero__eyebrow">Acompanhamento de projeto</div>
          <h1>Carregando…</h1>
        </div>
      </div>
    )
  }

  if (!proj) {
    return (
      <div className="pub-wrap">
        <div className="pub-doc">
          <h1>Projeto não encontrado</h1>
          <p style={{ marginTop: '0.6rem', color: 'var(--t-500)' }}>
            {erro ? erro : 'Confira se o link foi copiado por inteiro, ou fale com a Kelly.'}
          </p>
        </div>
      </div>
    )
  }

  const pct = progressoProjeto(proj)
  const total = proj.fases.length
  const feitas = proj.fases.filter((f) => f.status === 'concluida').length
  const atual =
    proj.fases.find((f) => f.status === 'andamento') ??
    proj.fases.find((f) => f.status === 'pendente') ??
    null
  const concluido = proj.status === 'concluido' || (total > 0 && feitas === total)

  // Projeto feito em parceria com a VM Rocks? (alguma etapa é responsabilidade
  // da VM). Nesse caso a página é co-assinada KA + VM: sem o logo da KA no topo
  // e com um rodapé conjunto.
  const comVM = proj.fases.some((f) => (f.responsavel ?? 'KA') === 'VM')

  // Anel de progresso (SVG)
  const R = 46
  const CIRC = 2 * Math.PI * R

  return (
    <div className="proj-pub">
      <header className="proj-hero">
        {!comVM && (
          <img className="proj-hero__logo" src={LOGO_BRANCA} alt="KA · Inteligência para Marcas" />
        )}
        <div className="proj-hero__eyebrow">Acompanhamento de projeto</div>
        <h1>{proj.nome}</h1>
        <div className="proj-hero__meta">
          {proj.cliente_nome && <>para {proj.cliente_nome} · </>}
          atualizado em {formatarData(proj.atualizado_em)}
        </div>
        {!concluido && <div className="proj-vivo">Atualiza ao vivo</div>}
      </header>

      <div className="proj-anel-wrap">
        <svg className="proj-anel" viewBox="0 0 110 110" role="img" aria-label={`${pct}% concluído`}>
          <defs>
            <linearGradient id="proj-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#b89b6a" />
              <stop offset="100%" stopColor="#3d6b7e" />
            </linearGradient>
          </defs>
          <circle className="proj-anel__fundo" cx="55" cy="55" r={R} />
          <circle
            className="proj-anel__valor"
            cx="55"
            cy="55"
            r={R}
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - pct / 100)}
          />
          <text x="55" y="55">{pct}%</text>
        </svg>
      </div>

      <div className="proj-stats">
        <div className="proj-stat">
          <div className="proj-stat__rotulo">Etapas</div>
          <div className="proj-stat__valor">
            {feitas} de {total}
          </div>
        </div>
        <div className="proj-stat">
          <div className="proj-stat__rotulo">{concluido ? 'Situação' : 'Fase atual'}</div>
          <div className="proj-stat__valor">
            {concluido ? 'Concluído ✓' : (atual?.nome ?? 'A definir')}
          </div>
        </div>
        <div className="proj-stat">
          <div className="proj-stat__rotulo">Última atualização</div>
          <div className="proj-stat__valor">{formatarData(proj.atualizado_em)}</div>
        </div>
      </div>

      {concluido && (
        <div className="proj-fim">
          <div className="proj-fim__titulo">✨ Projeto concluído!</div>
          <p>Todas as etapas foram finalizadas. Obrigada pela confiança!</p>
        </div>
      )}

      <div className="proj-card">
        {proj.descricao && <p className="proj-desc">{proj.descricao}</p>}
        <div className="proj-card__titulo">Linha do tempo</div>

        <div className="proj-lt">
          {proj.fases.map((f, i) => (
            <div key={i} className={`proj-fase proj-fase--${f.status}`}>
              <div className="proj-fase__ponto">
                {f.status === 'concluida' ? '✓' : String(i + 1).padStart(2, '0')}
              </div>
              <div className="proj-fase__corpo">
                <div className="proj-fase__nome">{f.nome}</div>
                {f.descricao && <div className="proj-fase__desc">{f.descricao}</div>}
                <div className={`proj-fase__resp resp--${respClasse(f.responsavel)}`}>
                  {rotuloResp(f.responsavel)}
                </div>
                <div className="proj-fase__meta">
                  {f.status === 'concluida' &&
                    `Concluída${f.concluida_em ? ` · ${formatarData(f.concluida_em)}` : ''}`}
                  {f.status === 'andamento' && '● Em andamento agora'}
                  {f.status === 'pendente' && 'A seguir'}
                  {f.status !== 'concluida' && f.data && ` · previsto ${formatarData(f.data)}`}
                </div>
              </div>
            </div>
          ))}
          {proj.fases.length === 0 && (
            <p style={{ color: 'var(--t-500)', fontSize: '0.85rem' }}>
              As fases deste projeto ainda serão definidas.
            </p>
          )}
        </div>
      </div>

      <footer className="proj-rodape">
        {comVM ? (
          <div className="proj-rodape__parceria">KA | Inteligência para Marcas | VM Rocks</div>
        ) : (
          <>
            <div className="proj-rodape__nome">Kelly Albert</div>
            <div className="proj-rodape__sub">Sistema Visual de Publicações da Marca · KA</div>
          </>
        )}
      </footer>
    </div>
  )
}

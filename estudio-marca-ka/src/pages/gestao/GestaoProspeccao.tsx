import { useEffect, useMemo, useState } from 'react'
import { Busca, normalizar } from '../../components/Busca'
import { useToast } from '../../components/Toast'
import { useFichaUrl } from '../../hooks/useFichaUrl'
import { useArquivoXlsx } from '../../hooks/useArquivoXlsx'
import { confirmar } from '../../lib/confirmar'
import { formatarBRL, formatarData, listarOrcamentos } from '../../lib/gestao'
import { listarClientes } from '../../lib/api'
import { abrirWhatsApp } from '../../lib/whatsapp'
import {
  ORIGENS,
  PERFIL_PADRAO,
  STATUS_PROSPECT,
  anosDeEmpresa,
  assuntoEmail,
  atualizarProspect,
  buscarNoGoogle,
  carregarPerfil,
  chaveEmpresa,
  consultarCnpj,
  corpoEmail,
  criarProspect,
  excluirProspect,
  explicarNota,
  faixaNota,
  linkCnpj,
  linkInstagram,
  linkLinkedin,
  listarProspects,
  mensagemAbordagem,
  notaProspect,
  rotuloStatusProspect,
  salvarPerfil,
  type DadosReceita,
  type OrigemProspect,
  type PerfilIdeal,
  type Prospect,
  type ResultadoGoogle,
  type StatusProspect,
} from '../../lib/prospeccao'

// ============================================================================
// Aba PROSPECÇÃO — empresas médias que a KA quer conquistar (projetos de
// posicionamento de R$ 12 a 40 mil). Três visões:
//  - Funil: a lista com nota de encaixe, status e abordagem pronta;
//  - Buscar empresas: Google Maps por segmento + cidade, CNPJ e lista colada;
//  - Seu cliente ideal: o perfil (ticket, segmentos, regiões) calibrado pelos
//    clientes que já compraram — com o tamanho real deles pelo CNPJ.
// O Radar diário (SistemaKA) também grava aqui: notícias de momento de virada
// e vagas de marketing.
// ============================================================================

type Visao = 'funil' | 'buscar' | 'perfil'
type FiltroStatus = 'ativos' | 'todos' | StatusProspect

const CLASSE_STATUS: Record<StatusProspect, string> = {
  novo: 'badge--azul',
  qualificado: 'badge--azul',
  contatado: 'badge--dourado',
  conversa: 'badge--dourado',
  proposta: 'badge--dourado',
  cliente: 'badge--verde',
  descartado: 'badge--cinza',
}

const statusDe = (p: Prospect): StatusProspect => (p.status as StatusProspect) || 'novo'
const soDigitos = (s: string) => s.replace(/\D/g, '')

function formatarCnpj(c?: string | null): string {
  const d = soDigitos(c ?? '')
  return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : c ?? ''
}

async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    return false
  }
}

export function GestaoProspeccao() {
  const { mostrar } = useToast()
  const { idAberto, abrir, fechar } = useFichaUrl('id')
  const [visao, setVisao] = useState<Visao>('funil')
  const [lista, setLista] = useState<Prospect[]>([])
  const [icp, setIcp] = useState<PerfilIdeal>(PERFIL_PADRAO)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<FiltroStatus>('ativos')
  const [origem, setOrigem] = useState<'' | OrigemProspect>('')
  const [novo, setNovo] = useState(false)

  async function recarregar() {
    try {
      setCarregando(true)
      const [ps, perfil] = await Promise.all([listarProspects(), carregarPerfil()])
      setLista(ps)
      setIcp(perfil)
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

  const comNota = useMemo(
    () => lista.map((p) => ({ p, n: notaProspect(p, icp) })).sort((a, b) => b.n - a.n),
    [lista, icp],
  )
  const chaves = useMemo(() => new Set(lista.map((p) => chaveEmpresa(p))), [lista])

  const ativos = (s: StatusProspect) => s !== 'descartado' && s !== 'cliente'
  const filtrada = comNota.filter(({ p }) => {
    const s = statusDe(p)
    if (filtro === 'ativos' && !ativos(s)) return false
    if (filtro !== 'ativos' && filtro !== 'todos' && s !== filtro) return false
    if (origem && p.origem !== origem) return false
    const q = normalizar(busca).trim()
    if (!q) return true
    return normalizar(
      `${p.empresa} ${p.segmento ?? ''} ${p.cidade ?? ''} ${p.uf ?? ''} ${p.sinal ?? ''} ${p.receita?.cnae ?? ''}`,
    ).includes(q)
  })

  const contagem = (s: FiltroStatus) =>
    s === 'todos'
      ? lista.length
      : s === 'ativos'
        ? lista.filter((p) => ativos(statusDe(p))).length
        : lista.filter((p) => statusDe(p) === s).length

  const { url: urlXlsx } = useArquivoXlsx(
    [
      'Nota', 'Empresa', 'Segmento', 'Cidade', 'UF', 'Origem', 'Sinal', 'Link do sinal', 'Status',
      'CNPJ', 'Porte', 'Capital social', 'Abertura', 'Simples', 'Site', 'Telefone', 'E-mail',
      'Avaliações Google', 'Quem decide', 'Anotação',
    ],
    filtrada.map(({ p, n }) => [
      n, p.empresa, p.segmento ?? '', p.cidade ?? '', p.uf ?? '', ORIGENS[p.origem] ?? p.origem,
      p.sinal ?? '', p.sinal_url ?? '', rotuloStatusProspect(statusDe(p)), formatarCnpj(p.cnpj),
      p.receita?.porte ?? '', p.receita?.capital_social ?? null, p.receita?.abertura ?? '',
      p.receita ? (p.receita.simples ? 'Sim' : p.receita.simples === false ? 'Não' : '') : '',
      p.site ?? '', p.telefone ?? '', p.email ?? '', p.google?.avaliacoes ?? null, p.decisor ?? '',
      p.nota ?? '',
    ]),
    'Prospecção',
  )

  async function salvar(p: Prospect, dados: Partial<Prospect>, aviso?: string) {
    setLista((ls) => ls.map((x) => (x.id === p.id ? { ...x, ...dados } : x)))
    try {
      await atualizarProspect(p.id, dados)
      if (aviso) mostrar(aviso, 'ok')
    } catch (e) {
      mostrar(e instanceof Error ? e.message : String(e), 'erro')
      void recarregar()
    }
  }

  async function excluir(p: Prospect) {
    if (!(await confirmar(`Mover ${p.empresa} para a lixeira?`, { perigo: true, confirmar: 'Excluir' }))) return
    setLista((ls) => ls.filter((x) => x.id !== p.id))
    try {
      await excluirProspect(p.id)
      mostrar('Movida para a lixeira.', 'ok')
      if (idAberto === p.id) fechar()
    } catch (e) {
      mostrar(e instanceof Error ? e.message : String(e), 'erro')
      void recarregar()
    }
  }

  async function adicionar(dados: Omit<Prospect, 'id' | 'criado_em'>): Promise<boolean> {
    if (chaves.has(chaveEmpresa(dados))) {
      mostrar(`${dados.empresa} já está na sua lista.`, 'info')
      return false
    }
    try {
      const id = await criarProspect(dados)
      setLista((ls) => [{ ...dados, id, criado_em: new Date().toISOString(), status: 'novo' }, ...ls])
      mostrar(`${dados.empresa} entrou na prospecção.`, 'ok')
      return true
    } catch (e) {
      mostrar(e instanceof Error ? e.message : String(e), 'erro')
      return false
    }
  }

  function abordar(p: Prospect) {
    abrirWhatsApp(p.telefone, mensagemAbordagem(p), p.empresa)
    if (['novo', 'qualificado'].includes(statusDe(p))) void salvar(p, { status: 'contatado' })
  }

  const sel = idAberto ? (lista.find((p) => p.id === idAberto) ?? null) : null
  if (sel) {
    return (
      <FichaProspect
        key={sel.id}
        p={sel}
        icp={icp}
        aoVoltar={fechar}
        aoSalvar={(d, aviso) => salvar(sel, d, aviso)}
        aoAbordar={() => abordar(sel)}
        aoExcluir={() => void excluir(sel)}
      />
    )
  }

  const quentes = comNota.filter(({ p, n }) => n >= 70 && ativos(statusDe(p))).length
  const andamento = lista.filter((p) => ['contatado', 'conversa', 'proposta'].includes(statusDe(p))).length
  const viraram = lista.filter((p) => statusDe(p) === 'cliente').length

  return (
    <>
      <div className="seg" style={{ marginBottom: '1rem' }}>
        <button className={visao === 'funil' ? 'seg__on' : ''} onClick={() => setVisao('funil')}>
          Funil
        </button>
        <button className={visao === 'buscar' ? 'seg__on' : ''} onClick={() => setVisao('buscar')}>
          Buscar empresas
        </button>
        <button className={visao === 'perfil' ? 'seg__on' : ''} onClick={() => setVisao('perfil')}>
          Seu cliente ideal
        </button>
      </div>

      {erro && <div className="erro-msg">{erro}</div>}
      {carregando && <p style={{ color: 'var(--t-500)', fontSize: '0.85rem' }}>Carregando…</p>}

      {visao === 'buscar' && <BuscarEmpresas icp={icp} chaves={chaves} aoAdicionar={adicionar} />}
      {visao === 'perfil' && (
        <PerfilIdealView
          icp={icp}
          aoSalvar={async (p) => {
            await salvarPerfil(p)
            setIcp(p)
            mostrar('Perfil ideal salvo. As notas foram recalculadas.', 'ok')
          }}
        />
      )}

      {visao === 'funil' && !carregando && (
        <>
          <div className="gestao-acoes">
            <button className="btn" onClick={() => setNovo((v) => !v)}>
              {novo ? 'Fechar' : '+ Adicionar empresa'}
            </button>
            <button className="btn--ghost" onClick={() => void recarregar()}>
              ↻ Atualizar
            </button>
            {filtrada.length > 0 &&
              (urlXlsx ? (
                <a className="btn--voltar" href={urlXlsx} download={`prospeccao-${new Date().toISOString().slice(0, 10)}.xlsx`}>
                  ⤓ Baixar em Excel
                </a>
              ) : (
                <span className="btn--voltar btn--esperando">Preparando planilha…</span>
              ))}
            <span className="espaco" />
          </div>

          {novo && (
            <NovoProspect
              aoSalvar={async (d) => {
                if (await adicionar(d)) setNovo(false)
              }}
            />
          )}

          {lista.length === 0 && !erro && (
            <div className="card">
              <h3>Sua lista de prospecção começa aqui.</h3>
              <p>
                Três jeitos de encher o funil: o <strong>Radar diário</strong> grava sozinho as empresas em
                momento de virada (notícias e vagas de marketing); em <strong>Buscar empresas</strong> você
                procura no Google Maps por segmento e cidade; e em <strong>+ Adicionar empresa</strong> você
                cadastra uma indicação ou alguém que conheceu.
              </p>
            </div>
          )}

          {lista.length > 0 && (
            <div className="fin-cards">
              <div className="fin-card">
                <div className="fin-card__quem">Empresas no funil</div>
                <div className="fin-card__valor">{contagem('ativos')}</div>
                <div className="fin-card__mensal">{contagem('novo')} novas para olhar</div>
              </div>
              <div className="fin-card">
                <div className="fin-card__quem">Quentes (nota 70+)</div>
                <div className="fin-card__valor">{quentes}</div>
                <div className="fin-card__mensal">com cara do seu cliente ideal</div>
              </div>
              <div className="fin-card">
                <div className="fin-card__quem">Em andamento</div>
                <div className="fin-card__valor">{andamento}</div>
                <div className="fin-card__mensal">contatadas, em conversa ou com proposta</div>
              </div>
              <div className="fin-card">
                <div className="fin-card__quem">Viraram cliente</div>
                <div className="fin-card__valor">{viraram}</div>
                <div className="fin-card__mensal">
                  {lista.length ? Math.round((viraram / lista.length) * 100) : 0}% do total
                </div>
              </div>
            </div>
          )}

          {lista.length > 0 && (
            <>
              <div className="chips" style={{ marginBottom: '0.6rem' }}>
                {(['ativos', ...STATUS_PROSPECT.map((s) => s.valor), 'todos'] as FiltroStatus[]).map((s) => (
                  <button key={s} className={`chip ${filtro === s ? 'chip--on' : ''}`} onClick={() => setFiltro(s)}>
                    {s === 'ativos' ? 'No funil' : s === 'todos' ? 'Todas' : rotuloStatusProspect(s)}{' '}
                    <span className="chip__n">{contagem(s)}</span>
                  </button>
                ))}
              </div>
              <div className="lead-filtros">
                <Busca valor={busca} aoMudar={setBusca} placeholder="Buscar por empresa, segmento, cidade…" />
                <select
                  className="lead-filtros__perfil"
                  value={origem}
                  onChange={(e) => setOrigem(e.target.value as '' | OrigemProspect)}
                  aria-label="Filtrar por origem"
                >
                  <option value="">Todas as origens</option>
                  {(Object.keys(ORIGENS) as OrigemProspect[]).map((o) => (
                    <option key={o} value={o}>
                      {ORIGENS[o]}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          {lista.length > 0 && filtrada.length === 0 && (
            <p className="ativ-vazio">Nenhuma empresa encontrada com esse filtro.</p>
          )}

          {filtrada.length > 0 && (
            <div className="tabela-wrap">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Nota</th>
                    <th>Por que agora</th>
                    <th>Status</th>
                    <th className="acoes"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtrada.map(({ p, n }) => {
                    const f = faixaNota(n)
                    return (
                      <tr key={p.id}>
                        <td className="cel-nome" data-label="Empresa">
                          <button className="cel-abrir" onClick={() => abrir(p.id)}>
                            {p.empresa}
                          </button>
                          <div className="lead-sub">
                            {[p.segmento, [p.cidade, p.uf].filter(Boolean).join('/')].filter(Boolean).join(' · ') ||
                              'Sem segmento/cidade'}
                          </div>
                          <span className="lead-badge">{ORIGENS[p.origem] ?? p.origem}</span>
                        </td>
                        <td data-label="Nota">
                          <span className={`badge ${f.classe}`}>
                            {n} · {f.rotulo}
                          </span>
                          {!p.receita && <div className="lead-sub">CNPJ não consultado</div>}
                        </td>
                        <td data-label="Por que agora">
                          <div className="prosp-sinal">{p.por_que_agora || p.sinal || '—'}</div>
                          {p.sinal_data && <div className="lead-sub">{formatarData(p.sinal_data)}</div>}
                        </td>
                        <td data-label="Status">
                          <select
                            className={`lead-status ${CLASSE_STATUS[statusDe(p)]}`}
                            value={statusDe(p)}
                            onChange={(e) =>
                              void salvar(p, { status: e.target.value as StatusProspect }, `${p.empresa}: ${rotuloStatusProspect(e.target.value)}.`)
                            }
                            aria-label={`Status de ${p.empresa}`}
                          >
                            {STATUS_PROSPECT.map((s) => (
                              <option key={s.valor} value={s.valor}>
                                {s.rotulo}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="acoes" data-label="">
                          <button className="btn-mini btn-mini--whats" onClick={() => abordar(p)}>
                            Abordar
                          </button>
                          <button className="btn-mini" onClick={() => abrir(p.id)}>
                            Ver
                          </button>
                          <button className="btn-mini btn-mini--perigo" onClick={() => void excluir(p)}>
                            Excluir
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  )
}

// ---- Cadastro manual (com preenchimento pelo CNPJ) ---------------------------

function NovoProspect({ aoSalvar }: { aoSalvar: (d: Omit<Prospect, 'id' | 'criado_em'>) => Promise<void> }) {
  const { mostrar } = useToast()
  const [f, setF] = useState({ empresa: '', cnpj: '', segmento: '', cidade: '', uf: '', site: '', telefone: '', instagram: '', sinal: '' })
  const [origem, setOrigem] = useState<OrigemProspect>('manual')
  const [receita, setReceita] = useState<DadosReceita | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })

  async function puxarCnpj() {
    setBuscando(true)
    try {
      const r = await consultarCnpj(f.cnpj)
      setReceita(r)
      setF((x) => ({
        ...x,
        empresa: x.empresa || r.nome_fantasia || r.razao_social,
        cidade: x.cidade || r.cidade,
        uf: x.uf || r.uf,
        telefone: x.telefone || r.telefone || '',
      }))
      mostrar(`${r.razao_social}: ${r.porte || 'porte não informado'}.`, 'ok')
    } catch (e) {
      mostrar(e instanceof Error ? e.message : String(e), 'erro')
    } finally {
      setBuscando(false)
    }
  }

  async function salvar() {
    if (!f.empresa.trim()) {
      mostrar('Diga o nome da empresa.', 'erro')
      return
    }
    setSalvando(true)
    await aoSalvar({
      empresa: f.empresa.trim(),
      cnpj: soDigitos(f.cnpj) || null,
      segmento: f.segmento || null,
      cidade: f.cidade || null,
      uf: f.uf.toUpperCase() || null,
      site: f.site || null,
      telefone: f.telefone || null,
      instagram: f.instagram || null,
      sinal: f.sinal || null,
      email: receita?.email || null,
      receita,
      origem,
    })
    setSalvando(false)
  }

  return (
    <div className="card">
      <h3>Nova empresa</h3>
      <div className="prosp-form">
        <div className="field">
          <label>CNPJ (opcional, mas recomendado)</label>
          <div className="prosp-linha">
            <input value={f.cnpj} onChange={set('cnpj')} placeholder="00.000.000/0000-00" inputMode="numeric" />
            <button className="btn--ghost" disabled={buscando || soDigitos(f.cnpj).length !== 14} onClick={() => void puxarCnpj()}>
              {buscando ? 'Consultando…' : 'Puxar dados'}
            </button>
          </div>
        </div>
        <div className="field">
          <label>Empresa</label>
          <input value={f.empresa} onChange={set('empresa')} placeholder="Nome da marca" />
        </div>
        <div className="field">
          <label>Segmento</label>
          <input value={f.segmento} onChange={set('segmento')} placeholder="Ex.: clínica odontológica" />
        </div>
        <div className="field">
          <label>Cidade / UF</label>
          <div className="prosp-linha">
            <input value={f.cidade} onChange={set('cidade')} placeholder="Cidade" />
            <input value={f.uf} onChange={set('uf')} placeholder="UF" maxLength={2} style={{ maxWidth: '4.5rem' }} />
          </div>
        </div>
        <div className="field">
          <label>Site</label>
          <input value={f.site} onChange={set('site')} placeholder="https://" />
        </div>
        <div className="field">
          <label>WhatsApp / telefone</label>
          <input value={f.telefone} onChange={set('telefone')} placeholder="(51) 9…" />
        </div>
        <div className="field">
          <label>Instagram</label>
          <input value={f.instagram} onChange={set('instagram')} placeholder="@marca" />
        </div>
        <div className="field">
          <label>De onde veio</label>
          <select value={origem} onChange={(e) => setOrigem(e.target.value as OrigemProspect)}>
            {(['manual', 'indicacao', 'evento'] as OrigemProspect[]).map((o) => (
              <option key={o} value={o}>
                {ORIGENS[o]}
              </option>
            ))}
          </select>
        </div>
        <div className="field prosp-form__largo">
          <label>Por que agora? (o que você sabe dessa empresa)</label>
          <input value={f.sinal} onChange={set('sinal')} placeholder="Ex.: abriu a 3ª unidade; indicação da Fulana; conheci na ACIGRA" />
        </div>
      </div>
      {receita && <ResumoReceita r={receita} />}
      <button className="btn" style={{ marginTop: '0.8rem' }} disabled={salvando} onClick={() => void salvar()}>
        {salvando ? 'Salvando…' : 'Adicionar ao funil'}
      </button>
    </div>
  )
}

function ResumoReceita({ r }: { r: DadosReceita }) {
  const anos = anosDeEmpresa(r.abertura)
  return (
    <div className="prosp-receita">
      <div>
        <span className="lead-rot">Razão social</span> {r.razao_social}
      </div>
      <div>
        <span className="lead-rot">Porte</span> {r.mei ? 'MEI' : r.porte || '-'}
      </div>
      <div>
        <span className="lead-rot">Simples Nacional</span>{' '}
        {r.simples === true ? 'Sim (fatura até R$ 4,8 mi/ano)' : r.simples === false ? 'Não (provável faturamento maior)' : '-'}
      </div>
      <div>
        <span className="lead-rot">Capital social</span> {formatarBRL(r.capital_social)}
      </div>
      <div>
        <span className="lead-rot">Abertura</span> {formatarData(r.abertura)}
        {anos != null ? ` (${anos} anos)` : ''}
      </div>
      <div>
        <span className="lead-rot">Atividade</span> {r.cnae || '-'}
      </div>
      <div>
        <span className="lead-rot">Situação</span> {r.situacao || '-'} · {[r.cidade, r.uf].filter(Boolean).join('/')}
      </div>
      {r.socios.length > 0 && (
        <div>
          <span className="lead-rot">Sócios</span> {r.socios.map((s) => `${s.nome}${s.qualificacao ? ` (${s.qualificacao})` : ''}`).join('; ')}
        </div>
      )}
    </div>
  )
}

// ---- Buscar empresas (Google Maps + lista colada) ----------------------------

function BuscarEmpresas({
  icp,
  chaves,
  aoAdicionar,
}: {
  icp: PerfilIdeal
  chaves: Set<string>
  aoAdicionar: (d: Omit<Prospect, 'id' | 'criado_em'>) => Promise<boolean>
}) {
  const { mostrar } = useToast()
  const [termo, setTermo] = useState('')
  const [cidade, setCidade] = useState(icp.regioes.find((r) => r.length > 2) ?? '')
  const [res, setRes] = useState<ResultadoGoogle[]>([])
  const [proxima, setProxima] = useState<string | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [colado, setColado] = useState('')
  const [minAval, setMinAval] = useState(20)

  async function buscar(pagina?: string | null) {
    if (!termo.trim()) return
    setBuscando(true)
    setErro(null)
    try {
      const r = await buscarNoGoogle(termo, cidade, pagina)
      setRes((x) => (pagina ? [...x, ...r.empresas] : r.empresas))
      setProxima(r.proxima)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setBuscando(false)
    }
  }

  const visiveis = res
    .filter((e) => (e.avaliacoes ?? 0) >= minAval)
    .sort((a, b) => (b.avaliacoes ?? 0) - (a.avaliacoes ?? 0))

  async function importarColado() {
    const linhas = colado.split('\n').map((l) => l.trim()).filter(Boolean)
    let n = 0
    for (const l of linhas) {
      const [empresa, cid, cnpj, site, telefone, segmento] = l.split(/[;\t]/).map((x) => (x ?? '').trim())
      if (!empresa) continue
      const [c, uf] = (cid || '').split('/').map((x) => x.trim())
      const ok = await aoAdicionar({
        empresa,
        cidade: c || null,
        uf: uf?.toUpperCase() || null,
        cnpj: soDigitos(cnpj || '') || null,
        site: site || null,
        telefone: telefone || null,
        segmento: segmento || null,
        origem: 'evento',
      })
      if (ok) n++
    }
    mostrar(`${n} empresa(s) importada(s).`, 'ok')
    if (n) setColado('')
  }

  const sugestoes = icp.segmentos.slice(0, 8)

  return (
    <>
      <div className="card">
        <h3>Google Maps — por segmento e cidade</h3>
        <p className="lead-sub" style={{ marginBottom: '0.6rem' }}>
          Funciona muito bem para clínicas, consultórios, lojas, indústrias e serviços com endereço. O nº de
          avaliações mostra o movimento: empresa com muitas avaliações costuma ter porte para um projeto.
        </p>
        <div className="prosp-linha">
          <input value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="O quê? Ex.: clínica odontológica" onKeyDown={(e) => e.key === 'Enter' && void buscar()} />
          <input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Onde? Ex.: Porto Alegre" onKeyDown={(e) => e.key === 'Enter' && void buscar()} />
          <button className="btn" disabled={buscando || !termo.trim()} onClick={() => void buscar()}>
            {buscando ? 'Buscando…' : 'Buscar'}
          </button>
        </div>
        <div className="chips" style={{ marginTop: '0.6rem' }}>
          {sugestoes.map((s) => (
            <button key={s} className="chip" onClick={() => setTermo(s)}>
              {s}
            </button>
          ))}
        </div>
        {erro && <div className="erro-msg" style={{ marginTop: '0.6rem' }}>{erro}</div>}
      </div>

      {res.length > 0 && (
        <div className="card">
          <div className="gestao-acoes">
            <strong>{visiveis.length} empresas</strong>
            <span className="espaco" />
            <label className="lead-sub">
              Mínimo de avaliações{' '}
              <select value={minAval} onChange={(e) => setMinAval(Number(e.target.value))}>
                {[0, 20, 50, 100, 300].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="tabela-wrap">
            <table className="tabela">
              <tbody>
                {visiveis.map((e) => {
                  const dados: Omit<Prospect, 'id' | 'criado_em'> = {
                    empresa: e.empresa,
                    cidade: e.cidade || cidade || null,
                    uf: e.uf || null,
                    site: e.site || null,
                    telefone: e.telefone || null,
                    segmento: e.categoria || termo,
                    origem: 'google',
                    sinal: `${e.avaliacoes} avaliações no Google${e.rating ? ` · nota ${e.rating}` : ''}`,
                    sinal_url: e.maps_url || null,
                    google: {
                      place_id: e.place_id, rating: e.rating, avaliacoes: e.avaliacoes,
                      maps_url: e.maps_url, categoria: e.categoria, endereco: e.endereco,
                    },
                  }
                  const ja = chaves.has(chaveEmpresa(dados))
                  return (
                    <tr key={e.place_id}>
                      <td className="cel-nome" data-label="Empresa">
                        <strong>{e.empresa}</strong>
                        <div className="lead-sub">{e.endereco}</div>
                        {e.site && (
                          <a className="lead-sub" href={e.site} target="_blank" rel="noopener noreferrer">
                            {e.site.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                          </a>
                        )}
                      </td>
                      <td data-label="Google">
                        ⭐ {e.rating ?? '-'} · <strong>{e.avaliacoes}</strong> avaliações
                        <div className="lead-sub">{e.categoria}</div>
                      </td>
                      <td className="acoes" data-label="">
                        {ja ? (
                          <span className="badge badge--cinza">Já na lista</span>
                        ) : (
                          <button className="btn-mini" onClick={() => void aoAdicionar(dados)}>
                            + Prospectar
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {proxima && (
            <button className="btn--ghost" style={{ marginTop: '0.6rem' }} disabled={buscando} onClick={() => void buscar(proxima)}>
              Carregar mais
            </button>
          )}
        </div>
      )}

      <div className="card">
        <h3>Colar uma lista (evento, associação, feira, ranking)</h3>
        <p className="lead-sub" style={{ marginBottom: '0.6rem' }}>
          Uma empresa por linha, separando por ponto e vírgula:{' '}
          <code>Empresa; Cidade/UF; CNPJ; Site; Telefone; Segmento</code>. Só o nome é obrigatório. Serve para
          a lista de associados da ACIGRA, expositores de feira, rankings de crescimento etc.
        </p>
        <textarea rows={5} value={colado} onChange={(e) => setColado(e.target.value)} placeholder={'Clínica Exemplo; Gravataí/RS; ; https://exemplo.com.br; (51) 99999-0000; odontologia'} />
        <button className="btn" style={{ marginTop: '0.5rem' }} disabled={!colado.trim()} onClick={() => void importarColado()}>
          Importar lista
        </button>
      </div>
    </>
  )
}

// ---- Seu cliente ideal (calibrado pelos clientes que já compraram) -----------

interface LinhaCliente {
  id: string
  nome: string
  segmento: string
  cidade: string
  documento: string
  valor: number
  receita?: DadosReceita | null
  erro?: string
}

function PerfilIdealView({ icp, aoSalvar }: { icp: PerfilIdeal; aoSalvar: (p: PerfilIdeal) => Promise<void> }) {
  const { mostrar } = useToast()
  const [f, setF] = useState({
    ticket_min: String(icp.ticket_min),
    ticket_max: String(icp.ticket_max),
    segmentos: icp.segmentos.join(', '),
    regioes: icp.regioes.join(', '),
    capital_minimo: String(icp.capital_minimo),
    idade_minima: String(icp.idade_minima),
  })
  const [clientes, setClientes] = useState<LinhaCliente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [medindo, setMedindo] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const [cs, os] = await Promise.all([listarClientes(), listarOrcamentos()])
        const valor = new Map<string, number>()
        for (const o of os) {
          if (o.status !== 'aprovado' || !o.cliente_id) continue
          valor.set(o.cliente_id, (valor.get(o.cliente_id) ?? 0) + (o.valor_total || 0))
        }
        setClientes(
          cs
            .map((c) => ({
              id: c.id,
              nome: c.nome_marca,
              segmento: c.segmento ?? '',
              cidade: c.cidade ?? '',
              documento: soDigitos(c.contrato_documento || c.documento || ''),
              valor: valor.get(c.id) ?? 0,
            }))
            .sort((a, b) => b.valor - a.valor),
        )
      } catch (e) {
        mostrar(e instanceof Error ? e.message : String(e), 'erro')
      } finally {
        setCarregando(false)
      }
    })()
  }, [mostrar])

  async function medir() {
    setMedindo(true)
    const out = [...clientes]
    for (let i = 0; i < out.length; i++) {
      if (out[i].documento.length !== 14 || out[i].receita) continue
      try {
        out[i] = { ...out[i], receita: await consultarCnpj(out[i].documento) }
      } catch (e) {
        out[i] = { ...out[i], erro: e instanceof Error ? e.message : String(e) }
      }
      setClientes([...out])
    }
    setMedindo(false)
  }

  const pagantes = clientes.filter((c) => c.valor > 0)
  const ticketMedio = pagantes.length ? pagantes.reduce((t, c) => t + c.valor, 0) / pagantes.length : 0
  const comCnpj = clientes.filter((c) => c.documento.length === 14).length
  const segs = Array.from(new Set(clientes.map((c) => c.segmento.trim()).filter(Boolean)))
  const cidades = Array.from(new Set(clientes.map((c) => c.cidade.trim()).filter(Boolean)))

  const lista = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean)
  async function salvar() {
    await aoSalvar({
      ticket_min: Number(soDigitos(f.ticket_min)) || PERFIL_PADRAO.ticket_min,
      ticket_max: Number(soDigitos(f.ticket_max)) || PERFIL_PADRAO.ticket_max,
      segmentos: lista(f.segmentos),
      regioes: lista(f.regioes),
      capital_minimo: Number(soDigitos(f.capital_minimo)) || 0,
      idade_minima: Number(soDigitos(f.idade_minima)) || 0,
    })
  }
  function usarClientes() {
    setF((x) => ({
      ...x,
      segmentos: Array.from(new Set([...lista(x.segmentos), ...segs.map((s) => s.toLowerCase())])).join(', '),
      regioes: Array.from(new Set([...lista(x.regioes), ...cidades])).join(', '),
    }))
  }

  return (
    <>
      <div className="card">
        <h3>Quem é o seu cliente ideal</h3>
        <p className="lead-sub" style={{ marginBottom: '0.8rem' }}>
          Empresas médias, que podem investir de {formatarBRL(icp.ticket_min)} a {formatarBRL(icp.ticket_max)} num
          projeto de posicionamento. Estes campos alimentam a nota de cada empresa do funil.
        </p>
        <div className="prosp-form">
          <div className="field">
            <label>Projeto a partir de (R$)</label>
            <input value={f.ticket_min} onChange={(e) => setF({ ...f, ticket_min: e.target.value })} inputMode="numeric" />
          </div>
          <div className="field">
            <label>Projeto até (R$)</label>
            <input value={f.ticket_max} onChange={(e) => setF({ ...f, ticket_max: e.target.value })} inputMode="numeric" />
          </div>
          <div className="field">
            <label>Capital social mínimo (R$)</label>
            <input value={f.capital_minimo} onChange={(e) => setF({ ...f, capital_minimo: e.target.value })} inputMode="numeric" />
          </div>
          <div className="field">
            <label>Anos mínimos de empresa</label>
            <input value={f.idade_minima} onChange={(e) => setF({ ...f, idade_minima: e.target.value })} inputMode="numeric" />
          </div>
          <div className="field prosp-form__largo">
            <label>Segmentos (separados por vírgula)</label>
            <textarea rows={2} value={f.segmentos} onChange={(e) => setF({ ...f, segmentos: e.target.value })} />
          </div>
          <div className="field prosp-form__largo">
            <label>Cidades / UFs com bônus</label>
            <textarea rows={2} value={f.regioes} onChange={(e) => setF({ ...f, regioes: e.target.value })} />
          </div>
        </div>
        <div className="gestao-acoes" style={{ marginTop: '0.6rem' }}>
          <button className="btn" onClick={() => void salvar()}>
            Salvar perfil
          </button>
          {(segs.length > 0 || cidades.length > 0) && (
            <button className="btn--ghost" onClick={usarClientes}>
              Somar segmentos e cidades dos meus clientes
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h3>O que os seus clientes dizem</h3>
        {carregando ? (
          <p className="lead-sub">Carregando clientes e orçamentos aprovados…</p>
        ) : (
          <>
            <div className="fin-cards">
              <div className="fin-card">
                <div className="fin-card__quem">Clientes</div>
                <div className="fin-card__valor">{clientes.length}</div>
                <div className="fin-card__mensal">{comCnpj} com CNPJ na ficha</div>
              </div>
              <div className="fin-card">
                <div className="fin-card__quem">Ticket médio aprovado</div>
                <div className="fin-card__valor">{ticketMedio ? formatarBRL(ticketMedio) : '-'}</div>
                <div className="fin-card__mensal">{pagantes.length} com orçamento aprovado</div>
              </div>
            </div>
            <p className="lead-sub" style={{ margin: '0.4rem 0 0.8rem' }}>
              Toque em <strong>Medir pelo CNPJ</strong> para ver o tamanho real de cada cliente (porte, Simples,
              capital social, anos de empresa). Faturamento não é público no Brasil; esses dados são o melhor
              retrato que existe e mostram o tamanho de empresa que já paga o seu projeto.
            </p>
            {comCnpj > 0 && (
              <button className="btn--ghost" disabled={medindo} onClick={() => void medir()}>
                {medindo ? 'Consultando a Receita…' : 'Medir pelo CNPJ'}
              </button>
            )}
            {clientes.length > 0 && (
              <div className="tabela-wrap" style={{ marginTop: '0.8rem' }}>
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Investiu</th>
                      <th>Porte / Simples</th>
                      <th>Capital · idade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientes.map((c) => (
                      <tr key={c.id}>
                        <td className="cel-nome" data-label="Cliente">
                          <strong>{c.nome}</strong>
                          <div className="lead-sub">{[c.segmento, c.cidade].filter(Boolean).join(' · ') || '-'}</div>
                        </td>
                        <td data-label="Investiu">{c.valor ? formatarBRL(c.valor) : '-'}</td>
                        <td data-label="Porte / Simples">
                          {c.receita ? (
                            <>
                              {c.receita.mei ? 'MEI' : c.receita.porte || '-'}
                              <div className="lead-sub">
                                {c.receita.simples === true ? 'No Simples' : c.receita.simples === false ? 'Fora do Simples' : ''}
                              </div>
                            </>
                          ) : c.erro ? (
                            <span className="lead-sub">{c.erro}</span>
                          ) : c.documento.length === 14 ? (
                            <span className="lead-sub">{formatarCnpj(c.documento)}</span>
                          ) : (
                            <span className="lead-sub">Sem CNPJ na ficha</span>
                          )}
                        </td>
                        <td data-label="Capital · idade">
                          {c.receita ? (
                            <>
                              {formatarBRL(c.receita.capital_social)}
                              <div className="lead-sub">
                                {anosDeEmpresa(c.receita.abertura) ?? '-'} anos · {c.receita.cnae.split(' · ')[1] ?? ''}
                              </div>
                            </>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

// ---- Ficha ------------------------------------------------------------------

function FichaProspect({
  p,
  icp,
  aoVoltar,
  aoSalvar,
  aoAbordar,
  aoExcluir,
}: {
  p: Prospect
  icp: PerfilIdeal
  aoVoltar: () => void
  aoSalvar: (d: Partial<Prospect>, aviso?: string) => Promise<void>
  aoAbordar: () => void
  aoExcluir: () => void
}) {
  const { mostrar } = useToast()
  const [nota, setNota] = useState(p.nota ?? '')
  const [cnpj, setCnpj] = useState(p.cnpj ?? '')
  const [telefone, setTelefone] = useState(p.telefone ?? '')
  const [consultando, setConsultando] = useState(false)
  const n = notaProspect(p, icp)
  const f = faixaNota(n)
  const itens = explicarNota(p, icp)

  async function puxar() {
    setConsultando(true)
    try {
      const r = await consultarCnpj(cnpj)
      await aoSalvar(
        {
          cnpj: r.cnpj,
          receita: r,
          cidade: p.cidade || r.cidade,
          uf: p.uf || r.uf,
          telefone: p.telefone || r.telefone || null,
          email: p.email || r.email || null,
          status: statusDe(p) === 'novo' ? 'qualificado' : statusDe(p),
        },
        'Dados da Receita salvos.',
      )
    } catch (e) {
      mostrar(e instanceof Error ? e.message : String(e), 'erro')
    } finally {
      setConsultando(false)
    }
  }

  async function copiarTexto(t: string) {
    const ok = await copiar(t)
    mostrar(ok ? 'Copiado.' : 'Não consegui copiar; selecione o texto.', ok ? 'ok' : 'erro')
  }

  const msg = mensagemAbordagem(p)
  const assunto = assuntoEmail(p)
  const corpo = corpoEmail(p)

  return (
    <>
      <p style={{ marginBottom: '1rem' }}>
        <button className="btn--voltar" onClick={aoVoltar}>
          ← Todas as empresas
        </button>
      </p>

      <div className="card">
        <div className="lead-ficha__topo">
          <div>
            <h3 style={{ margin: 0 }}>{p.empresa}</h3>
            <p className="lead-sub">
              {[p.segmento, [p.cidade, p.uf].filter(Boolean).join('/')].filter(Boolean).join(' · ')}
              {' · '}
              {ORIGENS[p.origem] ?? p.origem} · desde {formatarData(p.criado_em)}
            </p>
          </div>
          <select
            className={`lead-status ${CLASSE_STATUS[statusDe(p)]}`}
            value={statusDe(p)}
            onChange={(e) => void aoSalvar({ status: e.target.value as StatusProspect }, `Status: ${rotuloStatusProspect(e.target.value)}.`)}
            aria-label="Status"
          >
            {STATUS_PROSPECT.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.rotulo}
              </option>
            ))}
          </select>
        </div>

        <div className="fin-cards" style={{ marginTop: '1rem' }}>
          <div className="fin-card">
            <div className="fin-card__quem">Nota de encaixe</div>
            <div className="fin-card__valor">{n}</div>
            <div className="fin-card__mensal">
              <span className={`badge ${f.classe}`}>{f.rotulo}</span>
            </div>
          </div>
          {p.receita && (
            <div className="fin-card">
              <div className="fin-card__quem">Porte</div>
              <div className="fin-card__valor lead-card__texto">{p.receita.mei ? 'MEI' : p.receita.porte || '-'}</div>
              <div className="fin-card__mensal">{formatarBRL(p.receita.capital_social)} de capital</div>
            </div>
          )}
          {p.google?.avaliacoes != null && p.google.avaliacoes > 0 && (
            <div className="fin-card">
              <div className="fin-card__quem">Google</div>
              <div className="fin-card__valor">⭐ {p.google.rating ?? '-'}</div>
              <div className="fin-card__mensal">{p.google.avaliacoes} avaliações</div>
            </div>
          )}
        </div>

        <details className="prosp-porque">
          <summary>Como essa nota foi calculada</summary>
          <ul>
            <li>Base: 30</li>
            {itens.map((i, k) => (
              <li key={k}>
                {i.pontos > 0 ? '+' : ''}
                {i.pontos} · {i.rotulo}
              </li>
            ))}
          </ul>
        </details>
      </div>

      {(p.sinal || p.por_que_agora) && (
        <div className="card">
          <h3>Por que agora</h3>
          {p.por_que_agora && <p>{p.por_que_agora}</p>}
          {p.sinal && (
            <p className="lead-sub">
              {p.sinal_url ? (
                <a href={p.sinal_url} target="_blank" rel="noopener noreferrer">
                  {p.sinal} ↗
                </a>
              ) : (
                p.sinal
              )}
              {p.sinal_data ? ` · ${formatarData(p.sinal_data)}` : ''}
            </p>
          )}
          {(p.decisor || p.pessoa_citada) && (
            <p>
              <span className="lead-rot">Quem decide</span> {p.decisor || 'Fundador(a) / CEO'}
              {p.pessoa_citada ? ` — citado: ${p.pessoa_citada}` : ''}
            </p>
          )}
        </div>
      )}

      <div className="card">
        <h3>Tamanho da empresa (Receita Federal)</h3>
        {p.receita ? (
          <ResumoReceita r={p.receita} />
        ) : (
          <p className="lead-sub">
            Ainda sem CNPJ. Ele costuma estar no rodapé do site da empresa ou{' '}
            <a href={linkCnpj(p)} target="_blank" rel="noopener noreferrer">
              numa busca rápida ↗
            </a>
            .
          </p>
        )}
        <div className="prosp-linha" style={{ marginTop: '0.6rem' }}>
          <input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="CNPJ" inputMode="numeric" />
          <button className="btn--ghost" disabled={consultando || soDigitos(cnpj).length !== 14} onClick={() => void puxar()}>
            {consultando ? 'Consultando…' : p.receita ? 'Atualizar' : 'Consultar CNPJ'}
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Abordagem</h3>
        <div className="lead-contato">
          <div>
            <span className="lead-rot">Site</span>{' '}
            {p.site ? (
              <a href={p.site} target="_blank" rel="noopener noreferrer">
                {p.site.replace(/^https?:\/\//, '')}
              </a>
            ) : (
              '-'
            )}
          </div>
          <div>
            <span className="lead-rot">E-mail</span> {p.email || '-'}
          </div>
          <div className="prosp-linha">
            <span className="lead-rot">WhatsApp</span>
            <input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(51) 9…" />
            {telefone !== (p.telefone ?? '') && (
              <button className="btn-mini" onClick={() => void aoSalvar({ telefone }, 'Telefone salvo.')}>
                Salvar
              </button>
            )}
          </div>
        </div>
        <p className="prosp-links">
          <a href={linkLinkedin(p)} target="_blank" rel="noopener noreferrer">
            Achar o decisor no LinkedIn ↗
          </a>
          <a href={linkInstagram(p)} target="_blank" rel="noopener noreferrer">
            Instagram ↗
          </a>
          {p.google?.maps_url && (
            <a href={p.google.maps_url} target="_blank" rel="noopener noreferrer">
              Google Maps ↗
            </a>
          )}
        </p>

        <div className="prosp-msg">
          <div className="lead-rot">1ª mensagem (WhatsApp / Direct / LinkedIn)</div>
          <pre>{msg}</pre>
          <div className="gestao-acoes">
            <button className="btn btn--whats-lead" style={{ background: '#25D366', color: '#0B2615' }} onClick={aoAbordar}>
              Abrir no WhatsApp
            </button>
            <button className="btn--ghost" onClick={() => void copiarTexto(msg)}>
              Copiar
            </button>
          </div>
        </div>
        <div className="prosp-msg">
          <div className="lead-rot">E-mail · {assunto}</div>
          <pre>{corpo}</pre>
          <div className="gestao-acoes">
            <a
              className="btn--ghost"
              href={`mailto:${p.email ?? ''}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`}
            >
              Abrir no e-mail
            </a>
            <button className="btn--ghost" onClick={() => void copiarTexto(corpo)}>
              Copiar
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="field">
          <label>Anotações</label>
          <textarea rows={3} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ex.: falei com a sócia em 12/11; retomar em dezembro." />
        </div>
        <div className="gestao-acoes" style={{ marginTop: '0.5rem' }}>
          <button className="btn" disabled={nota === (p.nota ?? '')} onClick={() => void aoSalvar({ nota: nota.trim() }, 'Anotação salva.')}>
            Salvar anotação
          </button>
          <span className="espaco" />
          <button className="btn--ghost" onClick={aoExcluir}>
            Excluir
          </button>
        </div>
      </div>
    </>
  )
}

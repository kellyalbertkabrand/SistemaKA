import { useEffect, useMemo, useState } from 'react'
import type { Cobranca } from '../../lib/database.types'
import { formatarBRL } from '../../lib/gestao'
import { hojeLocal } from '../../lib/ui'
import { confirmar } from '../../lib/confirmar'
import { useToast } from '../../components/Toast'
import {
  excluirMetricaSite,
  listarMetricasSite,
  salvarMetricaSite,
  type SiteMetrica,
} from '../../lib/site'

const SITE_URL = 'https://kellyalbert.com.br/'

// "2026-07" → "Jul/2026"
function rotuloMesCurto(mes: string): string {
  const [y, m] = mes.split('-')
  const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${nomes[Number(m) - 1] ?? m}/${y}`
}
const soDigitos = (s: string) => Number(s.replace(/\D/g, '')) || 0

export function DesempenhoSite({ cobrancas }: { cobrancas: Cobranca[] }) {
  const { mostrar } = useToast()
  const [lista, setLista] = useState<SiteMetrica[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // Formulário de registro do mês
  const mesAtual = hojeLocal().slice(0, 7)
  const [fMes, setFMes] = useState(mesAtual)
  const [fVisitas, setFVisitas] = useState('')
  const [fVisitantes, setFVisitantes] = useState('')
  const [fPaginas, setFPaginas] = useState('')
  const [fLeads, setFLeads] = useState('')
  const [fBusca, setFBusca] = useState('')
  const [fSocial, setFSocial] = useState('')
  const [fDireto, setFDireto] = useState('')
  const [fOutro, setFOutro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [aberto, setAberto] = useState(false)

  async function recarregar() {
    try {
      setCarregando(true)
      setLista(await listarMetricasSite())
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

  // Receita realizada por mês (cobranças pagas, pela data do pagamento).
  const receitaPorMes = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of cobrancas) {
      if (c.status !== 'paga') continue
      const mes = (c.pago_em ?? c.vencimento ?? '').slice(0, 7)
      if (!mes) continue
      m.set(mes, (m.get(mes) ?? 0) + Number(c.valor || 0))
    }
    return m
  }, [cobrancas])

  // Ordem cronológica (antigo → recente) para o gráfico.
  const cronologico = [...lista].sort((a, b) => (a.mes < b.mes ? -1 : 1))
  const maxVisitas = Math.max(1, ...cronologico.map((m) => m.visitas))
  const ultimo = lista[0] // lista já vem desc por mês

  function editar(m: SiteMetrica) {
    setFMes(m.mes)
    setFVisitas(String(m.visitas || ''))
    setFVisitantes(String(m.visitantes || ''))
    setFPaginas(String(m.paginas || ''))
    setFLeads(String(m.leads || ''))
    setFBusca(m.origem_busca ? String(m.origem_busca) : '')
    setFSocial(m.origem_social ? String(m.origem_social) : '')
    setFDireto(m.origem_direto ? String(m.origem_direto) : '')
    setFOutro(m.origem_outro ? String(m.origem_outro) : '')
    setAberto(true)
  }

  async function salvar() {
    if (!fMes) {
      mostrar('Escolha o mês.', 'erro')
      return
    }
    setSalvando(true)
    try {
      const nova = await salvarMetricaSite({
        mes: fMes,
        visitas: soDigitos(fVisitas),
        visitantes: soDigitos(fVisitantes),
        paginas: soDigitos(fPaginas),
        leads: soDigitos(fLeads),
        origem_busca: fBusca ? soDigitos(fBusca) : undefined,
        origem_social: fSocial ? soDigitos(fSocial) : undefined,
        origem_direto: fDireto ? soDigitos(fDireto) : undefined,
        origem_outro: fOutro ? soDigitos(fOutro) : undefined,
      })
      setLista((l) => [nova, ...l.filter((x) => x.mes !== nova.mes)].sort((a, b) => (a.mes < b.mes ? 1 : -1)))
      setAberto(false)
      mostrar(`Dados de ${rotuloMesCurto(fMes)} salvos ✓`, 'ok')
    } catch (e) {
      mostrar(e instanceof Error ? e.message : String(e), 'erro')
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(m: SiteMetrica) {
    if (!(await confirmar(`Apagar os dados de ${rotuloMesCurto(m.mes)}?`, { perigo: true, confirmar: 'Apagar' }))) return
    setLista((l) => l.filter((x) => x.mes !== m.mes))
    try {
      await excluirMetricaSite(m.mes)
    } catch {
      void recarregar()
    }
  }

  function baixarCSV() {
    const cab = ['Mês', 'Visitas', 'Visitantes', 'Páginas', 'Leads', 'Receita do mês']
    const linhas = cronologico.map((m) => [
      rotuloMesCurto(m.mes),
      String(m.visitas),
      String(m.visitantes),
      String(m.paginas),
      String(m.leads),
      String(receitaPorMes.get(m.mes) ?? 0).replace('.', ','),
    ])
    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`
    const csv = [cab, ...linhas].map((l) => l.map(esc).join(';')).join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'desempenho-site.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="relatorio">
      {/* Explicação honesta + link do site (não vai para o PDF) */}
      <div className="site-aviso nao-imprimir">
        Estes números vêm do <strong>seu analytics</strong> (ex.: Google Analytics) — você registra o
        mês aqui. O app não puxa o tráfego sozinho; para automatizar depois, dá para conectar o
        Google Analytics (precisa do plano Blaze). Site:{' '}
        <a href={SITE_URL} target="_blank" rel="noopener noreferrer">
          kellyalbert.com.br
        </a>
      </div>

      <div className="rel-controles nao-imprimir">
        <button className="btn" onClick={() => { setAberto(true); setFMes(mesAtual) }}>
          + Registrar mês
        </button>
        <div className="rel-acoes">
          <button className="btn--ghost" onClick={() => window.print()}>
            Imprimir / PDF
          </button>
          <button className="btn--ghost" onClick={baixarCSV} disabled={lista.length === 0}>
            Baixar CSV
          </button>
        </div>
      </div>

      {aberto && (
        <div className="card caixa-form nao-imprimir">
          <h3>Registrar / editar mês</h3>
          <div className="caixa-form__linha">
            <div className="field">
              <label>Mês</label>
              <input type="month" value={fMes} onChange={(e) => setFMes(e.target.value)} />
            </div>
            <div className="field">
              <label>Visitas (sessões)</label>
              <input inputMode="numeric" value={fVisitas} onChange={(e) => setFVisitas(e.target.value)} placeholder="ex.: 1200" />
            </div>
            <div className="field">
              <label>Visitantes únicos</label>
              <input inputMode="numeric" value={fVisitantes} onChange={(e) => setFVisitantes(e.target.value)} placeholder="ex.: 900" />
            </div>
            <div className="field">
              <label>Páginas vistas</label>
              <input inputMode="numeric" value={fPaginas} onChange={(e) => setFPaginas(e.target.value)} placeholder="ex.: 3000" />
            </div>
            <div className="field">
              <label>Leads / contatos</label>
              <input inputMode="numeric" value={fLeads} onChange={(e) => setFLeads(e.target.value)} placeholder="ex.: 8" />
            </div>
          </div>
          <p className="campo-ajuda" style={{ marginTop: '0.6rem' }}>
            Origem das visitas (opcional): de onde vieram.
          </p>
          <div className="caixa-form__linha">
            <div className="field">
              <label>Busca (Google)</label>
              <input inputMode="numeric" value={fBusca} onChange={(e) => setFBusca(e.target.value)} placeholder="0" />
            </div>
            <div className="field">
              <label>Redes sociais</label>
              <input inputMode="numeric" value={fSocial} onChange={(e) => setFSocial(e.target.value)} placeholder="0" />
            </div>
            <div className="field">
              <label>Direto</label>
              <input inputMode="numeric" value={fDireto} onChange={(e) => setFDireto(e.target.value)} placeholder="0" />
            </div>
            <div className="field">
              <label>Outros</label>
              <input inputMode="numeric" value={fOutro} onChange={(e) => setFOutro(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="caixa-form__acoes">
            <button className="btn" disabled={salvando} onClick={() => void salvar()}>
              {salvando ? 'Salvando…' : 'Salvar mês'}
            </button>
            <button className="btn--ghost" onClick={() => setAberto(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {erro && <div className="erro-msg" role="alert">{erro}</div>}
      {carregando && <p style={{ color: 'var(--t-500)', fontSize: '0.85rem' }}>Carregando…</p>}

      {!carregando && lista.length === 0 && !erro && (
        <div className="card">
          <h3>Ainda não há dados do site.</h3>
          <p>
            Toque em <strong>“+ Registrar mês”</strong> e informe os números do seu analytics
            (visitas, visitantes, leads). O painel monta a evolução e cruza com a receita.
          </p>
        </div>
      )}

      {!carregando && lista.length > 0 && (
        <div className="rel-doc">
          <div className="rel-doc__head">
            <div className="eyebrow">KA · Desempenho do site</div>
            <h1>kellyalbert.com.br</h1>
            {ultimo && (
              <div className="rel-doc__periodo">
                Último mês registrado: {rotuloMesCurto(ultimo.mes)} · gerado em{' '}
                {new Date().toLocaleDateString('pt-BR')}
              </div>
            )}
          </div>

          {/* Cards do último mês */}
          {ultimo && (
            <div className="fin-cards">
              <div className="fin-card">
                <div className="fin-card__quem">Visitas</div>
                <div className="fin-card__valor">{ultimo.visitas.toLocaleString('pt-BR')}</div>
                <div className="fin-card__qtd">{rotuloMesCurto(ultimo.mes)}</div>
              </div>
              <div className="fin-card">
                <div className="fin-card__quem">Visitantes</div>
                <div className="fin-card__valor">{ultimo.visitantes.toLocaleString('pt-BR')}</div>
                <div className="fin-card__qtd">únicos</div>
              </div>
              <div className="fin-card">
                <div className="fin-card__quem">Páginas vistas</div>
                <div className="fin-card__valor">{ultimo.paginas.toLocaleString('pt-BR')}</div>
                <div className="fin-card__qtd">
                  {ultimo.visitas > 0 ? (ultimo.paginas / ultimo.visitas).toFixed(1) : '0'} por visita
                </div>
              </div>
              <div className="fin-card fin-card--receber">
                <div className="fin-card__quem">Leads (contatos)</div>
                <div className="fin-card__valor">{ultimo.leads.toLocaleString('pt-BR')}</div>
                <div className="fin-card__qtd">
                  {ultimo.visitas > 0 ? ((ultimo.leads / ultimo.visitas) * 100).toFixed(1) : '0'}% das visitas
                </div>
              </div>
            </div>
          )}

          {/* Gráfico de visitas por mês */}
          <section className="rel-secao">
            <h3 className="fin-secao__tit">Visitas por mês</h3>
            <div className="grafico-barras">
              {cronologico.map((m) => (
                <div key={m.mes} className="gb-col">
                  <div className="gb-barra" style={{ height: `${Math.round((m.visitas / maxVisitas) * 100)}%` }}>
                    <span className="gb-valor">{m.visitas.toLocaleString('pt-BR')}</span>
                  </div>
                  <span className="gb-rot">{rotuloMesCurto(m.mes)}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Cruzamento com o financeiro */}
          <section className="rel-secao">
            <h3 className="fin-secao__tit">Site × receita</h3>
            <table className="rel-tabela">
              <thead>
                <tr>
                  <th>Mês</th>
                  <th className="rel-num">Visitas</th>
                  <th className="rel-num">Leads</th>
                  <th className="rel-num">Receita</th>
                  <th className="rel-num">R$ / visita</th>
                </tr>
              </thead>
              <tbody>
                {[...cronologico].reverse().map((m) => {
                  const receita = receitaPorMes.get(m.mes) ?? 0
                  return (
                    <tr key={m.mes}>
                      <td>{rotuloMesCurto(m.mes)}</td>
                      <td className="rel-num">{m.visitas.toLocaleString('pt-BR')}</td>
                      <td className="rel-num">{m.leads}</td>
                      <td className="rel-num">{formatarBRL(receita)}</td>
                      <td className="rel-num">{m.visitas > 0 ? formatarBRL(receita / m.visitas) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="campo-ajuda nao-imprimir" style={{ marginTop: '0.5rem' }}>
              “R$ / visita” = receita do mês ÷ visitas (o quanto cada visita ao site rendeu).
            </p>
          </section>

          {/* Editar / apagar meses */}
          <section className="rel-secao nao-imprimir">
            <h3 className="fin-secao__tit">Meses registrados</h3>
            <div className="fin-lista">
              {lista.map((m) => (
                <div key={m.mes} className="mov">
                  <div className="mov__corpo">
                    <div className="mov__desc">{rotuloMesCurto(m.mes)}</div>
                    <div className="mov__meta">
                      {m.visitas.toLocaleString('pt-BR')} visitas · {m.leads} leads
                    </div>
                  </div>
                  <div className="mov__acoes">
                    <button className="btn-mini" onClick={() => editar(m)}>
                      Editar
                    </button>
                    <button className="btn-mini btn-mini--perigo" onClick={() => void excluir(m)} title="Apagar">
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="rel-doc__rodape">KA | Inteligência para Marcas · Desempenho do site</div>
        </div>
      )}
    </div>
  )
}

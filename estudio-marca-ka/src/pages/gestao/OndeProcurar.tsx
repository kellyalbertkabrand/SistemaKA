import { useState } from 'react'
import { GRUPOS_FONTES, ROTULO_MODO, type ModoFonte } from '../../lib/fontesProspeccao'
import type { PerfilIdeal } from '../../lib/prospeccao'

// ============================================================================
// Prospecção → "Onde procurar": o MAPA de todas as fontes (sinais de momento,
// LinkedIn, redes sociais, mapas/cadastros, rankings e relacionamento), com os
// links de busca montados para o segmento + cidade escolhidos.
// ============================================================================

export function OndeProcurar({ icp }: { icp: PerfilIdeal }) {
  const cidades = icp.regioes.filter((r) => r.length > 2)
  const [seg, setSeg] = useState(icp.segmentos[0] ?? 'clínica odontológica')
  const [cid, setCid] = useState(cidades[0] ?? 'Porto Alegre')
  const [modo, setModo] = useState<'' | ModoFonte>('')

  const total = GRUPOS_FONTES.reduce((t, g) => t + g.fontes.length, 0)
  const porModo = (m: ModoFonte) => GRUPOS_FONTES.reduce((t, g) => t + g.fontes.filter((f) => f.modo === m).length, 0)

  return (
    <>
      <div className="card">
        <h3>Onde procurar</h3>
        <p className="lead-sub" style={{ marginBottom: '0.7rem' }}>
          {total} fontes, do sinal de momento até a indicação. Escolha o segmento e a cidade: os links abaixo
          já abrem a busca pronta. Achou uma empresa boa? Cadastre em <strong>Funil → + Adicionar empresa</strong>.
        </p>
        <div className="prosp-linha">
          <input list="onde-segs" value={seg} onChange={(e) => setSeg(e.target.value)} placeholder="Segmento" aria-label="Segmento" />
          <datalist id="onde-segs">
            {icp.segmentos.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <input list="onde-cids" value={cid} onChange={(e) => setCid(e.target.value)} placeholder="Cidade" aria-label="Cidade" />
          <datalist id="onde-cids">
            {cidades.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="chips" style={{ marginTop: '0.7rem' }}>
          <button className={`chip ${modo === '' ? 'chip--on' : ''}`} onClick={() => setModo('')}>
            Todas <span className="chip__n">{total}</span>
          </button>
          {(Object.keys(ROTULO_MODO) as ModoFonte[]).map((m) => (
            <button key={m} className={`chip ${modo === m ? 'chip--on' : ''}`} onClick={() => setModo(m)}>
              {ROTULO_MODO[m].rotulo} <span className="chip__n">{porModo(m)}</span>
            </button>
          ))}
        </div>
      </div>

      {GRUPOS_FONTES.map((g) => {
        const fontes = g.fontes.filter((f) => !modo || f.modo === modo)
        if (!fontes.length) return null
        return (
          <section key={g.titulo} className="onde-grupo">
            <h4 className="onde-grupo__tit">{g.titulo}</h4>
            <div className="onde-grade">
              {fontes.map((f) => {
                const links = f.links(seg.trim() || 'empresa', cid.trim())
                return (
                  <article key={f.id} className="onde-card">
                    <div className="onde-card__topo">
                      <strong>{f.nome}</strong>
                      <span className={`badge ${ROTULO_MODO[f.modo].classe}`}>{ROTULO_MODO[f.modo].rotulo}</span>
                    </div>
                    <p className="onde-card__como">{f.como}</p>
                    <p className="onde-card__porque">
                      <span className="lead-rot">Por que serve</span> {f.porque}
                    </p>
                    {links.length > 0 && (
                      <div className="onde-card__links">
                        {links.map((l) => (
                          <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer">
                            {l.rotulo} ↗
                          </a>
                        ))}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </section>
        )
      })}

      <p className="lead-sub" style={{ marginTop: '0.4rem' }}>
        LinkedIn e Instagram não têm robô de propósito: os termos de uso dessas redes proíbem coleta
        automática e a sua conta poderia ser bloqueada. Por isso o sistema monta a busca certa e o olhar fica
        com você.
      </p>
    </>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { listarNoticias, type Noticia } from '../../lib/noticias'
import { formatarData } from '../../lib/gestao'

// Aba Notícias — mostra as matérias que o sistema de geração de notícias grava
// no Firestore do app (coleção `noticias`). Esta tela só LÊ; a publicação vem
// de fora (ver BRIEFING-NOTICIAS-NO-SAAS.md).
export function GestaoNoticias() {
  const [lista, setLista] = useState<Noticia[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  async function carregar() {
    try {
      setCarregando(true)
      setLista(await listarNoticias())
      setErro(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    void carregar()
  }, [])

  // Agrupa por data da matéria (ou pela de geração, se faltar), mais recente primeiro.
  const grupos = useMemo(() => {
    const mapa = new Map<string, Noticia[]>()
    for (const n of lista) {
      const chave = (n.data || n.criado_em || '').slice(0, 10) || 'Sem data'
      const arr = mapa.get(chave) ?? []
      arr.push(n)
      mapa.set(chave, arr)
    }
    return [...mapa.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [lista])

  return (
    <div className="noticias">
      <div className="noticias__topo">
        <button className="btn--voltar" onClick={() => void carregar()} disabled={carregando}>
          {carregando ? 'Atualizando…' : '↻ Atualizar'}
        </button>
      </div>

      {erro && <div className="erro-msg">{erro}</div>}

      {!carregando && lista.length === 0 && !erro && (
        <div className="card">
          <h3>Nenhuma notícia por aqui ainda.</h3>
          <p style={{ color: 'var(--t-600)', lineHeight: 1.6 }}>
            Assim que o sistema de notícias publicar as matérias, elas aparecem aqui
            automaticamente. Nada para configurar nesta tela.
          </p>
        </div>
      )}

      {grupos.map(([dia, itens]) => (
        <section key={dia} className="noticias__grupo">
          <h3 className="noticias__dia">{dia === 'Sem data' ? 'Sem data' : formatarData(dia)}</h3>
          <div className="noticias__grade">
            {itens.map((n) => (
              <article key={n.id} className="noticia-card">
                {n.imagem && (
                  <div
                    className="noticia-card__capa"
                    style={{ backgroundImage: `url(${n.imagem})` }}
                    aria-hidden
                  />
                )}
                <div className="noticia-card__corpo">
                  <div className="noticia-card__meta">
                    {n.fonte && <span className="noticia-card__fonte">{n.fonte}</span>}
                    {n.categoria && <span className="noticia-card__tag">{n.categoria}</span>}
                  </div>
                  <h4 className="noticia-card__titulo">{n.titulo}</h4>
                  {n.resumo && <p className="noticia-card__resumo">{n.resumo}</p>}
                  {n.url && (
                    <a className="noticia-card__link" href={n.url} target="_blank" rel="noopener noreferrer">
                      Ler matéria →
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

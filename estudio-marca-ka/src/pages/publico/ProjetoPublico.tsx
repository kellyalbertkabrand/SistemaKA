import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { formatarData } from '../../lib/gestao'
import {
  assinarProjetoPorToken,
  progressoProjeto,
  type ProjetoPublico as Proj,
} from '../../lib/projetos'
import '../../styles/gestao.css'

// Página que o cliente abre pelo link: linha do tempo do projeto.
// Atualiza EM TEMPO REAL (onSnapshot) conforme a KA avança as fases.
export function ProjetoPublico() {
  const { token } = useParams<{ token: string }>()
  const [proj, setProj] = useState<Proj | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
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
  }, [token])

  if (carregando) {
    return (
      <div className="pub-wrap">
        <div className="pub-doc">Carregando…</div>
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

  return (
    <div className="pub-wrap">
      <div className="pub-doc">
        <div className="pub-doc__head">
          <div className="eyebrow">Acompanhamento de projeto · Kelly Albert — KA</div>
          <h1>{proj.nome}</h1>
          <div className="pub-doc__meta">
            {proj.cliente_nome && <>para {proj.cliente_nome} · </>}
            atualizado em {formatarData(proj.atualizado_em)}
            {proj.status === 'concluido' && ' · ✓ projeto concluído'}
            {proj.status === 'pausado' && ' · projeto pausado'}
          </div>
        </div>

        {proj.descricao && <p style={{ marginBottom: '1rem' }}>{proj.descricao}</p>}

        <div className="progresso" style={{ margin: '0.4rem 0 1.6rem' }}>
          <div className="progresso__barra progresso__barra--grande">
            <span style={{ width: `${pct}%` }} />
          </div>
          <span className="progresso__pct">{pct}%</span>
        </div>

        <div className="linha-tempo">
          {proj.fases.map((f, i) => (
            <div key={i} className={`lt-fase lt-fase--${f.status}`}>
              <div className="lt-fase__ponto">
                {f.status === 'concluida' ? '✓' : f.status === 'andamento' ? '●' : ''}
              </div>
              <div className="lt-fase__corpo">
                <div className="lt-fase__nome">{f.nome}</div>
                <div className="lt-fase__meta">
                  {f.status === 'concluida' && `Concluída${f.concluida_em ? ` em ${formatarData(f.concluida_em)}` : ''}`}
                  {f.status === 'andamento' && 'Em andamento agora'}
                  {f.status === 'pendente' && 'A seguir'}
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

        <p style={{ marginTop: '1.4rem', fontSize: '0.75rem', color: 'var(--t-400)' }}>
          Esta página se atualiza sozinha conforme o projeto avança — pode deixar salva nos
          favoritos.
        </p>

        <div className="pub-rodape">Sistema Visual de Publicações da Marca · KA</div>
      </div>
    </div>
  )
}

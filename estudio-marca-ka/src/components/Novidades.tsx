import { NOVIDADES } from '../lib/novidades'

// Bloco recolhível de "Novidades / atualizações do sistema" — mostrado no
// painel (estúdio) da Shapes. Vem fechado; a pessoa abre para ver o histórico.
export function Novidades() {
  if (NOVIDADES.length === 0) return null
  const ultima = NOVIDADES[0]
  return (
    <details className="novidades">
      <summary className="novidades__cab">
        <span className="novidades__tag">Novidades</span>
        <span className="novidades__tit">
          Atualizações do sistema
          <span className="novidades__sub">Última: {ultima.data} · {ultima.titulo}</span>
        </span>
        <span className="novidades__seta" aria-hidden="true">▾</span>
      </summary>
      <div className="novidades__corpo">
        <p className="novidades__nota">
          Melhorias feitas no sistema, da mais recente para a mais antiga. A versão no ar é sempre a
          mais nova — se algo parecer desatualizado, recarregue a página (puxe para baixo no celular).
        </p>
        <ul className="novidades__lista">
          {NOVIDADES.map((n, i) => (
            <li className="novidades__item" key={i}>
              <div className="novidades__data">{n.data}</div>
              <div className="novidades__bloco">
                <div className="novidades__h">{n.titulo}</div>
                <ul className="novidades__pontos">
                  {n.itens.map((it, j) => (
                    <li key={j}>{it}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </details>
  )
}

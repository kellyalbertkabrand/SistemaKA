import { TopBar } from '../components/TopBar'

// Placeholder do Estúdio (cliente). A escolha de formato, o editor de peça e o
// export PNG entram na Fase 3; o carrossel na Fase 4.
export function EstudioHome() {
  return (
    <>
      <TopBar />
      <div className="page">
        <div className="page__head">
          <div className="eyebrow">Seu Estúdio</div>
          <h1>Crie na identidade da sua marca</h1>
          <p>Escolha um formato, escreva o texto e baixe a arte pronta para o Instagram.</p>
        </div>

        <div className="card">
          <h3>Formatos</h3>
          <p>Card 1:1 · Post 4:5 · Carrossel · Capa de Reels 9:16 · Story.</p>
          <span className="muted-tag">Fase 3</span>
        </div>
        <div className="card">
          <h3>Editor de peça</h3>
          <p>Pré-visualização em tempo real e download em PNG de alta resolução.</p>
          <span className="muted-tag">Fase 3</span>
        </div>
        <div className="card">
          <h3>Carrossel</h3>
          <p>Monte a sequência de slides e baixe tudo em um único arquivo.</p>
          <span className="muted-tag">Fase 4</span>
        </div>
      </div>
    </>
  )
}

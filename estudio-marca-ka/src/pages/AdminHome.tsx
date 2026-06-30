import { TopBar } from '../components/TopBar'

// Placeholder da área administrativa (KA). O CRUD de clientes e o editor do
// Kit de Marca entram na Fase 2.
export function AdminHome() {
  return (
    <>
      <TopBar />
      <div className="page">
        <div className="page__head">
          <div className="eyebrow">Painel KA</div>
          <h1>Administração</h1>
          <p>Cadastro de clientes, Kit de Marca, templates e convites de acesso.</p>
        </div>

        <div className="card">
          <h3>Clientes</h3>
          <p>Listar, criar, editar e pausar os clientes atendidos pela KA.</p>
          <span className="muted-tag">Fase 2</span>
        </div>
        <div className="card">
          <h3>Kit de Marca</h3>
          <p>Cores, tipografia, logos, grafismos, direção de arte e verbal por cliente.</p>
          <span className="muted-tag">Fase 2</span>
        </div>
        <div className="card">
          <h3>Templates &amp; histórico</h3>
          <p>Definir os estilos de layout liberados e ver as peças geradas.</p>
          <span className="muted-tag">Fases 2–3</span>
        </div>
      </div>
    </>
  )
}

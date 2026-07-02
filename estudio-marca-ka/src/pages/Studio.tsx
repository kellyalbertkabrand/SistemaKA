import { TopBar } from '../components/TopBar'
import { useAuth } from '../context/AuthContext'
import { BrandStudio } from '../components/BrandStudio'

// Área do cliente: enxerga apenas a própria marca (definida em usuarios.cliente_slug).
export function Studio() {
  const { perfil } = useAuth()
  const slug = perfil?.cliente_slug ?? null

  return (
    <>
      <TopBar />
      <div className="page">
        {slug ? (
          <BrandStudio slug={slug} />
        ) : (
          <div className="card">
            <h3>Sua marca ainda não foi configurada.</h3>
            <p>
              Fale com a KA para liberar os seus templates. Assim que a sua marca for vinculada
              a este acesso, os seus modelos aparecem aqui.
            </p>
          </div>
        )}
      </div>
    </>
  )
}

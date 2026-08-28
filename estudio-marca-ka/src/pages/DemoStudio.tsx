import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { templatesDoCliente, clientesComTemplates } from '../templates/registry'
import { BrandStudio } from '../components/BrandStudio'
import { acessoEstudioPorSlug } from '../lib/gestao'

// Estúdio público por marca (sem login) — ex.: /shapes.
// Reaproveita o BrandStudio (mesma experiência do painel logado).
//
// Acesso por VALIDADE (cliente pontual, ex.: Lucas): se a KA desligou o
// estúdio da marca ou a data de "acesso até" já passou, mostra "acesso
// expirado" em vez do estúdio. Marcas sem cliente/registro (shapes/ka) seguem
// abertas. Se a verificação falhar (rede), NÃO trava — libera (modo aberto).
export function DemoStudio() {
  const { slug = 'shapes' } = useParams()
  const templates = templatesDoCliente(slug)

  const [acesso, setAcesso] = useState<'verificando' | 'ok' | 'bloqueado'>('verificando')
  const [nomeMarca, setNomeMarca] = useState('')

  useEffect(() => {
    let vivo = true
    setAcesso('verificando')
    acessoEstudioPorSlug(slug)
      .then((a) => {
        if (!vivo) return
        if (!a) {
          setAcesso('ok') // marca aberta (sem registro de acesso)
          return
        }
        const hoje = new Date().toISOString().slice(0, 10)
        const expirado = a.ate ? a.ate < hoje : false
        if (!a.ativo || expirado) {
          setNomeMarca(a.nome)
          setAcesso('bloqueado')
        } else {
          setAcesso('ok')
        }
      })
      .catch(() => vivo && setAcesso('ok')) // falha de rede não trava o cliente
    return () => {
      vivo = false
    }
  }, [slug])

  return (
    <>
      <header className="app-top">
        <div className="app-top__brand">
          Estúdio de <span>Marca</span>
        </div>
        <div className="app-top__tag">{nomeMarca || templates[0]?.clienteNome || slug}</div>
      </header>

      <div className="page">
        {acesso === 'verificando' ? (
          <p style={{ color: 'var(--t-500)', fontSize: '0.9rem' }}>Carregando…</p>
        ) : acesso === 'bloqueado' ? (
          <div className="card acesso-expirado">
            <h3>Acesso ao estúdio expirado</h3>
            <p>
              O acesso ao estúdio {nomeMarca ? <strong>{nomeMarca}</strong> : 'desta marca'} está
              encerrado no momento.
            </p>
            <p>
              Para reativar e continuar criando suas artes, fale com a{' '}
              <strong>Kelly Albert</strong> · KA | Inteligência para Marcas.
            </p>
          </div>
        ) : templates.length === 0 ? (
          <div className="card">
            <h3>Sem templates para “{slug}”.</h3>
            <p>Marcas disponíveis:</p>
            <ul style={{ marginTop: '0.6rem', paddingLeft: '1.1rem' }}>
              {clientesComTemplates().map((c) => (
                <li key={c.slug} style={{ marginBottom: '0.3rem' }}>
                  <Link to={`/${c.slug}`}>{c.nome}</Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <BrandStudio slug={slug} />
        )}
      </div>
    </>
  )
}

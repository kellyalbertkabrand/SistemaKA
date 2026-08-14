import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useParams } from 'react-router-dom'
import {
  camposDe,
  carregarFormulario,
  definicaoFormulario,
  enviarFormulario,
  salvarRespostas,
  tokenDoParametroFormulario,
  type DefinicaoFormulario,
  type Formulario,
} from '../../lib/formularios'
import { autoAltura } from '../../lib/ui'
import '../../styles/gestao.css'
import { useTituloPagina } from '../../hooks/useTituloPagina'

// Cor de destaque por seção (paleta KA) — deixa cada bloco com "cara" própria.
const ACENTOS = ['#C47830', '#3D6B7E', '#8B5A2B', '#152535', '#C2AA8A', '#9c6b3f']

// Página pública do formulário (etapa do Marca com Essência©). O cliente
// preenche sem login, com SALVAMENTO AUTOMÁTICO — pode parar e continuar depois
// no mesmo link, sem perder nada.
export function FormularioPublico() {
  useTituloPagina('Formulário')
  const { token } = useParams<{ token: string }>()
  const [form, setForm] = useState<Formulario | null>(null)
  const [def, setDef] = useState<DefinicaoFormulario | null>(null)
  const [respostas, setRespostas] = useState<Record<string, string>>({})
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState<'salvo' | 'salvando' | 'erro' | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const idRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flashRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [flashSalvo, setFlashSalvo] = useState(false)
  const rascunhoKey = `form-rascunho-${token ? tokenDoParametroFormulario(token) : ''}`

  useEffect(() => {
    ;(async () => {
      if (!token) return
      try {
        const f = await carregarFormulario(tokenDoParametroFormulario(token))
        if (!f) {
          setErro('Formulário não encontrado. Confira se o link foi copiado por inteiro.')
          return
        }
        idRef.current = f.id
        setForm(f)
        setDef(definicaoFormulario(f.tipo))
        setEnviado(f.status === 'enviado')
        // Junta o que veio do banco com um rascunho local (o mais recente ganha).
        let base = f.respostas || {}
        try {
          const local = JSON.parse(localStorage.getItem(rascunhoKey) || 'null')
          if (local && typeof local === 'object') base = { ...base, ...local }
        } catch {
          /* ignora rascunho inválido */
        }
        setRespostas(base)
      } catch (e) {
        setErro(e instanceof Error ? e.message : String(e))
      } finally {
        setCarregando(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Salvamento automático (debounce): grava no banco ~1s depois da última tecla.
  function aoDigitar(id: string, valor: string) {
    setRespostas((r) => {
      const novo = { ...r, [id]: valor }
      try {
        localStorage.setItem(rascunhoKey, JSON.stringify(novo))
      } catch {
        /* localStorage cheio/indisponível — o banco ainda salva */
      }
      agendarSalvar(novo)
      return novo
    })
  }

  function agendarSalvar(novo: Record<string, string>) {
    if (!idRef.current || enviado) return
    setSalvando('salvando')
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try {
        await salvarRespostas(idRef.current!, novo)
        setSalvando('salvo')
        // Aviso verde "Resposta salva" que aparece e some sozinho.
        setFlashSalvo(true)
        if (flashRef.current) clearTimeout(flashRef.current)
        flashRef.current = setTimeout(() => setFlashSalvo(false), 2200)
      } catch {
        setSalvando('erro')
      }
    }, 1000)
  }

  const campos = useMemo(() => (def ? camposDe(def) : []), [def])
  const respondidas = campos.filter((c) => (respostas[c.id] || '').trim()).length
  const total = campos.length
  const pct = total ? Math.round((respondidas / total) * 100) : 0

  async function enviar() {
    if (!idRef.current || !def) return
    const faltando = camposDe(def).filter((c) => c.obrigatorio && !(respostas[c.id] || '').trim())
    if (faltando.length) {
      setErro(`Ainda faltam ${faltando.length} resposta(s) obrigatória(s). Preencha para enviar.`)
      const el = document.getElementById(`campo-${faltando[0].id}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setEnviando(true)
    setErro(null)
    try {
      await enviarFormulario(idRef.current, respostas)
      try {
        localStorage.removeItem(rascunhoKey)
      } catch {
        /* ok */
      }
      setEnviado(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setEnviando(false)
    }
  }

  if (carregando) {
    return (
      <div className="pub-wrap">
        <div className="pub-doc">Carregando…</div>
      </div>
    )
  }
  if (erro && !form) {
    return (
      <div className="pub-wrap">
        <div className="pub-doc">
          <h1>Ops…</h1>
          <p style={{ marginTop: '0.6rem', color: 'var(--t-500)' }}>{erro}</p>
        </div>
      </div>
    )
  }
  if (!form || !def) return null

  if (enviado) {
    return (
      <div className="pub-wrap">
        <div className="pub-doc">
          <div className="pub-doc__head">
            <div className="eyebrow">{def.etapa}</div>
            <h1>{def.nome}</h1>
          </div>
          <div className="pub-assinado">
            ✓ Respostas enviadas. Obrigada por compartilhar! A Kelly já recebeu tudo. Você pode
            fechar esta página.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pub-wrap">
      <div className="pub-doc form-pub">
        {/* Cabeçalho: logo COMPLETO da KA num tom levemente diferente do papel. */}
        <div className="form-pub__cabecalho">
          <img
            className="form-pub__logo"
            src="/logo-ka.png"
            alt="KA | Inteligência para Marcas"
          />
        </div>
        <div className="pub-doc__head form-pub__head">
          <h1 className="form-pub__titulo">{def.nome}</h1>
          {def.etapa && <div className="form-pub__etapa">{def.etapa}</div>}
          {def.intro && <p className="form-pub__intro">{def.intro}</p>}
        </div>

        {/* Barra de progresso + status de salvamento (fica grudada no topo). */}
        <div className="form-pub__barra">
          <div className="form-pub__prog">
            <div className="form-pub__prog-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="form-pub__status">
            <span>
              {respondidas} de {total} respondidas
            </span>
            <span
              className={
                'form-pub__salvo' +
                (salvando === 'salvo' ? ' form-pub__salvo--ok' : '') +
                (salvando === 'erro' ? ' form-pub__salvo--erro' : '')
              }
            >
              {salvando === 'salvando' && '💾 Salvando…'}
              {salvando === 'salvo' && '✓ Resposta salva'}
              {salvando === 'erro' && '⚠️ Sem conexão. Tentando de novo'}
              {salvando === null && 'Salva automaticamente'}
            </span>
          </div>
        </div>

        {erro && <div className="erro-msg" style={{ marginTop: '1rem' }}>{erro}</div>}

        {def.secoes.map((sec, si) => (
          <section
            key={sec.titulo}
            className="form-pub__secao"
            style={{ '--acento': ACENTOS[si % ACENTOS.length] } as CSSProperties}
          >
            <div className="form-pub__secao-cab">
              <h2 className="form-pub__secao-tit">{sec.titulo}</h2>
              {sec.descricao && <p className="form-pub__secao-desc">{sec.descricao}</p>}
            </div>
            {sec.campos.map((campo) => (
              <div key={campo.id} id={`campo-${campo.id}`} className="field form-pub__campo">
                <label>
                  {campo.label}
                  {campo.obrigatorio && <span className="form-pub__req"> *</span>}
                </label>
                {campo.ajuda && <span className="campo-ajuda">{campo.ajuda}</span>}
                {campo.tipo === 'paragrafo' ? (
                  <textarea
                    value={respostas[campo.id] || ''}
                    onChange={(e) => aoDigitar(campo.id, e.target.value)}
                    onInput={(e) => autoAltura(e.currentTarget)}
                    rows={3}
                  />
                ) : (
                  <input
                    type={campo.tipo === 'email' ? 'email' : campo.tipo === 'data' ? 'date' : 'text'}
                    value={respostas[campo.id] || ''}
                    onChange={(e) => aoDigitar(campo.id, e.target.value)}
                  />
                )}
              </div>
            ))}
          </section>
        ))}

        <div className="form-pub__rodape">
          <p className="form-pub__aviso">
            Pode parar quando quiser: o que você escreveu fica salvo. É só voltar neste mesmo link
            para continuar.
          </p>
          <button className="btn" onClick={() => void enviar()} disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar respostas'}
          </button>
        </div>
      </div>
      {flashSalvo && <div className="form-pub__flash">✓ Resposta salva</div>}
    </div>
  )
}

import type { ReactNode } from 'react'
import type { RenderProps } from '../types'
import { estiloImagem } from '../imagem'
import { ConectaLogo, ConectaSimbolo } from './ConectaLogo'
import { fundoCss, corFonte, corDestaque, ehFundoEscuro, COR_CIANO } from './cores'
import './conecta.css'

// ============================================================================
// Cards do Conecta · Núcleo de Negócios ACIGRA — sistema visual (jul/2026).
// Anatomia fiel aos posts: logo no topo, gradiente marinho→índigo, padrão de
// "C" à direita, título de seção em ciano e rodapé com o crédito ACIGRA.
// Cada modelo serve para FEED, STORY, QUADRADO e APRESENTAÇÃO 16:9.
// ============================================================================

// Negrito por aspas ou *asteriscos* (mesma cor do texto).
const RE_DESTAQUE = /“([^”]+)”|"([^"]+)"|\*([^*]+)\*/g
function comDestaque(texto: string): ReactNode[] {
  const nos: ReactNode[] = []
  let ultimo = 0
  let k = 0
  let m: RegExpExecArray | null
  RE_DESTAQUE.lastIndex = 0
  while ((m = RE_DESTAQUE.exec(texto))) {
    if (m.index > ultimo) nos.push(<span key={k++}>{texto.slice(ultimo, m.index)}</span>)
    nos.push(
      <strong key={k++} className="conecta-destaque">
        {m[1] ?? m[2] ?? m[3]}
      </strong>,
    )
    ultimo = RE_DESTAQUE.lastIndex
  }
  if (ultimo < texto.length) nos.push(<span key={k++}>{texto.slice(ultimo)}</span>)
  return nos
}

// Padrão de "C" no fundo (à direita). Teal e forte no escuro; marinho e bem
// sutil no claro (para o card leve não ficar "sujo").
function ConectaPattern({ escuro }: { escuro: boolean }) {
  return (
    <div className={`conecta-pattern ${escuro ? '' : 'conecta-pattern--claro'}`} aria-hidden>
      {Array.from({ length: 18 }).map((_, i) => (
        <ConectaSimbolo key={i} escuro={escuro} tamanho={120} />
      ))}
    </div>
  )
}

// Moldura comum: gradiente, padrão de C, logo, miolo e rodapé.
function ConectaFrame({
  fundo,
  corTexto,
  tipo,
  formato,
  badge,
  semLogo,
  children,
}: {
  fundo: string
  corTexto: string
  tipo: string
  formato: RenderProps['formato']
  badge?: string
  semLogo?: boolean
  children: ReactNode
}) {
  const escuro = ehFundoEscuro(fundo)
  const wide = formato.largura > formato.altura
  const alturaLogo = wide ? 84 : 90
  return (
    <div
      className={`conecta-card tipo-${tipo} fmt-${formato.formato} ${wide ? 'conecta-card--wide' : ''}`}
      style={{ width: formato.largura, height: formato.altura, background: fundoCss(fundo), color: corTexto }}
    >
      <ConectaPattern escuro={escuro} />
      {!semLogo && (
        <div className="conecta-header">
          <ConectaLogo escuro={escuro} altura={alturaLogo} />
          {badge && <div className={`conecta-badge ${escuro ? '' : 'conecta-badge--claro'}`}>{badge}</div>}
        </div>
      )}
      <div className="conecta-miolo">{children}</div>
      <div className="conecta-footer" style={{ color: corTexto }}>
        ACIGRA · Núcleo de Negócios
        <span className="traco" />
        Gravataí
      </div>
    </div>
  )
}

// 1 · Capa de carrossel — título grande centralizado + ícone/subtítulo.
export function ConectaCapaCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'gradiente')
  const cor = corFonte(valores.cor_fonte, fundo)
  const titulo = String(valores.titulo || '')
  const sub = String(valores.subtitulo || '')
  const icone = String(valores.icone || '')
  return (
    <ConectaFrame fundo={fundo} corTexto={cor} tipo="capa" formato={formato} badge={String(valores.badge || '')}>
      {titulo && <div className="titulo" style={{ color: corDestaque(fundo) }}>{comDestaque(titulo)}</div>}
      {icone && <div className="icone-grande">{icone}</div>}
      {sub && <div className="sub">{comDestaque(sub)}</div>}
    </ConectaFrame>
  )
}

// 2 · Tópico — rótulo de seção (ciano) + parágrafo. Slides internos.
export function ConectaTopicoCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'gradiente')
  const cor = corFonte(valores.cor_fonte, fundo)
  const secao = String(valores.secao || '')
  const icone = String(valores.icone || '')
  const texto = String(valores.texto || '')
  return (
    <ConectaFrame fundo={fundo} corTexto={cor} tipo="topico" formato={formato} badge={String(valores.badge || '')}>
      {(secao || icone) && (
        <div className="conecta-secao" style={{ color: corDestaque(fundo) }}>
          {secao && <span className="rotulo">{secao}</span>}
          {icone && <span className="icone">{icone}</span>}
        </div>
      )}
      {texto && <div className="conecta-corpo">{comDestaque(texto)}</div>}
    </ConectaFrame>
  )
}

// 3 · Lista — título de seção + itens (rótulo em negrito + descrição).
export function ConectaListaCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'gradiente')
  const cor = corFonte(valores.cor_fonte, fundo)
  const secao = String(valores.secao || '')
  const icone = String(valores.icone || '')
  const bruto = String(valores.itens || '')
  const destaque = corDestaque(fundo)
  // Cada linha "Rótulo: descrição" — o rótulo (antes do ":") fica em negrito.
  const itens = bruto
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((linha) => {
      const i = linha.indexOf(':')
      return i > 0 ? { rot: linha.slice(0, i).trim(), desc: linha.slice(i + 1).trim() } : { rot: '', desc: linha }
    })
  return (
    <ConectaFrame fundo={fundo} corTexto={cor} tipo="lista" formato={formato} badge={String(valores.badge || '')}>
      {(secao || icone) && (
        <div className="conecta-secao" style={{ color: destaque }}>
          {secao && <span className="rotulo">{secao}</span>}
          {icone && <span className="icone">{icone}</span>}
        </div>
      )}
      <div className="conecta-lista">
        {itens.map((it, k) => (
          <div className="item" key={k}>
            <span className="bolinha" style={{ background: destaque }} />
            <span>
              {it.rot && <span className="rot">{it.rot}: </span>}
              {it.desc}
            </span>
          </div>
        ))}
      </div>
    </ConectaFrame>
  )
}

// 4 · Post com foto — foto de fundo, véu e título embaixo.
export function ConectaPostCard({ valores, formato }: RenderProps) {
  const foto = String(valores.foto || '')
  const rotulo = String(valores.rotulo || '')
  const titulo = String(valores.titulo || '')
  const acento = String(valores.cor_acento || COR_CIANO)
  const ehVideo = String(valores.foto_kind) === 'video' || foto.startsWith('data:video')
  const wide = formato.largura > formato.altura
  return (
    <div
      className={`conecta-card tipo-post fmt-${formato.formato} ${wide ? 'conecta-card--wide' : ''}`}
      style={{ width: formato.largura, height: formato.altura, background: '#05070F', color: '#FFFFFF' }}
    >
      {foto ? (
        ehVideo ? (
          <video className="conecta-post-foto" src={foto} style={estiloImagem(valores, 'foto')} autoPlay muted loop playsInline />
        ) : (
          <img className="conecta-post-foto" src={foto} alt="" style={estiloImagem(valores, 'foto')} crossOrigin="anonymous" />
        )
      ) : (
        <div className="conecta-post-ph">envie uma foto ou vídeo</div>
      )}
      <div className="conecta-post-veu" />
      <div className="conecta-post-conteudo">
        {rotulo && <div className="rotulo" style={{ background: acento }}>{rotulo}</div>}
        {titulo && <div className="titulo">{comDestaque(titulo)}</div>}
        <ConectaLogo escuro altura={60} />
      </div>
    </div>
  )
}

// 5 · Feedback — prova social (box branco, avatar, estrelas).
export function ConectaFeedbackCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'gradiente')
  const cor = corFonte(valores.cor_fonte, fundo)
  const nome = String(valores.nome || '')
  const subtitulo = String(valores.subtitulo || '')
  const texto = String(valores.texto || '')
  const rotulo = String(valores.rotulo || '')
  const nota = Math.max(1, Math.min(5, Number(valores.nota) || 5))
  const inicial = (String(valores.inicial || '').trim() || nome.trim().slice(0, 1)).toUpperCase()
  const stars = '★'.repeat(nota) + '☆'.repeat(5 - nota)
  return (
    <ConectaFrame fundo={fundo} corTexto={cor} tipo="fb" formato={formato}>
      {rotulo && <div className="conecta-fb-rotulo" style={{ color: corDestaque(fundo) }}>{rotulo}</div>}
      <div className="conecta-fb-box">
        <div className="head">
          <div className="av">{inicial}</div>
          <div>
            {nome && <div className="nm">{nome}</div>}
            {subtitulo && <div className="rl">{subtitulo}</div>}
          </div>
        </div>
        <div className="stars">{stars}</div>
        {texto && <div className="depo">{texto}</div>}
      </div>
    </ConectaFrame>
  )
}

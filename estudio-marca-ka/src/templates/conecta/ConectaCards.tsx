import type { ReactNode } from 'react'
import type { RenderProps } from '../types'
import { estiloImagem } from '../imagem'
import { hexFundo, corFonte, corDestaque, COR_ACENTO } from './cores'
import './conecta.css'

// ============================================================================
// Cards d'O Conecta — marca provisória (jul/2026).
// Padrão limpo e moderno: cabeçalho com o wordmark, miolo central e rodapé.
// Estrutura pronta para receber a identidade oficial quando a KA passar.
// ============================================================================

// Destaque: palavra/frase entre ASPAS ou *asteriscos* vira NEGRITO na mesma
// cor do texto (mesma convenção da KA/Shapes).
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

// Moldura comum: fundo da paleta, cor de texto derivada, cabeçalho e rodapé.
function ConectaFrame({
  fundo,
  corTexto,
  classe,
  formato,
  children,
}: {
  fundo: string
  corTexto: string
  classe: string
  formato: RenderProps['formato']
  children: ReactNode
}) {
  return (
    <div
      className={`conecta-card ${classe} fmt-${formato.formato}`}
      style={{ width: formato.largura, height: formato.altura, background: hexFundo(fundo), color: corTexto }}
    >
      <div className="conecta-header">
        <span className="ponto" style={{ background: corDestaque(fundo) }} />
        O Conecta
      </div>
      <div className="conecta-miolo">{children}</div>
      <div className="conecta-footer">Conecta</div>
    </div>
  )
}

// 1 · Capa — título grande + subtítulo opcional.
export function ConectaCapaCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'azul')
  const cor = corFonte(valores.cor_fonte, fundo)
  const titulo = String(valores.titulo || '')
  const sub = String(valores.subtitulo || '')
  return (
    <ConectaFrame fundo={fundo} corTexto={cor} classe="conecta-capa" formato={formato}>
      {titulo && <div className="titulo">{comDestaque(titulo)}</div>}
      {sub && <div className="sub">{comDestaque(sub)}</div>}
    </ConectaFrame>
  )
}

// 2 · Texto / frase — título curto (opcional) + corpo.
export function ConectaTextoCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'creme')
  const cor = corFonte(valores.cor_fonte, fundo)
  const titulo = String(valores.titulo || '')
  const texto = String(valores.texto || '')
  return (
    <ConectaFrame fundo={fundo} corTexto={cor} classe="conecta-texto" formato={formato}>
      {titulo && (
        <div className="titulo" style={{ color: corDestaque(fundo) }}>
          {comDestaque(titulo)}
        </div>
      )}
      {texto && <div className="corpo">{comDestaque(texto)}</div>}
    </ConectaFrame>
  )
}

// 3 · Post com foto — foto de fundo, véu escuro e texto embaixo.
export function ConectaPostCard({ valores, formato }: RenderProps) {
  const foto = String(valores.foto || '')
  const rotulo = String(valores.rotulo || '')
  const titulo = String(valores.titulo || '')
  const acento = String(valores.cor_acento || COR_ACENTO)
  const ehVideo = String(valores.foto_kind) === 'video' || foto.startsWith('data:video')

  return (
    <div
      className={`conecta-card conecta-post fmt-${formato.formato}`}
      style={{ width: formato.largura, height: formato.altura, background: '#16181D', color: '#FFFFFF' }}
    >
      {foto ? (
        ehVideo ? (
          <video className="foto" src={foto} style={estiloImagem(valores, 'foto')} autoPlay muted loop playsInline />
        ) : (
          <img className="foto" src={foto} alt="" style={estiloImagem(valores, 'foto')} crossOrigin="anonymous" />
        )
      ) : (
        <div className="foto-ph">envie uma foto ou vídeo</div>
      )}
      <div className="veu" />
      <div className="conteudo">
        {rotulo && (
          <div className="rotulo" style={{ background: acento, color: '#16181D' }}>
            {rotulo}
          </div>
        )}
        {titulo && <div className="titulo">{comDestaque(titulo)}</div>}
        <div className="marca">O Conecta</div>
      </div>
    </div>
  )
}

// 4 · Feedback — prova social no modelo review (box branco + estrelas).
export function ConectaFeedbackCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'azul')
  const cor = corFonte(valores.cor_fonte, fundo)
  const nome = String(valores.nome || '')
  const subtitulo = String(valores.subtitulo || '')
  const texto = String(valores.texto || '')
  const rotulo = String(valores.rotulo || '')
  const nota = Math.max(1, Math.min(5, Number(valores.nota) || 5))
  const inicial = (String(valores.inicial || '').trim() || nome.trim().slice(0, 1)).toUpperCase()
  const stars = '★'.repeat(nota) + '☆'.repeat(5 - nota)

  return (
    <ConectaFrame fundo={fundo} corTexto={cor} classe="conecta-fb" formato={formato}>
      {rotulo && (
        <div className="rotulo" style={{ color: corDestaque(fundo) }}>
          {rotulo}
        </div>
      )}
      <div className="box">
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

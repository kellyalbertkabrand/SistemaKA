import type { RenderProps } from '../types'
import { estiloImagem } from '../imagem'
import './shapes.css'

const BRANCO = '/clientes/shapes/shapes-logo-branco.png'
const PRETO = '/clientes/shapes/shapes-logo-preto.png'

// 1 · Capa — foto em tela cheia + título grande + logo.
export function ShapesCapaCard({ valores, formato }: RenderProps) {
  const foto = String(valores.foto || '')
  const titulo = String(valores.titulo || '')
  return (
    <div className="shapes-capa" style={{ width: formato.largura, height: formato.altura }}>
      {foto ? (
        <img className="bg" src={foto} alt="" style={estiloImagem(valores, 'foto')} crossOrigin="anonymous" />
      ) : (
        <div className="bg-ph">Sua foto aqui</div>
      )}
      {titulo && <div className="titulo">{titulo}</div>}
      <div className="logo">
        <img src={PRETO} alt="" crossOrigin="anonymous" />
        <span>shapes</span>
      </div>
    </div>
  )
}

// 3 · Diversas cores — fundo claro + foto em forma orgânica + rótulos.
export function ShapesCoresCard({ valores, formato }: RenderProps) {
  const cor = String(valores.cor_fundo || '#F2EFE9')
  const foto = String(valores.foto || '')
  const texto = String(valores.texto || '')
  return (
    <div
      className="shapes-cores"
      style={{ width: formato.largura, height: formato.altura, background: cor }}
    >
      <img className="logo" src={PRETO} alt="Shapes" crossOrigin="anonymous" />
      <div className="foto-blob">
        {foto ? (
          <img src={foto} alt="" style={estiloImagem(valores, 'foto')} crossOrigin="anonymous" />
        ) : (
          <div className="foto-ph">Sua foto aqui</div>
        )}
      </div>
      {texto && <div className="labels">{texto}</div>}
    </div>
  )
}

// 4 · Forma função emoção — fundo escuro + foto + texto e concha ao lado.
export function ShapesFormaCard({ valores, formato }: RenderProps) {
  const cor = String(valores.cor_fundo || '#131313')
  const foto = String(valores.foto || '')
  const texto = String(valores.texto || '')
  return (
    <div
      className="shapes-forma"
      style={{ width: formato.largura, height: formato.altura, background: cor }}
    >
      <div className="foto-blob">
        {foto ? (
          <img src={foto} alt="" style={estiloImagem(valores, 'foto')} crossOrigin="anonymous" />
        ) : (
          <div className="foto-ph">Sua foto aqui</div>
        )}
      </div>
      <div className="lado">
        <img className="logo" src={BRANCO} alt="Shapes" crossOrigin="anonymous" />
        {texto && <div className="texto">{texto}</div>}
      </div>
    </div>
  )
}

// 5 · CTA — foto desfocada + forma colorida + chamada para a loja.
export function ShapesCtaCard({ valores, formato }: RenderProps) {
  const foto = String(valores.foto || '')
  const cor = String(valores.cor_fundo || '#3E4A2C')
  const botao = String(valores.texto_botao || '')
  const sub = String(valores.texto_sub || '')
  const extra = String(valores.texto_extra || '')
  return (
    <div className="shapes-cta" style={{ width: formato.largura, height: formato.altura }}>
      {foto ? (
        <img className="bg" src={foto} alt="" style={estiloImagem(valores, 'foto')} crossOrigin="anonymous" />
      ) : (
        <div className="bg" style={{ background: '#6c6c6c' }} />
      )}
      <div className="blob" style={{ background: cor }} />
      <div className="centro">
        <img className="icone" src={BRANCO} alt="Shapes" crossOrigin="anonymous" />
        {botao && <div className="botao">{botao}</div>}
        {sub && <div className="sub">{sub}</div>}
        {extra && <div className="extra">{extra}</div>}
      </div>
    </div>
  )
}

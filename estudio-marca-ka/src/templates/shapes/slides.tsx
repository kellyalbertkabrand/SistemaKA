import type { RenderProps } from '../types'
import { estiloImagem } from '../imagem'
import { ratioForma, caixaFoto, FORMAS } from '../formas'
import { corContraste } from './cores'
import { ShapesClips } from './ShapesClips'
import './shapes.css'

const BRANCO = '/clientes/shapes/shapes-logo-branco.png'
const PRETO = '/clientes/shapes/shapes-logo-preto.png'

// 1 · Capa — foto (tamanho ajustável) + título grande + logo.
// A foto vai de 60% a 100% do card; abaixo de 100% aparece a cor de fundo em volta.
export function ShapesCapaCard({ valores, formato }: RenderProps) {
  const foto = String(valores.foto || '')
  const titulo = String(valores.titulo || '')
  const corFundo = String(valores.cor_fundo || '#EDE9DE')
  const corFonte = String(valores.cor_fonte || '#131313')
  // texto claro => logo branca; texto escuro => logo preta.
  const fonteEscura = corContraste(corFonte) === '#FFFFFF'
  const logoSrc = fonteEscura ? PRETO : BRANCO

  const areaRaw = Number(valores.foto_area)
  const fator = Math.min(100, Math.max(60, Number.isFinite(areaRaw) ? areaRaw : 92)) / 100
  const frameW = Math.round(formato.largura * fator)
  const frameH = Math.round(formato.altura * fator)

  return (
    <div
      className="shapes-capa"
      style={{ width: formato.largura, height: formato.altura, background: corFundo, color: corFonte }}
    >
      <div className="foto-frame" style={{ width: frameW, height: frameH }}>
        {foto ? (
          <img className="bg" src={foto} alt="" style={estiloImagem(valores, 'foto')} crossOrigin="anonymous" />
        ) : (
          <div className="bg-ph">Sua foto aqui</div>
        )}
      </div>
      {titulo && <div className="titulo">{titulo}</div>}
      <div className="logo">
        <img src={logoSrc} alt="" crossOrigin="anonymous" />
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
  const forma = String(valores.forma || 'shape-blob1')
  const tinta = corContraste(cor)
  const caixa = caixaFoto(formato.largura - 192, formato.altura - 500, ratioForma(forma), Number(valores.foto_area))
  return (
    <div
      className={`shapes-cores fmt-${formato.formato}`}
      style={{ width: formato.largura, height: formato.altura, background: cor, color: tinta }}
    >
      <ShapesClips />
      <img className="logo" src={tinta === '#FFFFFF' ? BRANCO : PRETO} alt="Shapes" crossOrigin="anonymous" />
      <div className="blob-wrap">
        <div
          className="foto-blob"
          style={{
            width: caixa.largura,
            height: caixa.altura,
            clipPath: `url(#${forma})`,
            WebkitClipPath: `url(#${forma})`,
          }}
        >
          {foto ? (
            <img src={foto} alt="" style={estiloImagem(valores, 'foto')} crossOrigin="anonymous" />
          ) : (
            <div className="foto-ph">Sua foto aqui</div>
          )}
        </div>
      </div>
      {texto && <div className="labels">{texto}</div>}
    </div>
  )
}

// 4 · Forma função emoção — fundo escuro + foto + texto e concha.
// No feed/quadrado fica lado a lado; no story empilha (texto em cima, foto
// embaixo, tudo centralizado e maior).
export function ShapesFormaCard({ valores, formato }: RenderProps) {
  const cor = String(valores.cor_fundo || '#010101')
  const foto = String(valores.foto || '')
  const texto = String(valores.texto || '')
  const forma = String(valores.forma || 'shape-blob1')
  const tinta = corContraste(cor)
  const story = formato.formato === 'story'
  const caixa = story
    ? caixaFoto(formato.largura - 192, formato.altura - 600, ratioForma(forma), Number(valores.foto_area))
    : caixaFoto(formato.largura - 606, formato.altura - 192, ratioForma(forma), Number(valores.foto_area))

  const blob = (
    <div
      className="foto-blob"
      style={{
        width: caixa.largura,
        height: caixa.altura,
        clipPath: `url(#${forma})`,
        WebkitClipPath: `url(#${forma})`,
      }}
    >
      {foto ? (
        <img src={foto} alt="" style={estiloImagem(valores, 'foto')} crossOrigin="anonymous" />
      ) : (
        <div className="foto-ph">Sua foto aqui</div>
      )}
    </div>
  )
  const lado = (
    <div className="lado">
      <img className="logo" src={tinta === '#FFFFFF' ? BRANCO : PRETO} alt="Shapes" crossOrigin="anonymous" />
      {texto && <div className="texto">{texto}</div>}
    </div>
  )

  return (
    <div
      className={`shapes-forma ${story ? 'empilhado' : ''}`}
      style={{ width: formato.largura, height: formato.altura, background: cor, color: tinta }}
    >
      <ShapesClips />
      {story ? (
        <>
          {lado}
          {blob}
        </>
      ) : (
        <>
          {blob}
          {lado}
        </>
      )}
    </div>
  )
}

// 5 · CTA "acesse a loja" — foto de fundo + forma orgânica colorida
// (semi-transparente) + concha, botão bordado e chamadas.
export function ShapesCtaCard({ valores, formato }: RenderProps) {
  const foto = String(valores.foto || '')
  const cor = String(valores.cor_fundo || '#363E31')
  const forma = String(valores.forma || 'shape-blob1')
  const botao = String(valores.texto_botao || '')
  const sub = String(valores.texto_sub || '')
  const extra = String(valores.texto_extra || '')
  const tinta = corContraste(cor)
  const f = FORMAS.find((x) => x.id === forma) ?? FORMAS[0]
  const blobW = Math.round(formato.largura * 0.86)
  const blobH = Math.round(blobW / f.ratio)

  return (
    <div className="shapes-cta" style={{ width: formato.largura, height: formato.altura, color: tinta }}>
      {foto ? (
        <img className="bg" src={foto} alt="" style={estiloImagem(valores, 'foto')} crossOrigin="anonymous" />
      ) : (
        <div className="bg-ph">Sua foto aqui</div>
      )}
      <div className="blob" style={{ width: blobW, height: blobH }}>
        <svg viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden>
          <path d={f.d} fill={cor} fillOpacity={0.82} />
        </svg>
      </div>
      <div className="centro">
        <img className="icone" src={tinta === '#FFFFFF' ? BRANCO : PRETO} alt="Shapes" crossOrigin="anonymous" />
        {botao && <div className="botao">{botao}</div>}
        {sub && <div className="sub">{sub}</div>}
        {extra && <div className="extra">{extra}</div>}
      </div>
    </div>
  )
}

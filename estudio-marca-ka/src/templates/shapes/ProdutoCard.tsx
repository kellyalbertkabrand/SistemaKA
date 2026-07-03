import type { RenderProps } from '../types'
import { estiloImagem } from '../imagem'
import { ratioForma, caixaFoto } from '../formas'
import { corContraste } from './cores'
import { ShapesClips } from './ShapesClips'
import './shapes.css'

const LOGO_BRANCO = '/clientes/shapes/shapes-logo-branco.png'
const LOGO_PRETO = '/clientes/shapes/shapes-logo-preto.png'

// Post de produto da Shapes — fundo colorido (configurável), foto do produto
// numa forma orgânica e um texto curto, no estilo do carrossel de produto.
// Campos: foto (imagem), cor de fundo (cor) e texto.
export function ShapesProdutoCard({ valores, formato }: RenderProps) {
  const cor = String(valores.cor_fundo || '#FF7829')
  const foto = String(valores.foto || '')
  const texto = String(valores.texto || '')
  const forma = String(valores.forma || 'shape-blob1')
  const tinta = corContraste(cor)

  // caixa da foto com a proporção nativa da forma (contain), para o clip não
  // esticar; tamanho ajustável pelo slider "Tamanho da foto" (foto_area).
  const pad = 96
  const caixa = caixaFoto(
    formato.largura - pad * 2,
    formato.altura - 500,
    ratioForma(forma),
    Number(valores.foto_area),
  )

  return (
    <div
      className={`shapes-prod fmt-${formato.formato}`}
      style={{ width: formato.largura, height: formato.altura, background: cor, color: tinta }}
    >
      <ShapesClips />
      <img
        className="logo"
        src={tinta === '#FFFFFF' ? LOGO_BRANCO : LOGO_PRETO}
        alt="Shapes"
        crossOrigin="anonymous"
      />

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
            <img src={foto} alt="" style={estiloImagem(valores, 'foto')} />
          ) : (
            <div className="foto-ph">Sua foto aqui</div>
          )}
        </div>
      </div>

      {texto && <div className="texto">{texto}</div>}
    </div>
  )
}

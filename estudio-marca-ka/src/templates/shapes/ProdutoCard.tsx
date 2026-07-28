import { useId } from 'react'
import type { RenderProps } from '../types'
import { estiloImagem } from '../imagem'
import { ratioForma, caixaFoto } from '../formas'
import { logoShapes } from './cores'
import { ShapesClips, idsClipSeguro } from './ShapesClips'
import { comEnfase } from './enfase'
import './shapes.css'

// Post de produto da Shapes — fundo colorido (configurável), foto do produto
// numa forma orgânica e um texto curto, no estilo do carrossel de produto.
// Campos: foto (imagem), cor de fundo (cor) e texto.
export function ShapesProdutoCard({ valores, formato }: RenderProps) {
  const cor = String(valores.cor_fundo || '#FF7829')
  const foto = String(valores.foto || '')
  const texto = String(valores.texto || '')
  const forma = String(valores.forma || 'shape-blob1')
  const corFonte = String(valores.cor_fonte || '#FFFFFF')
  const logoUrl = logoShapes(String(valores.cor_logo || 'auto'), cor)
  const uid = idsClipSeguro(useId())
  const ehVideo =
    String(valores.foto_kind) === 'video' || foto.startsWith('data:video') || foto.startsWith('blob:')

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
      style={{ width: formato.largura, height: formato.altura, background: cor, color: corFonte }}
    >
      <ShapesClips uid={uid} />
      <img
        className="logo"
        src={logoUrl}
        alt="Shapes"
        crossOrigin="anonymous"
      />

      <div className="blob-wrap">
        <div
          className="foto-blob"
          data-forma={forma}
          style={{
            width: caixa.largura,
            height: caixa.altura,
            clipPath: `url(#${forma}-${uid})`,
            WebkitClipPath: `url(#${forma}-${uid})`,
          }}
        >
          {foto ? (
            ehVideo ? (
              <video src={foto} style={estiloImagem(valores, 'foto')} autoPlay muted loop playsInline />
            ) : (
              <img src={foto} alt="" style={estiloImagem(valores, 'foto')} />
            )
          ) : (
            <div className="foto-ph">Sua foto aqui</div>
          )}
        </div>
      </div>

      {texto && <div className="texto">{comEnfase(texto)}</div>}
    </div>
  )
}

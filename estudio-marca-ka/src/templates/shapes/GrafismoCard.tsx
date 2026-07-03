import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { RenderProps } from '../types'
import { estiloImagem } from '../imagem'
import './shapes.css'

const GRAF_ESQ = '/clientes/shapes/elementos/grafismo-esq.png'
const GRAF_DIR = '/clientes/shapes/elementos/grafismo-dir.png'

// Converte *itálico* em <em> sem usar innerHTML.
function comItalico(texto: string) {
  return texto.split('*').map((p, i) =>
    i % 2 === 1 ? <em key={i}>{p}</em> : <span key={i}>{p}</span>,
  )
}

// Recolore um PNG (alpha) para a cor escolhida via canvas (source-in) e
// devolve um data URL — funciona no editor e no export (vira <img> comum).
function Grafismo({ src, cor, style }: { src: string; cor: string; style: CSSProperties }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    let vivo = true
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      const x = c.getContext('2d')
      if (!x) return
      x.drawImage(img, 0, 0)
      x.globalCompositeOperation = 'source-in'
      x.fillStyle = cor
      x.fillRect(0, 0, c.width, c.height)
      if (vivo) setUrl(c.toDataURL())
    }
    img.src = src
    return () => {
      vivo = false
    }
  }, [src, cor])
  if (!url) return null
  return <img className="graf" src={url} alt="" style={style} crossOrigin="anonymous" />
}

// Card com grafismo lateral: fundo, texto (cima/baixo), foto no centro
// (redimensionável) e as espirais da concha nas laterais — tudo recolorível.
// Medidas fiéis ao gerador: moldura 498px (left 312, top 21%, altura 58%).
export function ShapesGrafismoCard({ valores, formato }: RenderProps) {
  const foto = String(valores.foto || '')
  const cima = String(valores.texto_cima || '')
  const baixo = String(valores.texto_baixo || '')
  const corFundo = String(valores.cor_fundo || '#FFFFFF')
  const corFonte = String(valores.cor_fonte || '#131313')
  const corGraf = String(valores.cor_grafismo || '#DFC0DF')
  const story = formato.formato === 'story'

  // moldura da foto (base 498 × 58% da altura), escalada pelo "Tamanho da foto".
  const areaRaw = Number(valores.foto_area)
  const fator = Math.min(120, Math.max(60, Number.isFinite(areaRaw) ? areaRaw : 100)) / 100
  const baseW = 498
  const baseH = Math.round(formato.altura * 0.58)
  const fw = Math.round(baseW * fator)
  const fh = Math.round(baseH * fator)
  const cx = 312 + baseW / 2
  const cy = formato.altura * 0.5

  return (
    <div
      className="shapes-graf"
      style={{ width: formato.largura, height: formato.altura, background: corFundo, color: corFonte }}
    >
      <Grafismo src={GRAF_ESQ} cor={corGraf} style={{ left: 0, top: Math.round(formato.altura * (story ? 0.39 : 0.162)), height: 693 }} />
      <Grafismo src={GRAF_DIR} cor={corGraf} style={{ right: 0, top: Math.round(formato.altura * 0.2), height: 642 }} />

      {cima && (
        <div className="txt topo" style={{ top: Math.round(formato.altura * 0.075) }}>
          {comItalico(cima)}
        </div>
      )}

      <div
        className="frame"
        style={{ width: fw, height: fh, left: Math.round(cx - fw / 2), top: Math.round(cy - fh / 2) }}
      >
        {foto ? (
          <img src={foto} alt="" style={estiloImagem(valores, 'foto')} crossOrigin="anonymous" />
        ) : (
          <div className="ph">
            <div className="ph-t1">espaço da imagem</div>
            <div className="ph-t2">
              {fw} × {fh} px
            </div>
          </div>
        )}
      </div>

      {baixo && (
        <div className="txt rodape" style={{ bottom: Math.round(formato.altura * 0.075) }}>
          {comItalico(baixo)}
        </div>
      )}
    </div>
  )
}

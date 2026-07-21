import type { RenderProps } from '../types'
import { estiloImagem } from '../imagem'
import { Midia } from './Midia'
import './shapes.css'

// Converte *itálico* em <em> sem usar innerHTML (texto do próprio usuário).
function comItalico(texto: string) {
  return texto.split('*').map((p, i) =>
    i % 2 === 1 ? <em key={i}>{p}</em> : <span key={i}>{p}</span>,
  )
}

// Modelo "frase + foto" (carrossel 03): fundo creme, texto em cima, espaço da
// foto no meio (redimensionável) e texto embaixo. Sem logotipo.
// Medidas fiéis ao gerador oficial: moldura 76%×66%, topo a 15,5%; texto de
// cima a 7,5% e de baixo a 10%. Itálico com *asteriscos*.
export function ShapesFraseCard({ valores, formato }: RenderProps) {
  const foto = String(valores.foto || '')
  const cima = String(valores.texto_cima || '')
  const baixo = String(valores.texto_baixo || '')
  const corFundo = String(valores.cor_fundo || '#F1E9DA')
  const corFonte = String(valores.cor_fonte || '#131313')

  const areaRaw = Number(valores.foto_area)
  const fator = Math.min(120, Math.max(60, Number.isFinite(areaRaw) ? areaRaw : 100)) / 100
  const frameW = Math.round(formato.largura * 0.76 * fator)
  const frameH = Math.round(formato.altura * 0.66 * fator)

  return (
    <div
      className="shapes-frase"
      style={{ width: formato.largura, height: formato.altura, background: corFundo, color: corFonte }}
    >
      {cima && (
        <div className="txt topo" style={{ top: Math.round(formato.altura * 0.075) }}>
          {comItalico(cima)}
        </div>
      )}

      <div
        className="frame"
        style={{
          width: frameW,
          height: frameH,
          left: Math.round((formato.largura - frameW) / 2),
          top: Math.round(formato.altura * 0.485 - frameH / 2),
        }}
      >
        {foto ? (
          <Midia src={foto} style={estiloImagem(valores, 'foto')} />
        ) : (
          <div className="ph">
            <div className="ph-t1">espaço da imagem</div>
            <div className="ph-t2">
              {frameW} × {frameH} px
            </div>
          </div>
        )}
      </div>

      {baixo && (
        <div className="txt rodape" style={{ bottom: Math.round(formato.altura * 0.1) }}>
          {comItalico(baixo)}
        </div>
      )}
    </div>
  )
}

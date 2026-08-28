import type { RenderProps } from '../types'
import { hexFundoGrazi, corFonteGrazi } from './cores'
import './grazi.css'

// ============================================================================
// Cards da Grazi Martini — Mentora e Estrategista do Comportamento Humano.
// Padrão visual: fundos quentes (mostarda, terracota, vinho, verde), texto
// creme, título em Poppins caixa-alta + palavra de destaque em script (Allura),
// botão pílula "Leia a Legenda" e uma faixa verde no rodapé. @sougrazimartini.
// ============================================================================

const HANDLE = '@sougrazimartini'

// Moldura comum: fundo, cor de texto derivada, @handle e faixa verde.
function GraziFrame({
  fundo,
  cor,
  classe,
  formato,
  children,
}: {
  fundo: string
  cor: string
  classe: string
  formato: RenderProps['formato']
  children: React.ReactNode
}) {
  return (
    <div
      className={`grazi-card ${classe} fmt-${formato.formato}`}
      style={{ width: formato.largura, height: formato.altura, background: hexFundoGrazi(fundo), color: cor }}
    >
      <div className="grazi-handle">{HANDLE}</div>
      {children}
      <div className="grazi-faixa" />
    </div>
  )
}

// Frase editorial: título sans caixa-alta + palavra de destaque em script + botão.
export function GraziFraseCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'mostarda')
  const cor = corFonteGrazi(valores.cor_fonte, fundo)
  const titulo = String(valores.titulo || '')
  const script = String(valores.script || '')
  const botao = String(valores.botao || '')
  return (
    <GraziFrame fundo={fundo} cor={cor} classe="grazi-frase" formato={formato}>
      <div className="titulo">
        {titulo}
        {script && <span className="script"> {script}</span>}
      </div>
      {botao && (
        <div className="grazi-btn">
          <span className="seta">⟶</span> {botao}
        </div>
      )}
    </GraziFrame>
  )
}

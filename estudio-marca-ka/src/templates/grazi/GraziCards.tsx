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

// Depoimento: review estilo Google (card branco) sobre a marca d'água
// "depoimento", com @sougrazimartini em dourado no rodapé.
export function GraziDepoimentoCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'verde-escuro')
  const nome = String(valores.nome || '')
  const sub = String(valores.sub || '')
  const depo = String(valores.depoimento || '')
  const n = Math.max(0, Math.min(5, Number(valores.estrelas ?? 5)))
  const inicial = (String(valores.avatar || '').trim() || nome.trim().charAt(0) || '?').toUpperCase()
  const corAvatar = String(valores.cor_avatar || '#A0349B')
  return (
    <div
      className={`grazi-card grazi-depo fmt-${formato.formato}`}
      style={{ width: formato.largura, height: formato.altura, background: hexFundoGrazi(fundo) }}
    >
      <div className="depo-marca">
        {'depoimento '.repeat(3).trim()}
        <br />
        {'depoimento '.repeat(3).trim()}
        <br />
        {'depoimento '.repeat(3).trim()}
        <br />
        {'depoimento '.repeat(3).trim()}
        <br />
        {'depoimento '.repeat(3).trim()}
      </div>
      <div className="depo-box">
        <div className="depo-head">
          <div className="depo-av" style={{ background: corAvatar }}>
            {inicial}
          </div>
          <div className="depo-quem">
            <div className="depo-nm">{nome}</div>
            {sub && <div className="depo-sub">{sub}</div>}
          </div>
          <div className="depo-dots">⋮</div>
        </div>
        <div className="depo-stars">{'★'.repeat(n)}</div>
        <div className="depo-texto">{depo}</div>
      </div>
      <div className="depo-handle">@sougrazimartini</div>
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

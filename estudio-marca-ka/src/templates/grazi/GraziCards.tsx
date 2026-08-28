import type { ReactNode } from 'react'
import type { RenderProps } from '../types'
import { hexFundoGrazi, corFonteGrazi } from './cores'
import './grazi.css'

// Destaque: "aspas" ou *asteriscos* viram negrito (mesma cor). \n vira quebra.
const RE_DESTAQUE = /“([^”]+)”|"([^"]+)"|\*([^*]+)\*/g
function comDestaque(texto: string): ReactNode[] {
  const nos: ReactNode[] = []
  let ultimo = 0
  let k = 0
  let m: RegExpExecArray | null
  RE_DESTAQUE.lastIndex = 0
  while ((m = RE_DESTAQUE.exec(texto))) {
    if (m.index > ultimo) nos.push(<span key={k++}>{texto.slice(ultimo, m.index)}</span>)
    nos.push(<strong key={k++}>{m[1] ?? m[2] ?? m[3]}</strong>)
    ultimo = RE_DESTAQUE.lastIndex
  }
  if (ultimo < texto.length) nos.push(<span key={k++}>{texto.slice(ultimo)}</span>)
  return nos
}

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

// Card de texto (desenvolvimento): título opcional + corpo.
export function GraziTextoCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'verde')
  const cor = corFonteGrazi(valores.cor_fonte, fundo)
  const titulo = String(valores.titulo || '')
  const texto = String(valores.texto || '')
  return (
    <GraziFrame fundo={fundo} cor={cor} classe="grazi-texto" formato={formato}>
      {titulo && <div className="titulo">{comDestaque(titulo)}</div>}
      {texto && <div className="corpo">{comDestaque(texto)}</div>}
    </GraziFrame>
  )
}

// Passo numerado: número grande + título + corpo.
export function GraziPassoCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'terracota')
  const cor = corFonteGrazi(valores.cor_fonte, fundo)
  const numero = String(valores.numero || '')
  const titulo = String(valores.titulo || '')
  const texto = String(valores.texto || '')
  return (
    <GraziFrame fundo={fundo} cor={cor} classe="grazi-passo" formato={formato}>
      {numero !== '' && <div className="numero">{numero}</div>}
      {titulo && <div className="titulo">{comDestaque(titulo)}</div>}
      {texto && <div className="corpo">{comDestaque(texto)}</div>}
    </GraziFrame>
  )
}

// CTA de fechamento: frase + nome grande em script + botão pílula.
export function GraziCtaCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'bege-dourado')
  const cor = corFonteGrazi(valores.cor_fonte, fundo)
  const frase = String(valores.frase || '')
  const produto = String(valores.produto || '')
  const botao = String(valores.botao || '')
  return (
    <GraziFrame fundo={fundo} cor={cor} classe="grazi-cta" formato={formato}>
      {frase && <div className="frase">{comDestaque(frase)}</div>}
      {produto && <div className="produto">{produto}</div>}
      {botao && (
        <div className="grazi-btn">
          <span className="seta">⟶</span> {botao}
        </div>
      )}
    </GraziFrame>
  )
}

// Frase mista: intro (sans) + palavra-herói em script + fecho (sans com
// destaque) + nota manuscrita + "leia a legenda".
export function GraziMistaCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'verde')
  const cor = corFonteGrazi(valores.cor_fonte, fundo)
  const cima = String(valores.texto_cima || '')
  const script = String(valores.script || '')
  const baixo = String(valores.texto_baixo || '')
  const nota = String(valores.nota || '')
  const botao = String(valores.botao || '')
  const linhasCima = cima.split('\n')
  return (
    <div
      className={`grazi-card grazi-mista fmt-${formato.formato}`}
      style={{ width: formato.largura, height: formato.altura, background: hexFundoGrazi(fundo), color: cor }}
    >
      <div className="grazi-handle">{HANDLE}</div>
      {cima && (
        <div className="cima">
          {linhasCima.map((l, i) =>
            i === 0 ? (
              <span className="primeira" key={i}>
                {l}
              </span>
            ) : (
              <span key={i}>
                {i > 1 && <br />}
                {l}
              </span>
            ),
          )}
        </div>
      )}
      {script && <div className="script-hero">{script}</div>}
      {baixo && <div className="baixo">{comDestaque(baixo)}</div>}
      {nota && <div className="nota">{nota}</div>}
      {botao && <div className="rodape-txt">{botao}</div>}
      <div className="grazi-faixa" />
    </div>
  )
}

import type { ReactNode } from 'react'
import type { RenderProps } from '../types'
import { hexFundoGrazi, corFonteGrazi } from './cores'
import { estiloImagem } from '../imagem'
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

// Frase + foto: título em cima, foto (ou vídeo) numa janela arredondada no
// meio (tamanho pelo slider "Tamanho da foto") e uma frase de fecho embaixo.
export function GraziFraseFotoCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'vinho')
  const cor = corFonteGrazi(valores.cor_fonte, fundo)
  const titulo = String(valores.titulo || '')
  const legenda = String(valores.legenda || '')
  const foto = String(valores.foto || '')
  const ehVideo = String(valores.foto_kind) === 'video' || foto.startsWith('data:video')
  // Altura da janela: 60–120% de uma base proporcional ao formato.
  const area = Math.min(120, Math.max(50, Number(valores.foto_area) || 92)) / 100
  const baseH = Math.round(formato.altura * 0.42)
  const h = Math.round(baseH * area)
  const est = { ...estiloImagem(valores, 'foto'), width: '100%', height: '100%' } as const
  return (
    <GraziFrame fundo={fundo} cor={cor} classe="grazi-frasefoto" formato={formato}>
      {titulo && <div className="titulo">{comDestaque(titulo)}</div>}
      <div className="foto-janela" style={{ height: h }}>
        {foto ? (
          ehVideo ? (
            <video src={foto} style={est} autoPlay muted loop playsInline />
          ) : (
            <img src={foto} alt="" style={est} crossOrigin="anonymous" />
          )
        ) : (
          <div className="foto-ph">foto / vídeo aqui</div>
        )}
      </div>
      {legenda && <div className="legenda">{comDestaque(legenda)}</div>}
    </GraziFrame>
  )
}

// Comparativo: duas colunas — o que "pesa" × o que "inspira" (ou o rótulo que a
// KA quiser). Cada coluna tem um cabeçalho e uma lista (uma linha por item).
export function GraziComparativoCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'verde')
  const cor = corFonteGrazi(valores.cor_fonte, fundo)
  const titulo = String(valores.titulo || '')
  const rotA = String(valores.rotulo_a || '')
  const rotB = String(valores.rotulo_b || '')
  const itensA = String(valores.itens_a || '').split('\n').filter((l) => l.trim() !== '')
  const itensB = String(valores.itens_b || '').split('\n').filter((l) => l.trim() !== '')
  return (
    <GraziFrame fundo={fundo} cor={cor} classe="grazi-comp" formato={formato}>
      {titulo && <div className="titulo">{comDestaque(titulo)}</div>}
      <div className="comp-grade">
        <div className="comp-col comp-col--a">
          {rotA && <div className="comp-cab">{rotA}</div>}
          {itensA.map((l, i) => (
            <div className="comp-item" key={i}>
              <span className="comp-mk">✕</span>
              <span>{comDestaque(l.trim())}</span>
            </div>
          ))}
        </div>
        <div className="comp-linha" />
        <div className="comp-col comp-col--b">
          {rotB && <div className="comp-cab">{rotB}</div>}
          {itensB.map((l, i) => (
            <div className="comp-item" key={i}>
              <span className="comp-mk comp-mk--ok">✓</span>
              <span>{comDestaque(l.trim())}</span>
            </div>
          ))}
        </div>
      </div>
    </GraziFrame>
  )
}

// Bloco de notas: cartão estilo "Notas" do iPhone (título + linhas), sobre o
// fundo da marca. Bom para listas/reflexões com um ar pessoal.
export function GraziNotasCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'bege-dourado')
  const cor = corFonteGrazi(valores.cor_fonte, fundo)
  const chamada = String(valores.chamada || '')
  const titulo = String(valores.titulo || '')
  const corpo = String(valores.corpo || '')
  return (
    <GraziFrame fundo={fundo} cor={cor} classe="grazi-notas" formato={formato}>
      {chamada && <div className="chamada">{comDestaque(chamada)}</div>}
      <div className="nota-card">
        <div className="nota-barra">
          <span className="nota-ponto" />
          <span className="nota-ponto" />
          <span className="nota-ponto" />
          <span className="nota-tit-barra">Notas</span>
        </div>
        <div className="nota-corpo">
          {titulo && <div className="nota-tit">{comDestaque(titulo)}</div>}
          {corpo && <div className="nota-txt">{comDestaque(corpo)}</div>}
        </div>
      </div>
    </GraziFrame>
  )
}

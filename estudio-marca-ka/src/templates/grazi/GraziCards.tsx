import type { ReactNode, CSSProperties } from 'react'
import type { RenderProps } from '../types'
import { hexFundoGrazi, corFonteGrazi, corTextoGrazi, ehFundoEscuroGrazi } from './cores'
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

// Controles comuns a todos os cards: posição vertical (topo/meio/base) e
// escala do texto (--e). O cliente ajusta pelos campos "Posição do texto" e
// "Tamanho do texto".
function posClasse(v: unknown): string {
  const p = String(v || 'meio')
  return p === 'topo' || p === 'base' ? p : 'meio'
}
function escalaFrac(v: unknown, padrao = 1): number {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.min(180, Math.max(50, n)) / 100 : padrao
}
// Estilo do card com a variável de escala (--e).
function estiloCard(formato: RenderProps['formato'], fundo: string, cor: string | undefined, escala: number): CSSProperties {
  const s: Record<string, unknown> = {
    width: formato.largura,
    height: formato.altura,
    background: hexFundoGrazi(fundo),
    '--e': escala,
  }
  if (cor) s.color = cor
  return s as CSSProperties
}

// Selo @sougrazimartini: posição (rodapé/topo/nenhum) e cor (auto = contraste
// com o fundo; senão a cor escolhida — hex direto ou chave da paleta).
function handlePosDe(v: unknown): 'rodape' | 'cabecalho' | 'nenhum' {
  const s = String(v || 'rodape')
  return s === 'cabecalho' || s === 'nenhum' ? s : 'rodape'
}
function corHandleGrazi(v: unknown, fundo: string): string {
  const s = String(v || 'auto')
  if (s === 'auto') return corTextoGrazi(fundo)
  if (s.startsWith('#')) return s
  return hexFundoGrazi(s)
}
// Desenha o selo na posição pedida (ou nada).
function SeloGrazi({ pos, cor }: { pos: 'rodape' | 'cabecalho' | 'nenhum'; cor: string }) {
  if (pos === 'nenhum') return null
  const lugar = pos === 'cabecalho' ? 'topo' : 'base'
  return <div className={`grazi-handle grazi-handle--${lugar}`} style={{ color: cor }}>{HANDLE}</div>
}

// ============================================================================
// Cards da Grazi Martini — Mentora e Estrategista do Comportamento Humano.
// Padrão visual: fundos quentes (mostarda, terracota, vinho, verde), texto
// creme, título em Poppins caixa-alta + palavra de destaque em script (Allura),
// botão pílula "Leia a Legenda" e uma faixa verde no rodapé. @sougrazimartini
// aparece SEMPRE centralizado no rodapé (acima da faixa verde).
// ============================================================================

const HANDLE = '@sougrazimartini'

// Moldura comum: fundo, cor de texto derivada, posição/escala, @handle no
// rodapé e faixa verde.
function GraziFrame({
  fundo,
  cor,
  classe,
  formato,
  pos,
  escala,
  seloPos,
  seloCor,
  children,
}: {
  fundo: string
  cor: string
  classe: string
  formato: RenderProps['formato']
  pos: string
  escala: number
  seloPos: 'rodape' | 'cabecalho' | 'nenhum'
  seloCor: string
  children: React.ReactNode
}) {
  return (
    <div className={`grazi-card ${classe} fmt-${formato.formato} pos-${pos}`} style={estiloCard(formato, fundo, cor, escala)}>
      {seloPos === 'cabecalho' && <SeloGrazi pos="cabecalho" cor={seloCor} />}
      {children}
      {seloPos === 'rodape' && <SeloGrazi pos="rodape" cor={seloCor} />}
      <div className="grazi-faixa" />
    </div>
  )
}

// Depoimento: review estilo Google (card branco) sobre a marca d'água
// "depoimento", com @sougrazimartini em dourado no rodapé. A marca d'água
// contrasta com o fundo (creme sobre escuro, verde sobre claro).
export function GraziDepoimentoCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'verde-escuro')
  const nome = String(valores.nome || '')
  const sub = String(valores.sub || '')
  const depo = String(valores.depoimento || '')
  const n = Math.max(0, Math.min(5, Number(valores.estrelas ?? 5)))
  const pos = posClasse(valores.pos)
  const escala = escalaFrac(valores.escala)
  const seloPos = handlePosDe(valores.handle_pos)
  // Padrão dourado (herança do review); "auto" também vale.
  const seloCor = corHandleGrazi(valores.handle_cor ?? '#C9A24C', fundo)
  // Marca d'água legível nos dois casos (o fundo bege apagava o creme).
  const corMarca = ehFundoEscuroGrazi(fundo) ? 'rgba(242, 209, 167, 0.11)' : 'rgba(30, 58, 44, 0.13)'
  return (
    <div className={`grazi-card grazi-depo fmt-${formato.formato} pos-${pos}`} style={estiloCard(formato, fundo, undefined, escala)}>
      {seloPos === 'cabecalho' && <SeloGrazi pos="cabecalho" cor={seloCor} />}
      <div className="depo-marca" style={{ color: corMarca }}>
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
          <div className="depo-quem">
            <div className="depo-nm">{nome}</div>
            {sub && <div className="depo-sub">{sub}</div>}
          </div>
          <div className="depo-dots">⋮</div>
        </div>
        <div className="depo-stars">{'★'.repeat(n)}</div>
        <div className="depo-texto">{depo}</div>
      </div>
      {seloPos === 'rodape' && <SeloGrazi pos="rodape" cor={seloCor} />}
    </div>
  )
}

// Frase editorial: título sans caixa-alta + palavra de destaque em script + botão.
// A palavra em script tem tamanho e altura (subir/descer) próprios.
export function GraziFraseCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'mostarda')
  const cor = corFonteGrazi(valores.cor_fonte, fundo)
  const titulo = String(valores.titulo || '')
  const script = String(valores.script || '')
  const botao = String(valores.botao || '')
  const pos = posClasse(valores.pos)
  const escala = escalaFrac(valores.escala)
  const scriptTam = escalaFrac(valores.script_tam)
  const scriptY = Number(valores.script_y) || 0
  // Tamanho e deslocamento vertical da palavra em script (independente do resto).
  const estScript: CSSProperties = {
    fontSize: `calc(150px * var(--e) * ${scriptTam})`,
    transform: `translateY(${scriptY}px)`,
  }
  return (
    <GraziFrame
      fundo={fundo}
      cor={cor}
      classe="grazi-frase"
      formato={formato}
      pos={pos}
      escala={escala}
      seloPos={handlePosDe(valores.handle_pos)}
      seloCor={corHandleGrazi(valores.handle_cor, fundo)}
    >
      <div className="titulo">
        {titulo}
        {script && (
          <span className="script" style={estScript}>
            {' '}
            {script}
          </span>
        )}
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
    <GraziFrame fundo={fundo} cor={cor} classe="grazi-texto" formato={formato} pos={posClasse(valores.pos)} escala={escalaFrac(valores.escala)} seloPos={handlePosDe(valores.handle_pos)} seloCor={corHandleGrazi(valores.handle_cor, fundo)}>
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
    <GraziFrame fundo={fundo} cor={cor} classe="grazi-passo" formato={formato} pos={posClasse(valores.pos)} escala={escalaFrac(valores.escala)} seloPos={handlePosDe(valores.handle_pos)} seloCor={corHandleGrazi(valores.handle_cor, fundo)}>
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
    <GraziFrame fundo={fundo} cor={cor} classe="grazi-cta" formato={formato} pos={posClasse(valores.pos)} escala={escalaFrac(valores.escala)} seloPos={handlePosDe(valores.handle_pos)} seloCor={corHandleGrazi(valores.handle_cor, fundo)}>
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
// destaque) + nota manuscrita + "leia a legenda". A nota segue a cor do texto.
export function GraziMistaCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'verde')
  const cor = corFonteGrazi(valores.cor_fonte, fundo)
  const cima = String(valores.texto_cima || '')
  const script = String(valores.script || '')
  const baixo = String(valores.texto_baixo || '')
  const nota = String(valores.nota || '')
  const botao = String(valores.botao || '')
  const pos = posClasse(valores.pos)
  const escala = escalaFrac(valores.escala)
  const seloPos = handlePosDe(valores.handle_pos)
  const seloCor = corHandleGrazi(valores.handle_cor, fundo)
  const linhasCima = cima.split('\n')
  return (
    <div className={`grazi-card grazi-mista fmt-${formato.formato} pos-${pos}`} style={estiloCard(formato, fundo, cor, escala)}>
      {seloPos === 'cabecalho' && <SeloGrazi pos="cabecalho" cor={seloCor} />}
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
      {nota && <div className="grazi-mao">{nota}</div>}
      {botao && <div className="rodape-txt">{botao}</div>}
      {seloPos === 'rodape' && <SeloGrazi pos="rodape" cor={seloCor} />}
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
    <GraziFrame fundo={fundo} cor={cor} classe="grazi-frasefoto" formato={formato} pos={posClasse(valores.pos)} escala={escalaFrac(valores.escala)} seloPos={handlePosDe(valores.handle_pos)} seloCor={corHandleGrazi(valores.handle_cor, fundo)}>
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
    <GraziFrame fundo={fundo} cor={cor} classe="grazi-comp" formato={formato} pos={posClasse(valores.pos)} escala={escalaFrac(valores.escala)} seloPos={handlePosDe(valores.handle_pos)} seloCor={corHandleGrazi(valores.handle_cor, fundo)}>
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

// Capa de Reels: a foto (ou vídeo) ocupa o card inteiro; título grande por
// cima (posição escolhível) + subtítulo opcional; e uma faixa verde elegante
// no rodapé com um texto (a assinatura/chamada). Padrão 9:16.
function corCapaGrazi(v: unknown, padrao = 'creme'): string {
  const s = String(v || padrao)
  if (s === 'branco') return '#FFFFFF'
  if (s.startsWith('#')) return s
  return hexFundoGrazi(s)
}
function hexAlpha(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}
export function GraziCapaCard({ valores, formato }: RenderProps) {
  const foto = String(valores.foto || '')
  const ehVideo = String(valores.foto_kind) === 'video' || foto.startsWith('data:video')
  const titulo = String(valores.titulo || '')
  const subtitulo = String(valores.subtitulo || '')
  const rodape = String(valores.rodape || '')
  const tituloPos = posClasse(valores.titulo_pos)
  const escala = escalaFrac(valores.escala)
  const corTexto = corCapaGrazi(valores.cor_fonte, 'branco')
  const corGlow = hexFundoGrazi(String(valores.cor_faixa || 'verde-escuro'))
  const est = { ...estiloImagem(valores, 'foto'), width: '100%', height: '100%' } as const
  const estiloRaiz = { width: formato.largura, height: formato.altura, '--e': escala } as CSSProperties
  // Blur verde forte atrás do texto (segue a posição do bloco).
  const estiloGlow = {
    '--glow': hexAlpha(corGlow, 0.94),
    '--glow-mid': hexAlpha(corGlow, 0.6),
  } as CSSProperties
  const temTexto = titulo || subtitulo || rodape
  return (
    <div className={`grazi-card grazi-capa fmt-${formato.formato} tpos-${tituloPos}`} style={estiloRaiz}>
      <div className="capa-foto">
        {foto ? (
          ehVideo ? (
            <video src={foto} style={est} autoPlay muted loop playsInline />
          ) : (
            <img src={foto} alt="" style={est} crossOrigin="anonymous" />
          )
        ) : (
          <div className="capa-ph">anexe a foto</div>
        )}
      </div>
      {temTexto && <div className={`capa-glow g-${tituloPos}`} style={estiloGlow} />}
      {temTexto && (
        <div className="capa-texto" style={{ color: corTexto }}>
          {titulo && <div className="capa-titulo">{comDestaque(titulo)}</div>}
          {subtitulo && <div className="capa-sub">{comDestaque(subtitulo)}</div>}
          {rodape && <div className="capa-assinatura">{rodape}</div>}
        </div>
      )}
    </div>
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
    <GraziFrame fundo={fundo} cor={cor} classe="grazi-notas" formato={formato} pos={posClasse(valores.pos)} escala={escalaFrac(valores.escala)} seloPos={handlePosDe(valores.handle_pos)} seloCor={corHandleGrazi(valores.handle_cor, fundo)}>
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

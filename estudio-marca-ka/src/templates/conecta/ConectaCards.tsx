import type { ReactNode, CSSProperties } from 'react'
import type { RenderProps, ValoresPeca } from '../types'
import { estiloImagem } from '../imagem'
import { ConectaLogo, ConectaIconeAssinatura } from './ConectaLogo'
import { fundoCss, corTitulo, corApoio, ehFundoEscuro, corEscolhida, COR_NAVY } from './cores'
import './conecta.css'

// ============================================================================
// Cards do Conecta — Design System oficial para Instagram (ago/2026).
// Sora · Navy + Turquesa · tipografia light+bold · tag/linha/número editoriais.
// Extras (ago/2026): quebra automática de texto, tamanho por texto (slider) e
// cor de texto/logo escolhíveis.
// ============================================================================

// A keyword (entre aspas ou *asteriscos*) vira 700 turquesa.
const RE = /“([^”]+)”|"([^"]+)"|\*([^*]+)\*/g
function comKw(texto: string): ReactNode[] {
  const nos: ReactNode[] = []
  let ultimo = 0
  let k = 0
  let m: RegExpExecArray | null
  RE.lastIndex = 0
  while ((m = RE.exec(texto))) {
    if (m.index > ultimo) nos.push(<span key={k++}>{texto.slice(ultimo, m.index)}</span>)
    nos.push(<strong key={k++} className="conecta-kw">{m[1] ?? m[2] ?? m[3]}</strong>)
    ultimo = RE.lastIndex
  }
  if (ultimo < texto.length) nos.push(<span key={k++}>{texto.slice(ultimo)}</span>)
  return nos
}

function classeCard(classe: string, formato: RenderProps['formato'], claro: boolean) {
  const wide = formato.largura > formato.altura
  return `conecta-card ${classe} fmt-${formato.formato} ${wide ? 'conecta-card--wide' : ''} ${claro ? 'claro' : ''}`
}

// Fator de tamanho de um texto (slider ${id}_tam, 100 = normal).
function fator(valores: ValoresPeca, id: string): number {
  const v = Number(valores[`${id}_tam`])
  return Number.isFinite(v) && v > 0 ? v / 100 : 1
}
// Estilo com a variável de tamanho (e cor opcional).
function estTitulo(valores: ValoresPeca, fundo: string, id = 'titulo'): CSSProperties {
  return { color: corEscolhida(valores.cor_texto) ?? corTitulo(fundo), ['--tf' as string]: fator(valores, id) } as CSSProperties
}
function estCorpo(valores: ValoresPeca, fundo: string, id: string): CSSProperties {
  return { color: corApoio(fundo), ['--ta' as string]: fator(valores, id) } as CSSProperties
}
function estTag(valores: ValoresPeca): CSSProperties {
  return { ['--tg' as string]: fator(valores, 'tag') } as CSSProperties
}
// Cor do logo escolhida.
function logoCor(valores: ValoresPeca): 'auto' | 'branco' | 'turquesa' | 'navy' {
  const v = String(valores.cor_logo || 'auto')
  return v === 'branco' || v === 'turquesa' || v === 'navy' ? v : 'auto'
}

function RodapeIcone({ escuro }: { escuro: boolean }) {
  return (
    <div className="c-rodape">
      <ConectaIconeAssinatura escuro={escuro} tamanho={54} />
    </div>
  )
}

// 1 · CAPA
export function ConectaCapaCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'navy')
  const escuro = ehFundoEscuro(fundo)
  const titulo = String(valores.titulo || '')
  const sub = String(valores.subtitulo || '')
  const tag = String(valores.tag || '')
  const deslize = String(valores.deslize || '')
  return (
    <div className={classeCard('conecta-capa', formato, !escuro)} style={{ width: formato.largura, height: formato.altura, background: fundoCss(fundo), color: corTitulo(fundo) }}>
      {!escuro && <div className="c-barra-topo" />}
      <div className="c-topo c-topo--centro">
        <ConectaLogo escuro={escuro} cor={logoCor(valores)} altura={escuro ? 104 : 108} />
      </div>
      <div className="c-miolo">
        {tag && <div className="c-tag" style={estTag(valores)}>{tag}</div>}
        {titulo && <div className="c-titulo" style={estTitulo(valores, fundo)}>{comKw(titulo)}</div>}
        <div className="c-linha" style={{ alignSelf: 'center' }} />
        {sub && <div className="c-apoio" style={estCorpo(valores, fundo, 'subtitulo')}>{comKw(sub)}</div>}
      </div>
      <div className="c-rodape">
        {deslize && <span className="c-deslize" style={{ color: corApoio(fundo) }}>{deslize}</span>}
      </div>
    </div>
  )
}

// 2 · CONTEÚDO (slide interno)
export function ConectaConteudoCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'navy')
  const escuro = ehFundoEscuro(fundo)
  const numero = String(valores.numero || '')
  const tag = String(valores.tag || '')
  const titulo = String(valores.titulo || '')
  const texto = String(valores.texto || '')
  return (
    <div className={classeCard('conecta-conteudo', formato, !escuro)} style={{ width: formato.largura, height: formato.altura, background: fundoCss(fundo), color: corTitulo(fundo) }}>
      {!escuro && <div className="c-barra-topo" />}
      <div className="c-topo">
        <ConectaLogo escuro={escuro} cor={logoCor(valores)} altura={escuro ? 88 : 92} />
        {numero && <div className="c-num">{numero}</div>}
      </div>
      <div className="c-miolo">
        {tag && <div className="c-tag" style={estTag(valores)}>{tag}</div>}
        {titulo && <div className="c-titulo" style={estTitulo(valores, fundo)}>{comKw(titulo)}</div>}
        <div className="c-linha" />
        {texto && <div className="c-apoio" style={estCorpo(valores, fundo, 'texto')}>{comKw(texto)}</div>}
      </div>
      <RodapeIcone escuro={escuro} />
    </div>
  )
}

// 3 · LISTA
export function ConectaListaCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'navy')
  const escuro = ehFundoEscuro(fundo)
  const tag = String(valores.tag || '')
  const titulo = String(valores.titulo || '')
  const itens = String(valores.itens || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((linha) => {
      const i = linha.indexOf(':')
      return i > 0 ? { rot: linha.slice(0, i).trim(), desc: linha.slice(i + 1).trim() } : { rot: '', desc: linha }
    })
  return (
    <div className={classeCard('conecta-lista', formato, !escuro)} style={{ width: formato.largura, height: formato.altura, background: fundoCss(fundo), color: corTitulo(fundo) }}>
      {!escuro && <div className="c-barra-topo" />}
      <div className="c-topo">
        <ConectaLogo escuro={escuro} cor={logoCor(valores)} altura={escuro ? 88 : 92} />
      </div>
      <div className="c-miolo">
        {tag && <div className="c-tag" style={estTag(valores)}>{tag}</div>}
        {titulo && <div className="c-titulo" style={{ ...estTitulo(valores, fundo), marginBottom: 10 }}>{comKw(titulo)}</div>}
        <div className="c-linha" />
        <div className="conecta-lista-itens" style={estCorpo(valores, fundo, 'itens')}>
          {itens.map((it, k) => (
            <div className="item" key={k}>
              {it.rot && <span className="rot">{it.rot}: </span>}
              {it.desc}
            </div>
          ))}
        </div>
      </div>
      <RodapeIcone escuro={escuro} />
    </div>
  )
}

// Mídia (foto/vídeo) reutilizável.
function Midia({ valores }: { valores: ValoresPeca }) {
  const foto = String(valores.foto || '')
  if (!foto) return <div className="foto-ph">envie uma foto ou vídeo</div>
  const ehVideo = String(valores.foto_kind) === 'video' || foto.startsWith('data:video')
  return ehVideo ? (
    <video className="foto-full" src={foto} style={estiloImagem(valores, 'foto')} autoPlay muted loop playsInline />
  ) : (
    <img className="foto-full" src={foto} alt="" style={estiloImagem(valores, 'foto')} crossOrigin="anonymous" />
  )
}

// 4 · CARD COM FOTO
export function ConectaFotoCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'navy')
  const claro = !ehFundoEscuro(fundo)
  const tag = String(valores.tag || '')
  const sobre = String(valores.sobre || '')
  const titulo = String(valores.titulo || '')
  const apoio = String(valores.apoio || '')
  return (
    <div className={classeCard('conecta-foto', formato, claro)} style={{ width: formato.largura, height: formato.altura, background: claro ? '#FAF9F7' : '#0a1222' }}>
      {claro && <div className="c-barra-topo" />}
      {claro ? <div className="foto-moldura"><Midia valores={valores} /></div> : (<><Midia valores={valores} /><div className="veu" /><div className="veu-base" /></>)}
      <div className="foto-topo" style={claro ? { position: 'absolute', top: 52, left: 52, right: 52 } : undefined}>
        <ConectaLogo escuro cor={logoCor(valores)} altura={92} />
      </div>
      <div className="foto-conteudo">
        {tag && <div className="c-tag" style={estTag(valores)}>{tag}</div>}
        {sobre && <div className="sobre">{sobre}</div>}
        {titulo && <div className="c-titulo" style={{ ['--tf' as string]: fator(valores, 'titulo'), ...(corEscolhida(valores.cor_texto) ? { color: corEscolhida(valores.cor_texto)! } : {}) } as CSSProperties}>{comKw(titulo)}</div>}
        <div className="c-linha" />
        {apoio && <div className="c-apoio" style={{ ['--ta' as string]: fator(valores, 'apoio') } as CSSProperties}>{apoio}</div>}
      </div>
    </div>
  )
}

// 4b · ENCONTRO 1:1
export function ConectaUmAUmCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'navy')
  const claro = !ehFundoEscuro(fundo)
  const badge = String(valores.badge || 'CONECTA 1:1')
  return (
    <div className={classeCard('conecta-1a1', formato, claro)} style={{ width: formato.largura, height: formato.altura, background: claro ? '#FAF9F7' : '#0a1222' }}>
      {claro && <div className="c-barra-topo" />}
      {claro ? <div className="foto-moldura"><Midia valores={valores} /></div> : (<><Midia valores={valores} /><div className="veu08" /></>)}
      <div className="um-topo" style={claro ? { position: 'absolute', top: 52, left: 52, right: 52 } : undefined}>
        <ConectaLogo escuro cor={logoCor(valores)} altura={92} />
      </div>
      <div className="um-base">
        <div className="conecta-1a1-badge">{badge}</div>
        {claro && <ConectaIconeAssinatura escuro={false} tamanho={48} />}
      </div>
    </div>
  )
}

// 4c · CALENDÁRIO
export function ConectaCalendarioCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'navy')
  const escuro = ehFundoEscuro(fundo)
  const tag = String(valores.tag || 'CALENDÁRIO')
  const mes = String(valores.mes || '')
  const ano = String(valores.ano || '')
  const rod = String(valores.rodape || '')
  const numero = String(valores.numero || '')
  const corNum = escuro ? '#00CEC9' : COR_NAVY
  const opNum = escuro ? 0.05 : 0.03
  return (
    <div className={classeCard('conecta-cal', formato, !escuro)} style={{ width: formato.largura, height: formato.altura, background: fundoCss(fundo), color: corTitulo(fundo) }}>
      {!escuro && <div className="c-barra-topo" />}
      <div className="c-topo c-topo--centro">
        <ConectaLogo escuro={escuro} cor={logoCor(valores)} altura={escuro ? 96 : 100} />
      </div>
      <div className="c-miolo">
        {numero && <div className="cal-num" style={{ color: corNum, opacity: opNum }}>{numero}</div>}
        {tag && <div className="c-tag" style={estTag(valores)}>{tag}</div>}
        {mes && <div className="mes" style={estTitulo(valores, fundo, 'mes')}>{mes}</div>}
        {ano && <div className="ano">{ano}</div>}
        <div className="c-linha" style={{ alignSelf: 'center' }} />
        {rod && <div className="rod" style={{ color: corApoio(fundo) }}>{rod}</div>}
      </div>
      <div className="c-rodape" />
    </div>
  )
}

// 4d · CONTEÚDO EDUCATIVO
export function ConectaEducativoCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'navy')
  const escuro = ehFundoEscuro(fundo)
  const tag = String(valores.tag || '')
  const titulo = String(valores.titulo || '')
  const texto = String(valores.texto || '')
  const deslize = String(valores.deslize || '')
  const corAspas = escuro ? '#00CEC9' : COR_NAVY
  const opAspas = escuro ? 0.03 : 0.025
  return (
    <div className={classeCard('conecta-edu', formato, !escuro)} style={{ width: formato.largura, height: formato.altura, background: fundoCss(fundo), color: corTitulo(fundo) }}>
      {!escuro && <div className="c-barra-topo" />}
      <div className="edu-quote" style={{ color: corAspas, opacity: opAspas }}>“</div>
      <div className="c-topo c-topo--centro">
        <ConectaLogo escuro={escuro} cor={logoCor(valores)} altura={escuro ? 84 : 88} />
      </div>
      <div className="c-miolo">
        {tag && <div className="c-tag" style={estTag(valores)}>{tag}</div>}
        {titulo && <div className="c-titulo" style={estTitulo(valores, fundo)}>{comKw(titulo)}</div>}
        <div className="c-linha" />
        {texto && <div className="c-apoio" style={estCorpo(valores, fundo, 'texto')}>{comKw(texto)}</div>}
      </div>
      <div className="c-rodape">
        {deslize && <span className="c-deslize" style={{ color: corApoio(fundo) }}>{deslize}</span>}
      </div>
    </div>
  )
}

// 5 · FRASE DE VIRADA
export function ConectaFraseCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'navy')
  const escuro = ehFundoEscuro(fundo)
  const frase = String(valores.frase || '')
  const corAspas = escuro ? '#00CEC9' : COR_NAVY
  return (
    <div className={classeCard('conecta-frase', formato, !escuro)} style={{ width: formato.largura, height: formato.altura, background: fundoCss(fundo), color: corTitulo(fundo) }}>
      {!escuro && <div className="c-barra-topo" />}
      <div className="c-aspas" style={{ color: corAspas }}>“</div>
      <div className="c-miolo">
        {frase && <div className="frase" style={estTitulo(valores, fundo, 'frase')}>{comKw(frase)}</div>}
      </div>
      <RodapeIcone escuro={escuro} />
    </div>
  )
}

// 6 · CTA FINAL
export function ConectaCtaCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'cta')
  const escuro = ehFundoEscuro(fundo)
  const tag = String(valores.tag || '')
  const frase = String(valores.frase || '')
  const exclusivo = String(valores.exclusivo || '')
  return (
    <div className={classeCard('conecta-cta', formato, !escuro)} style={{ width: formato.largura, height: formato.altura, background: fundoCss(fundo), color: corTitulo(fundo) }}>
      {!escuro && <div className="c-barra-topo" />}
      <div className="c-topo c-topo--centro">
        <ConectaLogo escuro={escuro} cor={logoCor(valores)} altura={escuro ? 116 : 120} />
      </div>
      <div className="c-miolo">
        {tag && <div className="c-tag" style={{ ...estTag(valores), marginBottom: 26 }}>{tag}</div>}
        {frase && <div className="frase" style={estTitulo(valores, fundo, 'frase')}>{comKw(frase)}</div>}
        {exclusivo && <div className="exclusivo" style={{ color: corApoio(fundo) }}>{exclusivo}</div>}
      </div>
      <div className="c-rodape" />
    </div>
  )
}

// 7 · FEEDBACK
export function ConectaFeedbackCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'navy')
  const escuro = ehFundoEscuro(fundo)
  const nome = String(valores.nome || '')
  const subtitulo = String(valores.subtitulo || '')
  const texto = String(valores.texto || '')
  const tag = String(valores.rotulo || 'FEEDBACK')
  const nota = Math.max(1, Math.min(5, Number(valores.nota) || 5))
  const inicial = (String(valores.inicial || '').trim() || nome.trim().slice(0, 1)).toUpperCase()
  const stars = '★'.repeat(nota) + '☆'.repeat(5 - nota)
  return (
    <div className={classeCard('conecta-fb', formato, !escuro)} style={{ width: formato.largura, height: formato.altura, background: fundoCss(fundo), color: corTitulo(fundo) }}>
      {!escuro && <div className="c-barra-topo" />}
      <div className="c-topo c-topo--centro">
        <ConectaLogo escuro={escuro} cor={logoCor(valores)} altura={escuro ? 88 : 92} />
      </div>
      <div className="c-miolo">
        {tag && <div className="c-tag" style={estTag(valores)}>{tag}</div>}
        <div className="conecta-fb-box">
          <div className="head">
            <div className="av">{inicial}</div>
            <div>
              {nome && <div className="nm">{nome}</div>}
              {subtitulo && <div className="rl">{subtitulo}</div>}
            </div>
          </div>
          <div className="stars">{stars}</div>
          {texto && <div className="depo">{texto}</div>}
        </div>
      </div>
      <div className="c-rodape" />
    </div>
  )
}

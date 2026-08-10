import type { ReactNode } from 'react'
import type { RenderProps } from '../types'
import { estiloImagem } from '../imagem'
import { ConectaLogo, ConectaIconeAssinatura } from './ConectaLogo'
import { fundoCss, corTitulo, corApoio, ehFundoEscuro, COR_NAVY } from './cores'
import './conecta.css'

// ============================================================================
// Cards do Conecta — Design System oficial para Instagram (ago/2026).
// Sora · Navy + Turquesa · tipografia light+bold · tag/linha/número editoriais.
// ============================================================================

// A keyword (entre aspas ou *asteriscos*) vira 700 turquesa — a assinatura do
// sistema (título light + keyword bold).
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

function RodapeIcone({ escuro }: { escuro: boolean }) {
  return (
    <div className="c-rodape">
      <ConectaIconeAssinatura escuro={escuro} tamanho={54} />
    </div>
  )
}

// 1 · CAPA — logo centralizado, tag, título light, linha, subtítulo, deslize.
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
        <ConectaLogo escuro={escuro} altura={escuro ? 104 : 108} />
      </div>
      <div className="c-miolo">
        {tag && <div className="c-tag">{tag}</div>}
        {titulo && <div className="c-titulo">{comKw(titulo)}</div>}
        <div className="c-linha" style={{ alignSelf: 'center' }} />
        {sub && <div className="c-apoio" style={{ color: corApoio(fundo) }}>{comKw(sub)}</div>}
      </div>
      <div className="c-rodape">
        {deslize && <span className="c-deslize" style={{ color: corApoio(fundo) }}>{deslize}</span>}
      </div>
    </div>
  )
}

// 2 · CONTEÚDO (slide interno) — logo + número, tag, título light, linha, apoio.
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
        <ConectaLogo escuro={escuro} altura={escuro ? 88 : 92} />
        {numero && <div className="c-num">{numero}</div>}
      </div>
      <div className="c-miolo">
        {tag && <div className="c-tag">{tag}</div>}
        {titulo && <div className="c-titulo">{comKw(titulo)}</div>}
        <div className="c-linha" />
        {texto && <div className="c-apoio" style={{ color: corApoio(fundo) }}>{comKw(texto)}</div>}
      </div>
      <RodapeIcone escuro={escuro} />
    </div>
  )
}

// 3 · LISTA (valores / objetivos) — tag + título + itens "Rótulo: descrição".
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
        <ConectaLogo escuro={escuro} altura={escuro ? 88 : 92} />
      </div>
      <div className="c-miolo">
        {tag && <div className="c-tag">{tag}</div>}
        {titulo && <div className="c-titulo" style={{ marginBottom: 10 }}>{comKw(titulo)}</div>}
        <div className="c-linha" />
        <div className="conecta-lista-itens" style={{ color: corApoio(fundo) }}>
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

// 4 · CARD COM FOTO — foto full-bleed (escuro) OU emoldurada (claro/warm).
export function ConectaFotoCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'navy')
  const claro = !ehFundoEscuro(fundo)
  const foto = String(valores.foto || '')
  const tag = String(valores.tag || '')
  const sobre = String(valores.sobre || '')
  const titulo = String(valores.titulo || '')
  const apoio = String(valores.apoio || '')
  const ehVideo = String(valores.foto_kind) === 'video' || foto.startsWith('data:video')

  const midia = foto ? (
    ehVideo ? (
      <video className="foto-full" src={foto} style={estiloImagem(valores, 'foto')} autoPlay muted loop playsInline />
    ) : (
      <img className="foto-full" src={foto} alt="" style={estiloImagem(valores, 'foto')} crossOrigin="anonymous" />
    )
  ) : (
    <div className="foto-ph">envie uma foto ou vídeo</div>
  )

  return (
    <div className={classeCard('conecta-foto', formato, claro)} style={{ width: formato.largura, height: formato.altura, background: claro ? '#FAF9F7' : '#0a1222' }}>
      {claro && <div className="c-barra-topo" />}
      {claro ? (
        <div className="foto-moldura">{midia}</div>
      ) : (
        <>
          {midia}
          <div className="veu" />
          <div className="veu-base" />
        </>
      )}
      <div className="foto-topo" style={claro ? { position: 'absolute', top: 52, left: 52, right: 52 } : undefined}>
        <ConectaLogo escuro altura={92} />
      </div>
      <div className="foto-conteudo">
        {tag && <div className="c-tag">{tag}</div>}
        {sobre && <div className="sobre">{sobre}</div>}
        {titulo && <div className="c-titulo">{comKw(titulo)}</div>}
        <div className="c-linha" />
        {apoio && <div className="c-apoio">{apoio}</div>}
      </div>
    </div>
  )
}

// 4b · ENCONTRO 1:1 — foto + badge "CONECTA 1:1" (sem título, sem nomes).
export function ConectaUmAUmCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'navy')
  const claro = !ehFundoEscuro(fundo)
  const foto = String(valores.foto || '')
  const badge = String(valores.badge || 'CONECTA 1:1')
  const ehVideo = String(valores.foto_kind) === 'video' || foto.startsWith('data:video')
  const midia = foto ? (
    ehVideo ? (
      <video className="foto-full" src={foto} style={estiloImagem(valores, 'foto')} autoPlay muted loop playsInline />
    ) : (
      <img className="foto-full" src={foto} alt="" style={estiloImagem(valores, 'foto')} crossOrigin="anonymous" />
    )
  ) : (
    <div className="foto-ph">envie uma foto ou vídeo</div>
  )
  return (
    <div className={classeCard('conecta-1a1', formato, claro)} style={{ width: formato.largura, height: formato.altura, background: claro ? '#FAF9F7' : '#0a1222' }}>
      {claro && <div className="c-barra-topo" />}
      {claro ? <div className="foto-moldura">{midia}</div> : (<>{midia}<div className="veu08" /></>)}
      <div className="um-topo" style={claro ? { position: 'absolute', top: 52, left: 52, right: 52 } : undefined}>
        <ConectaLogo escuro altura={92} />
      </div>
      <div className="um-base">
        <div className="conecta-1a1-badge">{badge}</div>
        {claro && <ConectaIconeAssinatura escuro={false} tamanho={48} />}
      </div>
    </div>
  )
}

// 4c · CALENDÁRIO — mês grande, ano turquesa, número gigante ao fundo.
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
        <ConectaLogo escuro={escuro} altura={escuro ? 96 : 100} />
      </div>
      <div className="c-miolo">
        {numero && <div className="cal-num" style={{ color: corNum, opacity: opNum }}>{numero}</div>}
        {tag && <div className="c-tag">{tag}</div>}
        {mes && <div className="mes">{mes}</div>}
        {ano && <div className="ano">{ano}</div>}
        <div className="c-linha" style={{ alignSelf: 'center' }} />
        {rod && <div className="rod" style={{ color: corApoio(fundo) }}>{rod}</div>}
      </div>
      <div className="c-rodape" />
    </div>
  )
}

// 4d · CONTEÚDO EDUCATIVO — aspas decorativas + título light + "Deslize →".
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
        <ConectaLogo escuro={escuro} altura={escuro ? 84 : 88} />
      </div>
      <div className="c-miolo">
        {tag && <div className="c-tag">{tag}</div>}
        {titulo && <div className="c-titulo">{comKw(titulo)}</div>}
        <div className="c-linha" />
        {texto && <div className="c-apoio" style={{ color: corApoio(fundo) }}>{comKw(texto)}</div>}
      </div>
      <div className="c-rodape">
        {deslize && <span className="c-deslize" style={{ color: corApoio(fundo) }}>{deslize}</span>}
      </div>
    </div>
  )
}

// 5 · FRASE DE VIRADA — aspas decorativas + frase centralizada (keyword bold).
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
        {frase && <div className="frase">{comKw(frase)}</div>}
      </div>
      <RodapeIcone escuro={escuro} />
    </div>
  )
}

// 6 · CTA FINAL — logo grande, tag, frase conceitual, tom de exclusividade.
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
        <ConectaLogo escuro={escuro} altura={escuro ? 116 : 120} />
      </div>
      <div className="c-miolo">
        {tag && <div className="c-tag" style={{ marginBottom: 26 }}>{tag}</div>}
        {frase && <div className="frase">{comKw(frase)}</div>}
        {exclusivo && <div className="exclusivo" style={{ color: corApoio(fundo) }}>{exclusivo}</div>}
      </div>
      <div className="c-rodape" />
    </div>
  )
}

// 7 · FEEDBACK — prova social (box branco, avatar, estrelas).
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
        <ConectaLogo escuro={escuro} altura={escuro ? 88 : 92} />
      </div>
      <div className="c-miolo">
        {tag && <div className="c-tag">{tag}</div>}
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

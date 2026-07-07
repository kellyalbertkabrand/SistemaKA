import type { ReactNode } from 'react'
import type { RenderProps } from '../types'
import { estiloImagem } from '../imagem'
import { hexFundoKA, corTextoKA, corDestaqueKA, COR_MARINHO } from './cores'
import './ka.css'

// ============================================================================
// Cards da KA | Inteligência para Marcas — padrão visual unificado dos
// carrosséis (educativo, notícias e desenhos): card 1080×1350, padding 80px,
// cabeçalho e rodapé fixos, três fundos oficiais e destaque em caramelo.
// ============================================================================

// Converte *destaque* em <strong> peso 900 na cor de destaque (nunca itálico).
// Se a frase termina na palavra destacada, o ponto final entra no asterisco.
function comDestaque(texto: string, cor: string) {
  return texto.split('*').map((p, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="ka-destaque" style={{ color: cor }}>
        {p}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  )
}

// Moldura comum: fundo oficial, cor de texto derivada, cabeçalho e rodapé.
function KaFrame({
  fundo,
  classe,
  formato,
  children,
}: {
  fundo: string
  classe: string
  formato: RenderProps['formato']
  children: ReactNode
}) {
  return (
    <div
      className={`ka-card ${classe}`}
      style={{
        width: formato.largura,
        height: formato.altura,
        background: hexFundoKA(fundo),
        color: corTextoKA(fundo),
      }}
    >
      <div className="ka-header">
        <strong>KA | Inteligência para Marcas</strong> · Branding · Posicionamento · IA
      </div>
      <div className="ka-miolo">{children}</div>
      <div className="ka-footer">Kelly Albert</div>
    </div>
  )
}

// 1 · Capa — o gancho do carrossel, título grande em Playfair.
export function KaCapaCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'marinho')
  const titulo = String(valores.titulo || '')
  return (
    <KaFrame fundo={fundo} classe="ka-capa" formato={formato}>
      {titulo && <div className="titulo">{comDestaque(titulo, corDestaqueKA(fundo))}</div>}
    </KaFrame>
  )
}

// 2 · Texto — desenvolvimento (afirmação, virada, insight).
export function KaTextoCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'bege')
  const titulo = String(valores.titulo || '')
  const texto = String(valores.texto || '')
  const destaque = corDestaqueKA(fundo)
  return (
    <KaFrame fundo={fundo} classe="ka-texto" formato={formato}>
      {titulo && <div className="titulo">{comDestaque(titulo, destaque)}</div>}
      {texto && <div className="corpo">{comDestaque(texto, destaque)}</div>}
    </KaFrame>
  )
}

// 3 · Passo numerado — número grande em caramelo acima do texto.
export function KaPassoCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'bege')
  const numero = String(valores.numero || '')
  const texto = String(valores.texto || '')
  const destaque = corDestaqueKA(fundo)
  return (
    <KaFrame fundo={fundo} classe="ka-passo" formato={formato}>
      {numero && (
        <div className="numero" style={{ color: destaque }}>
          {numero}
        </div>
      )}
      {texto && <div className="corpo">{comDestaque(texto, destaque)}</div>}
    </KaFrame>
  )
}

// Proporções fixas da área de mídia do carrossel de notícias.
const PROPORCOES: Record<string, { largura: number; altura: number }> = {
  '16:9': { largura: 920, altura: 517 },
  '1:1': { largura: 680, altura: 680 },
  '9:16': { largura: 450, altura: 800 },
}

// 4 · Mídia — texto + imagem/print como prova (notícias e análises).
// Horizontal e quadrada: texto em cima, mídia centralizada embaixo.
// Vertical 9:16: texto à esquerda, mídia à direita.
export function KaMidiaCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'bege')
  const texto = String(valores.texto || '')
  const midia = String(valores.midia || '')
  const prop = String(valores.proporcao || '16:9')
  const base = PROPORCOES[prop] ?? PROPORCOES['16:9']

  // Largura e altura da área controladas separadamente (40–140%).
  const fLarg = Math.min(140, Math.max(40, Number(valores.midia_larg) || 100)) / 100
  const fAlt = Math.min(140, Math.max(40, Number(valores.midia_alt) || 100)) / 100
  const w = Math.round(base.largura * fLarg)
  const h = Math.round(base.altura * fAlt)
  const ehVideo = midia.startsWith('data:video')
  const estiloMidia = { ...estiloImagem(valores, 'midia'), height: '100%' as const }

  return (
    <KaFrame
      fundo={fundo}
      classe={`ka-midia ${prop === '9:16' ? 'vertical' : ''}`}
      formato={formato}
    >
      {texto && <div className="texto">{comDestaque(texto, corDestaqueKA(fundo))}</div>}
      <div className="midia-frame" style={{ width: w, height: h }}>
        {midia ? (
          ehVideo ? (
            <video src={midia} style={estiloMidia} autoPlay muted loop playsInline />
          ) : (
            <img src={midia} alt="" style={estiloMidia} crossOrigin="anonymous" />
          )
        ) : (
          <div className="midia-ph">
            <div>área da mídia ({prop})</div>
            <div className="dim">
              {w} × {h} px
            </div>
          </div>
        )}
      </div>
    </KaFrame>
  )
}

// 5 · Comentário — texto + card branco com @usuário e a fala (print de texto).
export function KaComentarioCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'marinho')
  const texto = String(valores.texto || '')
  const usuario = String(valores.usuario || '')
  const comentario = String(valores.comentario || '')
  return (
    <KaFrame fundo={fundo} classe="ka-comentario" formato={formato}>
      {texto && <div className="texto">{comDestaque(texto, corDestaqueKA(fundo))}</div>}
      <div className="box">
        {usuario && <div className="usuario">{usuario}</div>}
        {comentario && <div className="fala">{comentario}</div>}
      </div>
    </KaFrame>
  )
}

// 7 · Card de Feedback — prova social no modelo de review do Google (skill
// card-feedback-ka): logo KA + "FEEDBACK ;)" + box branco com avatar, nome,
// estrelas douradas e o depoimento. Fonte Outfit; não usa a moldura dos
// carrosséis. Em fundo bege, logo e textos externos ficam escuros.
export function KaFeedbackCard({ valores, formato }: RenderProps) {
  const fundo = String(valores.cor_fundo || 'caramelo')
  const nome = String(valores.nome || '')
  const subtitulo = String(valores.subtitulo || '')
  const texto = String(valores.texto || '')
  const rotulo = String(valores.rotulo || '')
  const nota = Math.max(1, Math.min(5, Number(valores.nota) || 5))
  const inicial = (String(valores.inicial || '').trim() || nome.trim().slice(0, 1)).toUpperCase()

  const escuro = fundo !== 'bege'
  const fg = escuro ? '#FFFFFF' : COR_MARINHO
  const logo = escuro ? '/clientes/ka/ka-branco.png' : '/clientes/ka/ka-preto.png'
  const stars = '★'.repeat(nota) + '☆'.repeat(5 - nota)

  return (
    <div
      className="ka-fb"
      style={{ width: formato.largura, height: formato.altura, background: hexFundoKA(fundo), color: fg }}
    >
      <div className="main">
        <img className="logo" src={logo} alt="KA" crossOrigin="anonymous" />
        {rotulo && <div className="rotulo">{rotulo}</div>}
        <div className="box">
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
      <div className="footer">Kelly Albert</div>
    </div>
  )
}

// 6 · CTA — card 10, sempre no modelo do carrossel de desenhos: fundo bege,
// frase + nome do produto grande + botão pill de contorno caramelo.
export function KaCtaCard({ valores, formato }: RenderProps) {
  const frase = String(valores.frase || '')
  const produto = String(valores.produto || '')
  const botao = String(valores.botao || '')
  return (
    <KaFrame fundo="bege" classe="ka-cta" formato={formato}>
      {frase && <div className="frase">{comDestaque(frase, corDestaqueKA('bege'))}</div>}
      {produto && <div className="produto">{produto}</div>}
      {botao && <div className="botao">{botao}</div>}
    </KaFrame>
  )
}

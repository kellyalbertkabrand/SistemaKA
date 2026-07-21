import type { CSSProperties } from 'react'

// Renderiza a mídia do cliente: <video> quando o arquivo carregado é um vídeo
// (data:video…), senão <img>. Mesmo estilo de enquadramento (estiloImagem) e
// mesma classe da foto — assim os cards da Shapes aceitam foto OU vídeo sem
// mudar o layout. O export (exportarVideo.ts) acha o <video> pelo pai.
export function Midia({
  src,
  className,
  style,
}: {
  src: string
  className?: string
  style?: CSSProperties
}) {
  if (src.startsWith('data:video')) {
    return <video className={className} src={src} style={style} autoPlay muted loop playsInline />
  }
  return <img className={className} src={src} alt="" style={style} crossOrigin="anonymous" />
}

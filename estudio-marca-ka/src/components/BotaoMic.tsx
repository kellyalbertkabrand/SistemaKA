// Botão de ditado por voz (usado nas Atividades). Fica vermelho pulsando
// enquanto grava.
export function BotaoMic({
  gravando,
  onClick,
  titulo,
}: {
  gravando: boolean
  onClick: () => void
  titulo?: string
}) {
  return (
    <button
      type="button"
      className={`btn-mic ${gravando ? 'btn-mic--on' : ''}`}
      onClick={onClick}
      title={titulo ?? (gravando ? 'Parar de gravar' : 'Ditar por voz')}
      aria-label={gravando ? 'Parar de gravar' : 'Ditar por voz'}
    >
      <span className="btn-mic__ico" aria-hidden>
        {gravando ? '⏹' : '🎤'}
      </span>
      <span className="btn-mic__txt">{gravando ? 'Parar' : 'Falar'}</span>
    </button>
  )
}

// Reconhecimento de voz pelo navegador (Web Speech API), em pt-BR.
// Funciona bem no Chrome (desktop e Android). Onde não houver suporte,
// o painel oferece o campo de texto como alternativa.

export function reconhecimentoDisponivel() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

// Inicia a escuta. Retorna o objeto de reconhecimento (para poder cancelar).
export function ouvir({ onResultado, onErro, onFim } = {}) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    onErro && onErro('indisponivel');
    return null;
  }
  const rec = new SR();
  rec.lang = 'pt-BR';
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  rec.onresult = (e) => {
    const texto = e.results?.[0]?.[0]?.transcript ?? '';
    onResultado && onResultado(texto.trim());
  };
  rec.onerror = (e) => onErro && onErro(e.error || 'erro');
  rec.onend = () => onFim && onFim();

  rec.start();
  return rec;
}

// Reconhecimento de voz pelo navegador (Web Speech API), em pt-BR.
// Modo contínuo: fica ouvindo até a arquiteta clicar em "Parar".
// Funciona bem no Chrome (desktop e Android). Onde não houver suporte,
// o painel oferece o campo de texto como alternativa.

export function reconhecimentoDisponivel() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

// Inicia a escuta contínua.
//   onParcial(texto)  -> chamado enquanto ela fala (texto acumulado ao vivo)
//   onFim(textoFinal) -> chamado quando a gravação termina (clique em Parar)
//   onErro(codigo)
// Retorna o objeto de reconhecimento (chame .stop() para encerrar).
export function ouvir({ onParcial, onFim, onErro } = {}) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    onErro && onErro('indisponivel');
    return null;
  }
  const rec = new SR();
  rec.lang = 'pt-BR';
  rec.continuous = true;       // não para na primeira pausa
  rec.interimResults = true;   // mostra o texto aparecendo enquanto fala

  let finalizado = '';

  rec.onresult = (e) => {
    let parcial = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const trecho = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalizado += trecho + ' ';
      else parcial += trecho;
    }
    onParcial && onParcial((finalizado + parcial).trim());
  };

  // Alguns navegadores encerram sozinhos após um tempo de silêncio.
  // Se ainda estivermos "gravando", reinicia para manter a escuta contínua.
  rec.onend = () => {
    if (rec._parar) {
      onFim && onFim(finalizado.trim());
    } else {
      try { rec.start(); } catch { onFim && onFim(finalizado.trim()); }
    }
  };

  rec.onerror = (e) => {
    const err = e.error || 'erro';
    // "no-speech"/"aborted" não são erros graves; deixamos o onend cuidar.
    if (err !== 'no-speech' && err !== 'aborted') {
      onErro && onErro(err);
    }
  };

  rec.start();
  return rec;
}

// Encerra de vez (marca a flag para o onend não reiniciar).
export function parar(rec) {
  if (!rec) return;
  rec._parar = true;
  try { rec.stop(); } catch { /* ignora */ }
}

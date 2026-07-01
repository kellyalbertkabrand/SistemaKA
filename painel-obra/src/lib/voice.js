// Reconhecimento de voz pelo navegador (Web Speech API), em pt-BR.
// Modo contínuo e ACUMULATIVO: fica ouvindo e vai juntando tudo que a
// arquiteta fala (sem apagar o anterior nas pausas), até ela clicar em "Parar".
// Funciona bem no Chrome (desktop e Android). Onde não houver suporte,
// o painel oferece o campo de texto como alternativa.

export function reconhecimentoDisponivel() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

// Inicia a escuta contínua.
//   onParcial(texto)  -> texto acumulado ao vivo (o que ela já falou até agora)
//   onFim(textoFinal) -> chamado quando encerra (clique em "Parar")
//   onErro(codigo)
// Retorna o objeto de reconhecimento (use parar(rec) para encerrar).
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

  // "confirmado" guarda tudo o que já foi capturado em pausas/reinícios
  // anteriores. "sessao" é o que está sendo dito agora nesta rodada.
  let confirmado = '';
  let sessao = '';

  const textoAtual = () => (confirmado + ' ' + sessao).replace(/\s+/g, ' ').trim();

  rec.onresult = (e) => {
    // Reconstrói o texto da sessão atual inteiro (final + provisório),
    // então nada do que ela já falou nesta rodada se perde.
    let s = '';
    for (let i = 0; i < e.results.length; i++) {
      s += e.results[i][0].transcript;
      if (e.results[i].isFinal) s += ' ';
    }
    sessao = s;
    onParcial && onParcial(textoAtual());
  };

  rec.onend = () => {
    // Fecha a rodada: move tudo que foi capturado para "confirmado".
    confirmado = textoAtual();
    sessao = '';
    if (rec._parar) {
      onFim && onFim(confirmado);
    } else {
      // O Chrome encerra sozinho após um silêncio — reiniciamos para manter
      // a escuta contínua, sem perder o que já foi dito.
      try { rec.start(); } catch { onFim && onFim(confirmado); }
    }
  };

  rec.onerror = (e) => {
    const err = e.error || 'erro';
    // "no-speech"/"aborted" são normais em pausas; o onend cuida do reinício.
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

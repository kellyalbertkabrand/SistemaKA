// Reconhecimento de voz pelo navegador (Web Speech API), em pt-BR.
// Modo contínuo e ACUMULATIVO: junta cada frase confirmada assim que ela
// fecha e nunca descarta o que já foi dito — nem nas pausas/reinícios.
// Funciona bem no Chrome (desktop e Android). Onde não houver suporte,
// o painel oferece o campo de texto como alternativa.

export function reconhecimentoDisponivel() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

function juntar(a, b) {
  return `${a} ${b}`.replace(/\s+/g, ' ').trim();
}

// Inicia a escuta contínua.
//   onParcial(texto)  -> texto acumulado ao vivo
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
  rec.continuous = true;
  rec.interimResults = true;

  let acumulado = ''; // tudo que já foi confirmado (persiste entre reinícios)
  let provisorio = ''; // o que está sendo dito agora (ainda não confirmado)

  const mostrar = () => onParcial && onParcial(juntar(acumulado, provisorio));

  rec.onresult = (e) => {
    provisorio = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const trecho = e.results[i][0].transcript;
      if (e.results[i].isFinal) {
        acumulado = juntar(acumulado, trecho); // confirma e nunca mais apaga
      } else {
        provisorio += trecho;
      }
    }
    mostrar();
  };

  rec.onend = () => {
    // Antes de reiniciar/terminar, confirma o que estava no provisório,
    // para não perder a última palavra dita antes de uma pausa.
    if (provisorio) {
      acumulado = juntar(acumulado, provisorio);
      provisorio = '';
    }
    if (rec._parar) {
      onFim && onFim(acumulado);
    } else {
      try { rec.start(); } catch { onFim && onFim(acumulado); }
    }
  };

  rec.onerror = (e) => {
    const err = e.error || 'erro';
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

// Otimização de imagem NO NAVEGADOR. As fotos e notas fiscais são guardadas
// já comprimidas dentro do próprio banco (Firestore) como "data URL" — assim o
// sistema não depende do Storage e o arquivo nunca fica pesado.

// Reduz QUALQUER imagem (de qualquer tamanho) a um JPEG leve de internet,
// buscando ficar abaixo de `alvoBytes`. Devolve um data URL (string).
export async function comprimirParaDataURL(file, alvoBytes = 360_000, maxLado = 1280) {
  const bitmap = await carregarImagem(file); // pode lançar (formato não suportado)
  const lw = bitmap.width || bitmap.naturalWidth;
  const lh = bitmap.height || bitmap.naturalHeight;
  if (!lw || !lh) { bitmap.close?.(); throw new Error('Imagem inválida.'); }

  const desenhar = (lado) => {
    const escala = Math.min(1, lado / Math.max(lw, lh));
    const w = Math.max(1, Math.round(lw * escala));
    const h = Math.max(1, Math.round(lh * escala));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h); // fundo branco (PNG transparente vira branco no JPEG)
    ctx.drawImage(bitmap, 0, 0, w, h);
    return canvas;
  };

  // Tenta combinações de tamanho x qualidade até caber no alvo; guarda a menor.
  let menor = null;
  for (const lado of [maxLado, 1024, 800]) {
    const canvas = desenhar(lado);
    for (const q of [0.72, 0.62, 0.52, 0.44]) {
      const url = canvas.toDataURL('image/jpeg', q);
      if (!menor || url.length < menor.length) menor = url;
      if (dataURLBytes(url) <= alvoBytes) { bitmap.close?.(); return url; }
    }
  }
  bitmap.close?.();
  return menor;
}

// Tamanho em bytes do conteúdo de um data URL base64.
export function dataURLBytes(dataUrl) {
  const i = String(dataUrl).indexOf(',');
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  const pad = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - pad;
}

// Lê um arquivo qualquer (ex.: PDF) como data URL.
export function arquivoParaDataURL(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    fr.readAsDataURL(file);
  });
}

// Converte um data URL em Blob (para abrir em nova aba / baixar sem estourar
// o limite de tamanho de URL do navegador).
export function dataURLParaBlob(dataUrl) {
  const [cab, b64] = String(dataUrl).split(',');
  const tipo = (cab.match(/data:([^;]+)/) || [])[1] || 'application/octet-stream';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: tipo });
}

function carregarImagem(file) {
  if (window.createImageBitmap) {
    return createImageBitmap(file).catch(() => carregarViaTag(file));
  }
  return carregarViaTag(file);
}

function carregarViaTag(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve(img); URL.revokeObjectURL(url); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

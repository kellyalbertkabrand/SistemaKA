// Comprime/redimensiona a imagem NO NAVEGADOR antes de enviar ao Storage.
// Fotos de celular têm vários MB; reduzir o lado maior para ~1600px e salvar
// como JPEG deixa o upload muito mais rápido (e mais barato de armazenar).
// Qualquer falha (ex.: formato exótico) devolve o arquivo original.
export async function comprimirImagem(file, maxLado = 1600, qualidade = 0.8) {
  if (!file || !String(file.type).startsWith('image/')) return file;
  try {
    const bitmap = await carregarImagem(file);
    const lw = bitmap.width || bitmap.naturalWidth;
    const lh = bitmap.height || bitmap.naturalHeight;
    if (!lw || !lh) { bitmap.close?.(); return file; }

    const escala = Math.min(1, maxLado / Math.max(lw, lh));
    // Já é pequena e leve: não vale reprocessar.
    if (escala >= 1 && file.size < 1_200_000) { bitmap.close?.(); return file; }

    const w = Math.round(lw * escala);
    const h = Math.round(lh * escala);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    // toBlob pode travar em imagens gigantes/formatos exóticos: limite de 8s.
    const blob = await Promise.race([
      new Promise((res) => canvas.toBlob(res, 'image/jpeg', qualidade)),
      new Promise((res) => setTimeout(() => res(null), 8000)),
    ]);
    if (!blob || blob.size >= file.size) return file; // travou/não melhorou? original
    const nome = file.name.replace(/\.(png|webp|heic|heif|bmp|gif|jpeg)$/i, '.jpg');
    return new File([blob], nome.endsWith('.jpg') ? nome : nome + '.jpg', {
      type: 'image/jpeg',
      lastModified: file.lastModified || Date.now(),
    });
  } catch {
    return file;
  }
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

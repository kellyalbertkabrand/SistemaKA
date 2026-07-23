import { dataURLParaBlob } from './imagem.js';

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Visualizador de UM anexo (nota fiscal): abre grande na própria tela — imagem
// ou PDF — com botão de baixar. Fecha no ×, no fundo ou Esc.
export function abrirAnexo(dado, nome) {
  if (!dado) return;
  const ehPdf = /^data:application\/pdf/i.test(dado) || /\.pdf(\?|$)/i.test(String(nome || dado));
  let obj = dado;
  try { obj = URL.createObjectURL(dataURLParaBlob(dado)); } catch { obj = dado; }
  const criouObj = obj !== dado;

  const ov = document.createElement('div');
  ov.className = 'lightbox';
  ov.innerHTML = `
    <button class="lb-fechar" aria-label="Fechar">×</button>
    <div class="lb-anexo">
      ${ehPdf
        ? `<iframe class="lb-pdf" src="${obj}" title="${esc(nome || 'Nota fiscal')}"></iframe>`
        : `<img class="lb-img" src="${obj}" alt="${esc(nome || 'Nota fiscal')}" />`}
    </div>
    <div class="lb-barra">
      <span class="lb-nome">${esc(nome || 'Nota fiscal')}</span>
      <button class="lb-baixar">⬇ Baixar</button>
    </div>`;
  document.body.appendChild(ov);
  document.body.style.overflow = 'hidden';

  const fechar = () => {
    ov.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    if (criouObj) setTimeout(() => URL.revokeObjectURL(obj), 1000);
  };
  const onKey = (e) => { if (e.key === 'Escape') fechar(); };
  ov.querySelector('.lb-fechar').addEventListener('click', fechar);
  ov.querySelector('.lb-baixar').addEventListener('click', () => baixarImagem(dado, nome || 'nota-fiscal'));
  ov.addEventListener('click', (e) => { if (e.target === ov || e.target.classList.contains('lb-anexo')) fechar(); });
  document.addEventListener('keydown', onKey);
}

// Visualizador de imagens em tela cheia (carrossel): setas ‹ ›, teclado
// (Esc/←/→), contador, legenda (data + descrição) e botão de baixar.
// itens: [{ url, nome, data, texto }]
export function abrirLightbox(itens, inicio = 0) {
  if (!itens || !itens.length) return;
  let i = Math.max(0, Math.min(inicio, itens.length - 1));

  const ov = document.createElement('div');
  ov.className = 'lightbox';
  ov.innerHTML = `
    <button class="lb-fechar" aria-label="Fechar">×</button>
    <button class="lb-nav lb-prev" aria-label="Anterior">‹</button>
    <figure class="lb-fig">
      <img class="lb-img" alt="" />
      <figcaption class="lb-cap"></figcaption>
    </figure>
    <button class="lb-nav lb-next" aria-label="Próxima">›</button>
    <div class="lb-barra">
      <span class="lb-contador"></span>
      <button class="lb-baixar">⬇ Baixar</button>
    </div>`;
  document.body.appendChild(ov);
  document.body.style.overflow = 'hidden';

  const img = ov.querySelector('.lb-img');
  const cap = ov.querySelector('.lb-cap');
  const contador = ov.querySelector('.lb-contador');
  const prevBtn = ov.querySelector('.lb-prev');
  const nextBtn = ov.querySelector('.lb-next');
  const umSo = itens.length <= 1;
  prevBtn.style.display = nextBtn.style.display = umSo ? 'none' : '';

  const mostrar = () => {
    const it = itens[i];
    img.src = it.url;
    img.alt = it.nome || 'foto';
    cap.textContent = [it.data, it.texto].filter(Boolean).join(' — ');
    cap.style.display = cap.textContent ? '' : 'none';
    contador.textContent = umSo ? '' : `${i + 1} / ${itens.length}`;
  };
  const prev = () => { i = (i - 1 + itens.length) % itens.length; mostrar(); };
  const next = () => { i = (i + 1) % itens.length; mostrar(); };
  const fechar = () => {
    ov.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => {
    if (e.key === 'Escape') fechar();
    else if (e.key === 'ArrowLeft') prev();
    else if (e.key === 'ArrowRight') next();
  };

  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);
  ov.querySelector('.lb-fechar').addEventListener('click', fechar);
  ov.querySelector('.lb-baixar').addEventListener('click', () => baixarImagem(itens[i].url, itens[i].nome));
  ov.addEventListener('click', (e) => { if (e.target === ov || e.target.classList.contains('lb-fig')) fechar(); });
  document.addEventListener('keydown', onKey);
  mostrar();
}

// Baixa a imagem. Tenta via fetch->blob (download direto); se o CORS do Storage
// bloquear, abre em nova aba para o usuário salvar manualmente.
export async function baixarImagem(url, nome) {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error('http');
    const blob = await r.blob();
    const objurl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objurl;
    a.download = nome || 'foto.jpg';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objurl);
  } catch {
    window.open(url, '_blank', 'noopener');
  }
}

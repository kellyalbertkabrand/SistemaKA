// Identidade visual do escritório (Schramm Arquitetura e Engenharia).
// O emblema abaixo é uma INTERPRETAÇÃO do monograma da marca — quando a
// arquiteta enviar o arquivo oficial (PNG/SVG), basta trocar por uma <img>.

export function emblemaSchramm(classe = '') {
  return `<svg class="emblema ${classe}" viewBox="0 0 64 64" fill="none"
    stroke="currentColor" stroke-width="3" stroke-linecap="round"
    stroke-linejoin="round" aria-hidden="true">
    <rect x="6.5" y="6.5" width="51" height="51" rx="12"/>
    <path d="M32 18 L32 30 L44 30" transform="rotate(0 32 32)"/>
    <path d="M32 18 L32 30 L44 30" transform="rotate(90 32 32)"/>
    <path d="M32 18 L32 30 L44 30" transform="rotate(180 32 32)"/>
    <path d="M32 18 L32 30 L44 30" transform="rotate(270 32 32)"/>
  </svg>`;
}

// Lockup completo: emblema + nome + assinatura.
export function marcaSchramm() {
  return `<div class="marca">
    ${emblemaSchramm('marca-emblema')}
    <div class="marca-txt">
      <span class="marca-nome">SCHRAMM</span>
      <span class="marca-sub">Arquitetura e Engenharia</span>
    </div>
  </div>`;
}

// As 3 formas orgânicas oficiais da Shapes, como máscaras (clip-path).
// Coordenadas normalizadas (0–1, objectBoundingBox) para escalar em qualquer tamanho.
// Traçadas à mão a partir das referências. Para fidelidade milimétrica, dá para
// substituir cada `d` pelo path exportado do SVG oficial.
export const FORMAS = [
  {
    // Forma 1 — pedra/ovo: alta, topo levemente mais estreito, base arredondada.
    id: 'shape-blob1',
    label: 'Forma 1',
    d: 'M0.50,0.02 C0.65,0.02 0.81,0.14 0.86,0.36 C0.93,0.62 0.86,0.90 0.58,0.97 C0.52,0.99 0.48,0.99 0.42,0.97 C0.14,0.90 0.07,0.62 0.14,0.36 C0.19,0.14 0.35,0.02 0.50,0.02 Z',
  },
  {
    // Forma 2 — "guitar pick": canto no topo-esquerdo, topo largo à direita, base em ponta suave.
    id: 'shape-blob2',
    label: 'Forma 2',
    d: 'M0.37,0.07 C0.56,0.00 0.80,0.06 0.90,0.30 C0.98,0.49 0.80,0.80 0.60,0.95 C0.55,0.99 0.50,0.99 0.44,0.94 C0.22,0.78 0.05,0.56 0.06,0.38 C0.07,0.22 0.21,0.12 0.37,0.07 Z',
  },
  {
    // Forma 3 — triângulo arredondado apontando para cima; base larga e arredondada.
    id: 'shape-blob3',
    label: 'Forma 3',
    d: 'M0.47,0.05 C0.34,0.06 0.16,0.28 0.10,0.52 C0.04,0.74 0.14,0.94 0.38,0.96 C0.52,0.97 0.63,0.97 0.73,0.92 C0.90,0.84 0.87,0.54 0.77,0.33 C0.69,0.16 0.58,0.05 0.47,0.05 Z',
  },
]

export const FORMA_PADRAO = FORMAS[0].id

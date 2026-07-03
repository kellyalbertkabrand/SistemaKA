// As 3 formas orgânicas oficiais da Shapes, como máscaras (clip-path).
// Coordenadas normalizadas (0–1, objectBoundingBox) para escalar em qualquer tamanho.
// São aproximações desenhadas à mão; para fidelidade total, dá para substituir
// cada `d` pelo path SVG exportado do arquivo vetorial da Shapes.
export const FORMAS = [
  {
    // Forma 1 — pedra/ovo: mais alta, topo levemente mais estreito.
    id: 'shape-blob1',
    label: 'Forma 1',
    d: 'M0.50,0.02 C0.69,0.02 0.87,0.17 0.90,0.43 C0.94,0.71 0.79,0.98 0.50,0.98 C0.21,0.98 0.06,0.71 0.10,0.43 C0.13,0.17 0.31,0.02 0.50,0.02 Z',
  },
  {
    // Forma 2 — "guitar pick": topo largo e arredondado, base em ponta suave.
    id: 'shape-blob2',
    label: 'Forma 2',
    d: 'M0.50,0.03 C0.81,0.02 0.99,0.23 0.94,0.49 C0.89,0.73 0.62,0.99 0.50,0.98 C0.38,0.99 0.11,0.73 0.06,0.49 C0.01,0.23 0.19,0.04 0.50,0.03 Z',
  },
  {
    // Forma 3 — triângulo arredondado apontando para baixo.
    id: 'shape-blob3',
    label: 'Forma 3',
    d: 'M0.50,0.03 C0.31,0.03 0.08,0.15 0.05,0.39 C0.02,0.63 0.28,0.97 0.52,0.97 C0.74,0.97 0.97,0.65 0.95,0.39 C0.93,0.15 0.69,0.03 0.50,0.03 Z',
  },
]

export const FORMA_PADRAO = FORMAS[0].id

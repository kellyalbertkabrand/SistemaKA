// As 3 formas orgânicas oficiais da Shapes, como máscaras (clip-path).
// Coordenadas normalizadas (0–1, objectBoundingBox) para escalar em qualquer tamanho.
// Traçadas à mão a partir das referências. Para fidelidade milimétrica, dá para
// substituir cada `d` pelo path exportado do SVG oficial.
export const FORMAS = [
  {
    // Forma 1 — pedra/ovo. Traçado EXATO extraído do SVG oficial da Shapes.
    id: 'shape-blob1',
    label: 'Forma 1',
    d: 'M0.4500,0.0004 C0.3657,0.0004 0.2839,0.0320 0.2123,0.0924 C0.0837,0.2010 -0.0014,0.3919 0.0006,0.5673 C-0.0009,0.6911 0.0472,0.7896 0.1434,0.8600 C0.2274,0.9214 0.3482,0.9633 0.5129,0.9880 L0.5131,0.9881 C0.5698,0.9958 0.6213,0.9996 0.6676,0.9996 C0.7807,0.9996 0.8634,0.9766 0.9185,0.9302 C0.9820,0.8768 1.0084,0.7911 0.9969,0.6757 C0.9761,0.4097 0.7610,0.0146 0.4715,0.0011 C0.4643,0.0006 0.4572,0.0004 0.4500,0.0004 Z',
  },
  {
    // Forma 2 — "guitar pick". Traçado EXATO extraído do SVG oficial da Shapes.
    id: 'shape-blob2',
    label: 'Forma 2',
    d: 'M0.5010,0.0007 C0.4841,0.0007 0.4669,0.0011 0.4495,0.0019 C0.3033,0.0083 -0.0449,0.0684 0.0056,0.2780 C0.0265,0.3645 0.1127,0.4748 0.1586,0.5549 C0.2091,0.6429 0.2489,0.7363 0.3123,0.8165 C0.3873,0.9113 0.5079,0.9990 0.6349,0.9990 C0.6435,0.9990 0.6522,0.9986 0.6609,0.9977 C0.9199,0.9727 1.0244,0.5790 0.9934,0.3656 C0.9529,0.0865 0.7507,0.0008 0.5010,0.0007 Z',
  },
  {
    // Forma 3 — triângulo arredondado apontando para cima; base larga e arredondada.
    id: 'shape-blob3',
    label: 'Forma 3',
    d: 'M0.47,0.05 C0.34,0.06 0.16,0.28 0.10,0.52 C0.04,0.74 0.14,0.94 0.38,0.96 C0.52,0.97 0.63,0.97 0.73,0.92 C0.90,0.84 0.87,0.54 0.77,0.33 C0.69,0.16 0.58,0.05 0.47,0.05 Z',
  },
]

export const FORMA_PADRAO = FORMAS[0].id

# Gera a retícula KA (pixels que nascem fortes num canto e se dissolvem com borda orgânica).
# Uso: python3 scripts/gerar-reticula.py
import math, random

def reticula(nome, cor1, cor2, largura=640, altura=640, pixel=4, passo=6, semente=7):
    random.seed(semente)
    quadrados = []
    for y in range(0, altura, passo):
        for x in range(0, largura, passo):
            # Distância normalizada ao canto inferior direito (0 = canto, 1 = longe).
            d = math.hypot(largura - x, altura - y) / math.hypot(largura, altura)
            # Borda orgânica: ruído de baixa frequência deforma o limite.
            ruido = 0.18 * math.sin(x / 47.0) * math.cos(y / 61.0) + 0.08 * math.sin((x + y) / 23.0)
            prob = 1.0 - (d + ruido) / 0.62
            if prob <= 0:
                continue
            if random.random() < min(prob, 0.97):
                cor = cor2 if random.random() < 0.45 + 0.4 * min(prob, 1) else cor1
                quadrados.append(f'<rect x="{x}" y="{y}" width="{pixel}" height="{pixel}" fill="{cor}"/>')
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {largura} {altura}" '
           f'width="{largura}" height="{altura}" shape-rendering="crispEdges">' + "".join(quadrados) + "</svg>")
    with open(f"public/img/{nome}.svg", "w") as f:
        f.write(svg)
    print(nome, len(quadrados), "pixels")

reticula("reticula-marinho", "#253D56", "#30506F")
reticula("reticula-papel", "#EAE7DD", "#DDD9CC", pixel=3, passo=5, semente=11)

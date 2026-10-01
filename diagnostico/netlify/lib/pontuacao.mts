// Régua de notas: determinística e auditável. A IA nunca dá a nota, só interpreta.
import { DIMENSOES, FAIXAS } from "./conteudo.mts";

export type Respostas = Record<string, number | string>;

export type NotaDimensao = {
  id: string;
  nome: string;
  capitulo: number;
  nota: number; // 0 a 100
  abertas: { pergunta: string; resposta: string }[];
  escala: { pergunta: string; valor: number }[];
};

export type Resultado = {
  notaGeral: number;
  faixa: { nome: string; resumo: string };
  dimensoes: NotaDimensao[];
};

// Lista de ids de perguntas que ainda faltam responder.
export function perguntasPendentes(respostas: Respostas): string[] {
  const faltando: string[] = [];
  for (const d of DIMENSOES) {
    for (const p of d.perguntas) {
      const v = respostas[p.id];
      if (p.tipo === "escala") {
        if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > 5) faltando.push(p.id);
      } else if (typeof v !== "string" || v.trim().length < 3) {
        faltando.push(p.id);
      }
    }
  }
  return faltando;
}

export function calcularNotas(respostas: Respostas): Resultado {
  const dimensoes = DIMENSOES.map((d) => {
    const escala = d.perguntas
      .filter((p) => p.tipo === "escala")
      .map((p) => ({ pergunta: p.texto, valor: Number(respostas[p.id]) }));
    const abertas = d.perguntas
      .filter((p) => p.tipo === "aberta")
      .map((p) => ({ pergunta: p.texto, resposta: String(respostas[p.id] ?? "").trim() }));

    // Cada afirmação vale de 1 a 5. Mínimo possível = n, máximo = 5n. Normaliza para 0–100.
    const soma = escala.reduce((s, e) => s + e.valor, 0);
    const n = escala.length;
    const nota = Math.round(((soma - n) / (4 * n)) * 100);

    return { id: d.id, nome: d.nome, capitulo: d.capitulo, nota, abertas, escala };
  });

  const notaGeral = Math.round(dimensoes.reduce((s, d) => s + d.nota, 0) / dimensoes.length);
  const faixa = [...FAIXAS].reverse().find((f) => notaGeral >= f.min) ?? FAIXAS[0];

  return { notaGeral, faixa: { nome: faixa.nome, resumo: faixa.resumo }, dimensoes };
}

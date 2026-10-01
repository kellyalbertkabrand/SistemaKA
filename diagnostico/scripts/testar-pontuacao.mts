// Testa a régua de notas sem precisar de Firebase nem IA: npm test
import assert from "node:assert/strict";
import { DIMENSOES } from "../netlify/lib/conteudo.mts";
import { calcularNotas, perguntasPendentes } from "../netlify/lib/pontuacao.mts";

const total = DIMENSOES.reduce((s, d) => s + d.perguntas.length, 0);
assert.equal(DIMENSOES.length, 7, "devem ser 7 dimensões");
assert.equal(total, 35, "devem ser 35 perguntas");

function respostasCom(valor: number) {
  const r: Record<string, number | string> = {};
  for (const d of DIMENSOES) for (const p of d.perguntas) r[p.id] = p.tipo === "escala" ? valor : "Resposta de teste.";
  return r;
}

assert.equal(calcularNotas(respostasCom(1)).notaGeral, 0);
assert.equal(calcularNotas(respostasCom(5)).notaGeral, 100);
assert.equal(calcularNotas(respostasCom(3)).notaGeral, 50);
assert.equal(calcularNotas(respostasCom(1)).faixa.nome, "Marca sem Raiz");
assert.equal(calcularNotas(respostasCom(3)).faixa.nome, "Marca em Construção");
assert.equal(calcularNotas(respostasCom(5)).faixa.nome, "Marca com Essência");

const incompleta = respostasCom(4);
delete incompleta["voz_2"];
incompleta["presenca_5"] = "  ";
assert.deepEqual(perguntasPendentes(incompleta), ["voz_2", "presenca_5"]);
assert.deepEqual(perguntasPendentes(respostasCom(4)), []);

console.log("Régua de notas: todos os testes passaram.");

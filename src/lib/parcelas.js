// Plano de parcelas do projeto (obras "sem gestão de obra").
// A obra guarda `parcelas` (quantidade; 1 = à vista) e `orcamento` (valor do
// projeto). O plano em si fica em `obra.parcelasPlano` como uma lista de
// { n, valor, data, forma, pago }. Este módulo gera e reconcilia esse plano
// para o Financeiro (editável) e para o painel do cliente (só leitura).

import { moeda, dataBR } from './format.js';

// Divide um total em n parcelas que SOMAM exatamente o total (a última absorve
// o arredondamento dos centavos).
export function dividirValor(total, n) {
  const centavos = Math.round(Number(total || 0) * 100);
  const partes = Math.max(1, Math.floor(Number(n || 1)));
  const base = Math.floor(centavos / partes);
  const resto = centavos - base * partes;
  const arr = [];
  for (let i = 0; i < partes; i++) {
    arr.push((base + (i === partes - 1 ? resto : 0)) / 100);
  }
  return arr;
}

// Soma m meses a uma data 'YYYY-MM-DD' (sem depender de fuso).
export function somarMeses(iso, m) {
  const base = String(iso || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
  const [a, mes, d] = base.split('-').map(Number);
  const dt = new Date(a, (mes - 1) + m, d);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Gera um plano NOVO dividindo o total em n parcelas iguais, com vencimento
// mensal a partir de hoje (ou de dataBase). Usado na 1ª geração e no "Refazer".
export function gerarPlano(total, n, dataBase) {
  const valores = dividirValor(total, n);
  const base = String(dataBase || new Date().toISOString().slice(0, 10)).slice(0, 10);
  return valores.map((v, i) => ({ n: i + 1, valor: v, data: somarMeses(base, i), forma: 'Pix', pago: false }));
}

// Renumera as parcelas (n = 1..N) mantendo os demais campos — usado após
// adicionar/remover parcelas.
export function renumerar(plano) {
  return (plano || []).map((p, i) => ({ ...p, n: i + 1 }));
}

// Devolve o plano de parcelas da obra. Se já existe um plano salvo, ELE é a
// fonte da verdade (a arquiteta edita valores/datas/forma/status e adiciona ou
// remove parcelas no Financeiro). Só quando não há plano é que geramos um a
// partir do valor do projeto ÷ nº de parcelas.
// Devolve { plano, mudou } — `mudou` diz se difere do que está salvo.
export function normalizarPlano(obra) {
  const antigo = Array.isArray(obra?.parcelasPlano) ? obra.parcelasPlano : [];
  const plano = antigo.length
    ? renumerar(antigo).map((p) => ({
        n: p.n,
        valor: Number(p.valor || 0),
        data: p.data || '',
        forma: p.forma || 'Pix',
        pago: Boolean(p.pago),
      }))
    : gerarPlano(Number(obra?.orcamento || 0), Math.max(1, Number(obra?.parcelas || 1)));

  const mudou = JSON.stringify(plano) !== JSON.stringify(antigo);
  return { plano, mudou };
}

// Soma das parcelas já pagas.
export function somaPagas(plano) {
  return (plano || []).filter((p) => p.pago).reduce((t, p) => t + Number(p.valor || 0), 0);
}

// Soma de TODAS as parcelas. O valor do projeto passa a ser a soma das parcelas
// — assim dá para acrescentar um serviço (nova parcela) sem mexer nas já pagas.
export function somaPlano(plano) {
  return (plano || []).reduce((t, p) => t + Number(p.valor || 0), 0);
}

// Mensagem pronta para o WhatsApp cobrando uma parcela do projeto. Sem emojis
// (evita caracteres quebrados). `pagamento` (opcional) traz os dados de Pix do
// escritório; `link` (opcional) é o painel do cliente.
export function mensagemCobrancaParcela({ obra, parcela, total, link, pagamento }) {
  const l = [];
  l.push(obra?.cliente ? `Olá, ${obra.cliente}!` : 'Olá!');
  l.push('');
  l.push(`Passando para combinar a *parcela ${parcela.n} de ${total}* do projeto *${obra?.nome || ''}*.`);
  l.push('');
  l.push(`Valor: ${moeda(parcela.valor)}`);
  if (parcela.data) l.push(`Vencimento: ${dataBR(parcela.data)}`);
  if (parcela.forma) l.push(`Forma combinada: ${parcela.forma}`);
  if (pagamento && pagamento.pix) {
    l.push('');
    l.push(`Chave Pix (${pagamento.pixTipo || 'chave'}): ${pagamento.pix}`);
    if (pagamento.titular) l.push(`Titular: ${pagamento.titular}`);
  }
  if (link) {
    l.push('');
    l.push(`Acompanhe o projeto e os pagamentos por aqui:`);
    l.push(link);
  }
  l.push('');
  l.push('Qualquer dúvida, estou à disposição. Obrigada!');
  return l.join('\n');
}

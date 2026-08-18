// Plano de parcelas do projeto (obras "sem gestão de obra").
// A obra guarda `parcelas` (quantidade; 1 = à vista) e `orcamento` (valor do
// projeto). O plano em si fica em `obra.parcelasPlano` como uma lista de
// { n, valor, data, forma, pago }. Este módulo gera e reconcilia esse plano
// para o Financeiro (editável) e para o painel do cliente (só leitura).

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

// Reconcilia o plano guardado com o valor/quantidade atuais da obra:
// - os valores são sempre recalculados a partir de orçamento ÷ parcelas;
// - data, forma e status "pago" são preservados por posição quando já existem;
// - se aumentou o nº de parcelas, as novas entram com vencimento mensal e "Pix";
// - se diminuiu, as sobrando são descartadas.
// Devolve { plano, mudou } — `mudou` diz se difere do que está salvo.
export function normalizarPlano(obra) {
  const n = Math.max(1, Number(obra?.parcelas || 1));
  const total = Number(obra?.orcamento || 0);
  const valores = dividirValor(total, n);
  const antigo = Array.isArray(obra?.parcelasPlano) ? obra.parcelasPlano : [];
  const hoje = new Date().toISOString().slice(0, 10);

  const plano = valores.map((v, i) => {
    const a = antigo[i] || null;
    return {
      n: i + 1,
      valor: v,
      data: (a && a.data) || somarMeses(hoje, i),
      forma: (a && a.forma) || 'Pix',
      pago: Boolean(a && a.pago),
    };
  });

  const mudou = JSON.stringify(plano) !== JSON.stringify(antigo);
  return { plano, mudou };
}

// Soma das parcelas já pagas.
export function somaPagas(plano) {
  return (plano || []).filter((p) => p.pago).reduce((t, p) => t + Number(p.valor || 0), 0);
}

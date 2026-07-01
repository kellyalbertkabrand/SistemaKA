// Ordenação de lançamentos, reutilizada nos dois painéis (interno e cliente).

export const OPCOES_ORDEM = [
  { chave: 'data', rotulo: 'Data (mais recente)' },
  { chave: 'etapa', rotulo: 'Tipo (etapa)' },
  { chave: 'status', rotulo: 'Status (pendente primeiro)' },
];

const porDataDesc = (a, b) => String(b.data || '').localeCompare(String(a.data || ''));

export function ordenarLancamentos(lista, chave) {
  const arr = [...(lista || [])];
  if (chave === 'etapa') {
    arr.sort(
      (a, b) =>
        String(a.etapa || '').localeCompare(String(b.etapa || ''), 'pt', { sensitivity: 'base' }) ||
        porDataDesc(a, b)
    );
  } else if (chave === 'status') {
    const rank = (s) => (s === 'pendente' ? 0 : 1); // pendentes primeiro
    arr.sort((a, b) => rank(a.status) - rank(b.status) || porDataDesc(a, b));
  } else {
    arr.sort(porDataDesc); // data, mais recente primeiro
  }
  return arr;
}

// Monta o <select> de ordenação.
export function seletorOrdem(id, chaveAtual = 'data') {
  return `<select class="ordenar" id="${id}" aria-label="Ordenar">
    ${OPCOES_ORDEM.map(
      (o) =>
        `<option value="${o.chave}" ${o.chave === chaveAtual ? 'selected' : ''}>Ordenar por: ${o.rotulo}</option>`
    ).join('')}
  </select>`;
}

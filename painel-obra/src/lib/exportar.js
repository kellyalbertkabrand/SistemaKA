// Exportação de dados para CSV (abre no Excel). 100% no navegador —
// funciona como "backup na mão" da arquiteta, sem depender do servidor.

function campo(v) {
  const s = String(v ?? '');
  if (/[";\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

// Número no formato brasileiro (vírgula decimal), para o Excel pt-BR.
export function numBR(n) {
  return Number(n || 0).toFixed(2).replace('.', ',');
}

export function paraCSV(matriz) {
  // BOM (﻿) para o Excel reconhecer acentos; separador ";" (padrão pt-BR).
  return '﻿' + matriz.map((linha) => linha.map(campo).join(';')).join('\r\n');
}

export function baixarCSV(nomeArquivo, matriz) {
  const blob = new Blob([paraCSV(matriz)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

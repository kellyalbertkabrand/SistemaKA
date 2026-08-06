// Gerador de ZIP mínimo (método "store", sem compressão) — 100% no navegador,
// sem dependências. Usado para juntar a planilha + notas fiscais + fotos num
// único arquivo. As imagens já vêm comprimidas (JPEG), então não comprimir de
// novo é ok.

const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = TABELA_CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const enc = new TextEncoder();

// arquivos: [{ nome: string, dados: Uint8Array }]  -> Blob (application/zip)
export function criarZip(arquivos) {
  const partes = [];
  const central = [];
  let offset = 0;

  for (const arq of arquivos) {
    const nomeBytes = enc.encode(arq.nome);
    const dados = arq.dados;
    const crc = crc32(dados);
    const tam = dados.length;

    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true);          // assinatura local header
    lh.setUint16(4, 20, true);                  // versão
    lh.setUint16(6, 0x0800, true);              // flag: nome em UTF-8
    lh.setUint16(8, 0, true);                   // método: store (0)
    lh.setUint16(10, 0, true);                  // hora
    lh.setUint16(12, 0x21, true);               // data (1980-01-01, válida)
    lh.setUint32(14, crc, true);
    lh.setUint32(18, tam, true);                // tamanho comprimido
    lh.setUint32(22, tam, true);                // tamanho original
    lh.setUint16(26, nomeBytes.length, true);
    lh.setUint16(28, 0, true);                  // extra
    partes.push(new Uint8Array(lh.buffer), nomeBytes, dados);

    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true);          // assinatura central header
    ch.setUint16(4, 20, true);
    ch.setUint16(6, 20, true);
    ch.setUint16(8, 0x0800, true);
    ch.setUint16(10, 0, true);
    ch.setUint16(12, 0, true);
    ch.setUint16(14, 0x21, true);               // data (1980-01-01, válida)
    ch.setUint32(16, crc, true);
    ch.setUint32(20, tam, true);
    ch.setUint32(24, tam, true);
    ch.setUint16(28, nomeBytes.length, true);
    ch.setUint16(30, 0, true);
    ch.setUint16(32, 0, true);
    ch.setUint16(34, 0, true);
    ch.setUint16(36, 0, true);
    ch.setUint32(38, 0, true);
    ch.setUint32(42, offset, true);             // deslocamento do local header
    central.push(new Uint8Array(ch.buffer), nomeBytes);

    offset += 30 + nomeBytes.length + tam;
  }

  let centralSize = 0;
  for (const p of central) centralSize += p.length;

  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);           // end of central directory
  end.setUint16(8, arquivos.length, true);
  end.setUint16(10, arquivos.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);

  return new Blob([...partes, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
}

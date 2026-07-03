// Assinatura de proveniência nos PNGs exportados.
//
// Objetivo: crédito/direito autoral positivo. O PNG que sai do canvas já é
// "limpo" (sem EXIF/C2PA/tags de IA da imagem original — o canvas re-codifica
// do zero). Aqui a gente ADICIONA metadados escolhidos por nós — autor, URL,
// software, copyright — como chunks iTXt (UTF-8) do próprio PNG. Isso ajuda na
// atribuição (Google Imagens, sites) sem afetar em nada o alcance nas redes.

export interface MetaAssinatura {
  autor?: string
  copyright?: string
  software?: string
  fonte?: string // URL oficial
  descricao?: string
  titulo?: string
}

// Assinatura padrão do Estúdio de Marca — KA.
// `cliente` e `titulo` são opcionais (nome do cliente/da peça).
export function metaPadrao(opts: { cliente?: string; titulo?: string } = {}): MetaAssinatura {
  const ano = new Date().getFullYear()
  const dono = opts.cliente?.trim() || 'Kelly Albert'
  return {
    autor: 'Kelly Albert / Estúdio de Marca — KA',
    software: 'Estúdio de Marca KA',
    fonte: 'https://kellyalbert.com.br',
    copyright: `© ${ano} ${dono} · Estúdio de Marca KA`,
    titulo: opts.titulo,
    descricao: opts.titulo,
  }
}

// ---- utilitários de bytes / CRC32 -----------------------------------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

const utf8 = new TextEncoder()

function latin1(s: string): Uint8Array {
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff
  return out
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(total)
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

function u32be(n: number): Uint8Array {
  return new Uint8Array([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff])
}

// Monta um chunk iTXt (UTF-8) — suporta acentos, travessão, etc.
function chunkITXt(keyword: string, texto: string): Uint8Array {
  const kw = latin1(keyword.slice(0, 79)) // keyword em Latin-1 (só ASCII aqui)
  const txt = utf8.encode(texto)
  // keyword \0 compFlag(0) compMethod(0) langTag \0 transKeyword \0 texto
  const data = concat([kw, new Uint8Array([0, 0, 0, 0, 0]), txt])
  const type = latin1('iTXt')
  const crc = crc32(concat([type, data]))
  return concat([u32be(data.length), type, data, u32be(crc)])
}

// ---- base64 <-> bytes (browser) -------------------------------------------

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function bytesToB64(bytes: Uint8Array): string {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}

/**
 * Injeta os metadados de assinatura num PNG (data URL) e devolve um novo data URL.
 * Insere os chunks iTXt logo após o IHDR. Se algo falhar, devolve o original.
 */
export function assinarPngDataUrl(dataUrl: string, meta: MetaAssinatura): string {
  try {
    const b64 = dataUrl.split(',')[1]
    if (!b64) return dataUrl
    const png = b64ToBytes(b64)

    // Assinatura PNG (8 bytes) + IHDR sempre primeiro: length(4)+type(4)+13+crc(4) = 25.
    const IHDR_END = 8 + 25
    if (png.length < IHDR_END) return dataUrl

    const campos: Array<[string, string | undefined]> = [
      ['Title', meta.titulo],
      ['Author', meta.autor],
      ['Description', meta.descricao],
      ['Copyright', meta.copyright],
      ['Software', meta.software],
      ['Source', meta.fonte],
    ]
    const chunks = campos
      .filter(([, v]) => v && v.trim().length > 0)
      .map(([k, v]) => chunkITXt(k, v as string))
    if (chunks.length === 0) return dataUrl

    const novo = concat([png.subarray(0, IHDR_END), ...chunks, png.subarray(IHDR_END)])
    return 'data:image/png;base64,' + bytesToB64(novo)
  } catch {
    return dataUrl
  }
}

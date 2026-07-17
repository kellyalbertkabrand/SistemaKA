// ============================================================================
// NOTÍCIAS — leitura das matérias que o sistema de geração de notícias grava no
// Firestore do app (coleção `noticias`). A aba Notícias (GestaoNoticias) só LÊ;
// quem ESCREVE é o sistema de notícias (outra sessão/serviço), publicando
// direto aqui no SaaS. Ver o briefing em BRIEFING-NOTICIAS-NO-SAAS.md.
// ============================================================================

import { collection, getDocs, limit as fbLimit, orderBy, query } from 'firebase/firestore'
import { db } from './firebase'

export interface Noticia {
  id: string
  titulo: string
  resumo?: string
  /** Nome da fonte (ex.: "Adweek", "Meio & Mensagem"). */
  fonte?: string
  /** Link para a matéria original. */
  url?: string
  /** Data da matéria "YYYY-MM-DD". */
  data?: string
  /** URL de imagem/capa (opcional). */
  imagem?: string
  /** Categoria opcional (ex.: "branding", "ia"). */
  categoria?: string
  /** Quando o sistema gerou/gravou (ISO). Usado para ordenar. */
  criado_em?: string
}

/**
 * Lista as notícias mais recentes. Ordena por `criado_em` (desc) — o sistema de
 * notícias deve sempre gravar esse campo. Docs marcados com `excluido_em`
 * (lixeira) são ignorados, como no resto do app.
 */
export async function listarNoticias(max = 80): Promise<Noticia[]> {
  const snap = await getDocs(
    query(collection(db, 'noticias'), orderBy('criado_em', 'desc'), fbLimit(max)),
  )
  return snap.docs
    .filter((d) => !d.data().excluido_em)
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Noticia, 'id'>) }))
}

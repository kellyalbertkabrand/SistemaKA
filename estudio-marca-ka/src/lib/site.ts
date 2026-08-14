import { collection, deleteDoc, doc, getDocs, orderBy, query, setDoc } from 'firebase/firestore'
import { db } from './firebase'

// ============================================================================
// DESEMPENHO DO SITE — métricas de acesso ao site (kellyalbert.com.br) que a KA
// registra por mês (copia do analytics dela). O app é só front-end (Firebase
// grátis), então NÃO puxa o tráfego sozinho — a coleta automática (Google
// Analytics / Netlify / Plausible) depende de backend/credenciais (plano Blaze).
// Um doc por mês (id = "YYYY-MM"), então salvar sobrescreve o mês.
// ============================================================================

export interface SiteMetrica {
  id: string // = mes "YYYY-MM"
  mes: string
  visitas: number
  visitantes: number
  paginas: number
  leads: number // contatos/orçamentos que vieram do site
  origem_busca?: number
  origem_social?: number
  origem_direto?: number
  origem_outro?: number
  obs?: string | null
  criado_em: string
}

const agora = () => new Date().toISOString()

function limpar<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v
  return out as T
}

export async function listarMetricasSite(): Promise<SiteMetrica[]> {
  const snap = await getDocs(query(collection(db, 'site_metricas'), orderBy('mes', 'desc')))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SiteMetrica, 'id'>) }))
}

export async function salvarMetricaSite(
  m: Omit<SiteMetrica, 'id' | 'criado_em'>,
): Promise<SiteMetrica> {
  const dados = limpar({ ...m, criado_em: agora() })
  await setDoc(doc(db, 'site_metricas', m.mes), dados) // id = mes → cria ou atualiza
  return { id: m.mes, ...dados }
}

export async function excluirMetricaSite(mes: string): Promise<void> {
  await deleteDoc(doc(db, 'site_metricas', mes))
}

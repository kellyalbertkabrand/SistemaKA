import { collection, getDocs } from 'firebase/firestore'
import JSZip from 'jszip'
import { db } from './firebase'
import { entregarArquivo } from './exportar'

// ============================================================================
// BACKUP COMPLETO DO SISTEMA
//
// Baixa TODOS os dados do Firestore num arquivo .zip (dados.json + um guia de
// reconstrução). O CÓDIGO do app já está salvo no GitHub; este backup guarda os
// DADOS (clientes, orçamentos, contratos, cobranças, projetos, financeiro,
// cuidadoras + anexos, formulários, etc.). Juntos — repositório + este arquivo —
// permitem reconstruir o sistema 100%.
// ============================================================================

// Todas as coleções de dados do sistema. Ler uma coleção que não existe devolve
// vazio (sem erro), então a lista pode ser abrangente sem risco.
export const COLECOES_BACKUP = [
  'clientes',
  'orcamentos',
  'contratos',
  'modelos_contrato',
  'cobrancas',
  'projetos',
  'fases_biblioteca',
  'atividades',
  'caixa',
  'cuidadoras',
  'formularios',
  'site_metricas',
  'grafismos',
  'kit_marca',
  'noticias',
  'usuarios',
  'convites',
] as const

// Converte Timestamps do Firestore em texto ISO — para o JSON ficar legível e
// portável (independente do formato interno do Firebase).
function replacer(_k: string, v: unknown): unknown {
  if (
    v &&
    typeof v === 'object' &&
    typeof (v as { toDate?: unknown }).toDate === 'function'
  ) {
    try {
      return (v as { toDate: () => Date }).toDate().toISOString()
    } catch {
      return v
    }
  }
  return v
}

type Registro = { id: string; [k: string]: unknown }

async function lerTopo(nome: string): Promise<Registro[]> {
  const snap = await getDocs(collection(db, nome))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

async function lerSub(a: string, b: string, c: string): Promise<Registro[]> {
  const snap = await getDocs(collection(db, a, b, c))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export interface ProgressoBackup {
  etapa: string
  feito: number
  total: number
}

/** Lê todas as coleções e devolve o objeto de backup (sem baixar). */
export async function coletarDados(
  aoProgresso?: (p: ProgressoBackup) => void,
): Promise<{ manifesto: Record<string, unknown>; dados: Record<string, unknown> }> {
  const dados: Record<string, unknown> = {}
  const total = COLECOES_BACKUP.length + 1
  let feito = 0

  for (const c of COLECOES_BACKUP) {
    aoProgresso?.({ etapa: c, feito, total })
    dados[c] = await lerTopo(c)
    feito++
  }

  // Subcoleção de anexos das cuidadoras (documentos em data URL).
  aoProgresso?.({ etapa: 'anexos das cuidadoras', feito, total })
  const cuidadoras = (dados.cuidadoras as Registro[]) ?? []
  const anexos: Record<string, Registro[]> = {}
  for (const cu of cuidadoras) {
    anexos[cu.id] = await lerSub('cuidadoras', cu.id, 'documentos')
  }
  dados.cuidadoras_documentos = anexos
  feito++

  const contagens: Record<string, number> = {}
  for (const c of COLECOES_BACKUP) contagens[c] = (dados[c] as unknown[]).length
  contagens.cuidadoras_documentos = Object.values(anexos).reduce((s, v) => s + v.length, 0)

  const projeto =
    (db as unknown as { app?: { options?: { projectId?: string } } })?.app?.options?.projectId ??
    'estudio-de-marcas-ka'

  const manifesto = {
    sistema: 'Sistema Visual de Publicações da Marca — KA',
    versao_backup: 1,
    gerado_em: new Date().toISOString(),
    firebase_projeto: projeto,
    repositorio: 'github.com/kellyalbertkabrand/SistemaKA',
    branch_publicada: 'estudiodemarca',
    contagens,
    observacao:
      'Backup COMPLETO dos DADOS (Firestore). O CÓDIGO está no GitHub. Juntos reconstroem o sistema 100%.',
  }

  return { manifesto, dados }
}

function guiaReconstrucao(manifesto: Record<string, unknown>): string {
  const contagens = manifesto.contagens as Record<string, number>
  const linhas = Object.entries(contagens)
    .map(([k, v]) => `- \`${k}\`: ${v} registro(s)`)
    .join('\n')
  return `# Backup do Sistema Visual de Publicações da Marca — KA

Gerado em: ${manifesto.gerado_em}
Projeto Firebase: \`${manifesto.firebase_projeto}\`

## O que é este arquivo

Este .zip é o **backup completo dos DADOS** do sistema (todas as coleções do
Firestore). O **código** do app **não** está aqui — ele já está salvo no GitHub.

**Reconstruir o sistema 100% = CÓDIGO (GitHub) + DADOS (este arquivo).**

## Como um novo chat do Claude Code reconstrói tudo

1. **Código:** clonar \`github.com/kellyalbertkabrand/SistemaKA\`, usar a branch
   **\`estudiodemarca\`** (a que publica no ar). Ler o \`CLAUDE.md\` na raiz — ele é
   a fonte de verdade e explica todo o sistema.
2. **App local:** \`cd estudio-marca-ka && npm install && npm run dev\`.
3. **Firebase:** a config pública fica em \`src/lib/firebase.ts\`. Para restaurar
   os dados, criar/usar um projeto Firebase e **importar** as coleções deste
   \`dados.json\` (via um script com o \`firebase-admin\` SDK, ou pelo Console).
   Cada chave de \`dados\` é uma coleção; cada item tem o campo \`id\` (o ID do
   documento) e os demais campos são os dados. Datas estão em texto ISO.
4. **Anexos das cuidadoras:** ficam em \`dados.cuidadoras_documentos\`, um mapa
   \`{ idDaCuidadora: [ documentos... ] }\` — cada documento tem o arquivo em
   data URL. Ao restaurar, gravar na subcoleção \`cuidadoras/{id}/documentos\`.

## Coleções neste backup

${linhas}

## Importante

- As chaves do Firebase no código são **públicas por design** (a segurança vem
  das Regras do Firestore). Não há segredos neste backup.
- Guarde este arquivo num lugar seguro (Google Drive, HD externo). Gere um novo
  backup periodicamente — ele é uma FOTO dos dados no momento em que foi baixado.
`
}

/** Gera o backup completo e entrega o .zip (baixa no PC / compartilha no celular). */
export async function baixarBackup(aoProgresso?: (p: ProgressoBackup) => void): Promise<void> {
  const { manifesto, dados } = await coletarDados(aoProgresso)

  const zip = new JSZip()
  zip.file('dados.json', JSON.stringify({ manifesto, dados }, replacer, 2))
  zip.file('LEIA-PRIMEIRO.md', guiaReconstrucao(manifesto))

  const blob = await zip.generateAsync({ type: 'blob' })
  const dia = new Date().toISOString().slice(0, 10)
  await entregarArquivo(blob, `backup-ka-${dia}.zip`, 'Backup do sistema')
}

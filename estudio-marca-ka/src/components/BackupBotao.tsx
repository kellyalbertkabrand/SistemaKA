import { useState } from 'react'
import { baixarBackup, type ProgressoBackup } from '../lib/backup'
import { useToast } from './Toast'

// Botão de BACKUP completo do sistema (todos os dados do Firestore num .zip).
// Mostrado na home do painel admin.
export function BackupBotao() {
  const { mostrar } = useToast()
  const [rodando, setRodando] = useState(false)
  const [prog, setProg] = useState<ProgressoBackup | null>(null)
  const [feito, setFeito] = useState(false)

  async function rodar() {
    if (rodando) return
    setRodando(true)
    setFeito(false)
    setProg(null)
    try {
      await baixarBackup((p) => setProg(p))
      setFeito(true)
    } catch (e) {
      mostrar(e instanceof Error ? e.message : String(e), 'erro')
    } finally {
      setRodando(false)
      setProg(null)
    }
  }

  const pct = prog ? Math.round((prog.feito / prog.total) * 100) : 0

  return (
    <div className="backup-box">
      <div className="backup-box__cab">
        <span className="backup-box__ico" aria-hidden="true">
          💾
        </span>
        <div>
          <h3>Backup completo do sistema</h3>
          <p>
            Baixa <strong>todos os dados</strong> — clientes, orçamentos, contratos, cobranças,
            projetos, financeiro, cuidadoras, formulários e mais — num arquivo só, com um guia para
            reconstruir o sistema. O código já fica salvo no GitHub.
          </p>
        </div>
      </div>

      <button className="btn backup-box__btn" onClick={() => void rodar()} disabled={rodando}>
        {rodando ? (
          <>
            <span className="spin-mini" />
            {prog ? `Salvando… ${pct}% (${prog.etapa})` : 'Preparando…'}
          </>
        ) : (
          '💾 Baixar backup agora'
        )}
      </button>

      {feito && (
        <div className="backup-box__ok">
          <strong>✓ Backup gerado!</strong> No computador foi para a pasta <strong>Downloads</strong>;
          no celular, toque em <strong>“Salvar em Arquivos”</strong>. Guarde num lugar seguro (ex.:
          Google Drive) — e gere um novo de tempos em tempos.
        </div>
      )}
    </div>
  )
}

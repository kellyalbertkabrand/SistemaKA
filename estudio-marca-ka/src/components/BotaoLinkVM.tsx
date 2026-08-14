import { linkPortalVM } from '../lib/vm'
import { useToast } from './Toast'

// Botão reutilizável "Copiar link do portal da VM". O mesmo link (/vm-rocks)
// aparece no Financeiro, em Atividades e em Projetos — a VM abre e vê só o que
// é dela (tarefas + a receber). Copiar exige um clique (gesto do usuário).
export function BotaoLinkVM({ rotulo = 'Copiar link do portal da VM' }: { rotulo?: string }) {
  const { mostrar } = useToast()
  return (
    <button
      type="button"
      className="btn"
      onClick={() => {
        void navigator.clipboard.writeText(linkPortalVM())
        mostrar('Link do portal da VM copiado ✓ — mande no WhatsApp dela', 'ok')
      }}
    >
      🔗 {rotulo}
    </button>
  )
}

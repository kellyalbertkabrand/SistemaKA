import { useEffect, useState } from 'react'
import { formatarData } from '../../lib/gestao'
import { confirmar } from '../../lib/confirmar'
import { useToast } from '../../components/Toast'
import {
  esvaziarLixeira,
  excluirDefinitivo,
  listarLixeira,
  restaurarItem,
  type ItemLixeira,
} from '../../lib/lixeira'

// LIXEIRA: itens excluídos de todas as áreas. Dá para RESTAURAR um item (ele
// volta para a sua lista) ou ESVAZIAR a lixeira (apaga tudo de vez).
export function GestaoLixeira() {
  const { mostrar } = useToast()
  const [itens, setItens] = useState<ItemLixeira[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)

  async function recarregar() {
    try {
      setCarregando(true)
      setItens(await listarLixeira())
      setErro(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setCarregando(false)
    }
  }
  useEffect(() => {
    void recarregar()
  }, [])

  async function restaurar(it: ItemLixeira) {
    setOcupado(it.id)
    setItens((l) => l.filter((x) => x.id !== it.id))
    try {
      await restaurarItem(it.colecao, it.id)
      mostrar(`${it.tipo} "${it.nome}" restaurado ✓`, 'ok')
    } catch (e) {
      mostrar(e instanceof Error ? e.message : String(e), 'erro')
      void recarregar()
    } finally {
      setOcupado(null)
    }
  }

  async function apagarDefinitivo(it: ItemLixeira) {
    if (!(await confirmar(`Apagar "${it.nome}" DE VEZ? Não dá para recuperar.`, { perigo: true, confirmar: 'Apagar de vez' }))) return
    setOcupado(it.id)
    setItens((l) => l.filter((x) => x.id !== it.id))
    try {
      await excluirDefinitivo(it.colecao, it.id)
      mostrar('Apagado de vez.', 'ok')
    } catch (e) {
      mostrar(e instanceof Error ? e.message : String(e), 'erro')
      void recarregar()
    } finally {
      setOcupado(null)
    }
  }

  async function esvaziar() {
    if (
      !(await confirmar(
        `Esvaziar a lixeira? Todos os ${itens.length} itens serão apagados DE VEZ e não dá para recuperar.`,
        { perigo: true, confirmar: 'Esvaziar lixeira' },
      ))
    )
      return
    setOcupado('todos')
    try {
      const n = await esvaziarLixeira()
      setItens([])
      mostrar(`${n} ${n === 1 ? 'item apagado' : 'itens apagados'} de vez.`, 'ok')
    } catch (e) {
      mostrar(e instanceof Error ? e.message : String(e), 'erro')
      void recarregar()
    } finally {
      setOcupado(null)
    }
  }

  return (
    <>
      <div className="gestao-acoes">
        <span style={{ fontSize: '0.85rem', color: 'var(--t-500)' }}>
          Itens excluídos ficam aqui. Restaure se errou, ou esvazie para liberar de vez.
        </span>
        <span className="espaco" />
        {itens.length > 0 && (
          <button className="btn btn--saida" disabled={ocupado === 'todos'} onClick={() => void esvaziar()}>
            {ocupado === 'todos' ? 'Esvaziando…' : 'Esvaziar lixeira'}
          </button>
        )}
      </div>

      {erro && <div className="erro-msg" role="alert">{erro}</div>}
      {carregando && <p style={{ color: 'var(--t-500)', fontSize: '0.85rem' }}>Carregando…</p>}

      {!carregando && itens.length === 0 && !erro && (
        <div className="card">
          <h3>A lixeira está vazia ✨</h3>
          <p>Quando você excluir algo (cliente, cobrança, lançamento…), ele aparece aqui e pode ser restaurado.</p>
        </div>
      )}

      {itens.length > 0 && (
        <div className="fin-lista">
          {itens.map((it) => (
            <div key={`${it.colecao}-${it.id}`} className="mov">
              <div className="mov__corpo">
                <div className="mov__desc">
                  {it.nome}
                  <span className="mov__tag" style={{ marginLeft: '0.4rem' }}>{it.tipo}</span>
                </div>
                <div className="mov__meta">excluído em {formatarData(it.excluido_em)}</div>
              </div>
              <div className="mov__acoes">
                <button className="btn-mini" disabled={ocupado === it.id} onClick={() => void restaurar(it)}>
                  Restaurar
                </button>
                <button
                  className="btn-mini btn-mini--perigo"
                  disabled={ocupado === it.id}
                  onClick={() => void apagarDefinitivo(it)}
                  title="Apagar de vez"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

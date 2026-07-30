import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  cadastrarCuidadoraPublico,
  criarRascunhoCuidadora,
  atualizarRascunhoCuidadora,
  finalizarCuidadora,
  type FichaCuidadora,
} from '../../lib/cuidadoras'
import '../../styles/gestao.css'
import { useTituloPagina } from '../../hooks/useTituloPagina'

// Chave do rascunho no navegador (guarda o id do doc + os valores já digitados).
const CHAVE = 'cuidadora-cadastro-rascunho'

// WhatsApp da KA (só dígitos, com DDI 55). Ex.: '5551999999999'. Vazio abre o
// WhatsApp sem destinatário fixo (a pessoa escolhe o contato).
const WHATSAPP_KA = ''

// Link do WhatsApp com a mensagem dos documentos já escrita.
function linkWhatsAppDocs(nome: string): string {
  const msg = [
    `Olá! Aqui é ${nome.trim() || '[meu nome]'}, sobre o cadastro de cuidadora.`,
    'Estou enviando meus documentos:',
    '• Comprovante de residência atualizado',
    '• Foto atualizada do meu documento com o CPF',
  ].join('\n')
  const base = WHATSAPP_KA ? `https://wa.me/${WHATSAPP_KA}` : 'https://wa.me/'
  return `${base}?text=${encodeURIComponent(msg)}`
}

// Página pública: a pessoa que vai começar a trabalhar preenche a própria
// ficha e anexa os documentos. Link: /cadastro-cuidadora
// As informações são SALVAS AUTOMATICAMENTE conforme ela preenche (cria um
// rascunho e vai atualizando), então nada se perde mesmo que ela não clique
// em "Enviar".
export function CuidadoraCadastro() {
  useTituloPagina('Cadastro de cuidadora')
  // Recupera um rascunho começado antes (mesmo aparelho), para continuar.
  const inicial = useRef<{ id: string | null; valores: FichaCuidadora }>()
  if (!inicial.current) {
    let id: string | null = null
    let valores: FichaCuidadora = { nome: '' }
    try {
      const o = JSON.parse(localStorage.getItem(CHAVE) || 'null')
      if (o && typeof o === 'object') {
        id = o.id ?? null
        if (o.valores && typeof o.valores.nome === 'string') valores = o.valores
      }
    } catch {
      /* ignora rascunho inválido */
    }
    inicial.current = { id, valores }
  }

  const [f, setF] = useState<FichaCuidadora>(inicial.current.valores)
  const [enviando, setEnviando] = useState(false)
  const [pronto, setPronto] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [salvo, setSalvo] = useState<'idle' | 'salvando' | 'salvo'>('idle')
  const idRef = useRef<string | null>(inicial.current.id)
  const criacaoRef = useRef<Promise<string> | null>(null)

  function campo<K extends keyof FichaCuidadora>(k: K, v: FichaCuidadora[K]) {
    setF((atual) => ({ ...atual, [k]: v }))
  }

  // Cria o rascunho uma única vez (precisa do nome). Devolve o id (ou null).
  async function garantirRascunho(): Promise<string | null> {
    if (idRef.current) return idRef.current
    if (!f.nome.trim()) return null
    if (!criacaoRef.current) {
      criacaoRef.current = criarRascunhoCuidadora({ ...f, nome: f.nome.trim() }).then((id) => {
        idRef.current = id
        return id
      })
    }
    return criacaoRef.current
  }

  // Guarda os valores no navegador na hora (não perde ao recarregar).
  useEffect(() => {
    if (pronto) return
    try {
      localStorage.setItem(CHAVE, JSON.stringify({ id: idRef.current, valores: f }))
    } catch {
      /* sem espaço: segue sem persistir localmente */
    }
  }, [f, pronto])

  // Auto-save no servidor (com atraso), assim que houver um nome.
  useEffect(() => {
    if (pronto || !f.nome.trim()) return
    const t = setTimeout(async () => {
      try {
        setSalvo('salvando')
        const id = await garantirRascunho()
        if (id) await atualizarRascunhoCuidadora(id, { ...f, nome: f.nome.trim() })
        try {
          localStorage.setItem(CHAVE, JSON.stringify({ id: idRef.current, valores: f }))
        } catch {
          /* ignora */
        }
        setSalvo('salvo')
      } catch {
        // Falha silenciosa: não atrapalha o preenchimento; tenta de novo na próxima mudança.
        setSalvo('idle')
      }
    }, 900)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f, pronto])

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!f.nome.trim()) return
    setEnviando(true)
    setErro(null)
    try {
      const id = await garantirRascunho()
      if (id) await finalizarCuidadora(id, { ...f, nome: f.nome.trim() })
      else await cadastrarCuidadoraPublico({ ...f, nome: f.nome.trim() })
      try {
        localStorage.removeItem(CHAVE)
      } catch {
        /* ignora */
      }
      setPronto(true)
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err))
    } finally {
      setEnviando(false)
    }
  }

  if (pronto) {
    return (
      <div className="pub-wrap">
        <div className="pub-doc">
          <div className="pub-doc__head">
            <div className="eyebrow">Cadastro de cuidadora</div>
            <h1>Cadastro recebido! ✅</h1>
          </div>
          <p style={{ marginTop: '0.6rem', color: 'var(--t-500)', lineHeight: 1.6 }}>
            Obrigada! Seus dados foram enviados. Se ainda não mandou o <strong>comprovante de
            residência</strong> e a <strong>foto do documento com o CPF</strong> pelo WhatsApp, é só
            enviar. A Kelly vai revisar e entrar em contato com você.
          </p>
          <div className="pub-rodape">Sistema Visual de Publicações da Marca · KA</div>
        </div>
      </div>
    )
  }

  return (
    <div className="pub-wrap">
      <div className="pub-doc">
        <div className="pub-doc__head">
          <div className="eyebrow">Cadastro de cuidadora</div>
          <h1>Ficha de cadastro</h1>
          <div className="pub-doc__meta">
            Preencha os seus dados e envie os documentos pelo WhatsApp. Campos com * são
            obrigatórios. <strong>Vai salvando sozinho</strong> conforme você preenche.
          </div>
        </div>

        {erro && <div className="erro-msg" style={{ marginTop: '1rem' }}>{erro}</div>}

        <form onSubmit={(e) => void enviar(e)} style={{ marginTop: '1.2rem' }}>
          <div className="form-grade">
            <div className="field campo-toda">
              <label>Nome completo *</label>
              <input value={f.nome} onChange={(e) => campo('nome', e.target.value)} required />
            </div>
            <div className="field">
              <label>Telefone / WhatsApp *</label>
              <input
                value={f.telefone ?? ''}
                onChange={(e) => campo('telefone', e.target.value || null)}
                required
              />
            </div>
            <div className="field">
              <label>CPF *</label>
              <input value={f.cpf ?? ''} onChange={(e) => campo('cpf', e.target.value || null)} required />
            </div>
            <div className="field">
              <label>RG</label>
              <input value={f.rg ?? ''} onChange={(e) => campo('rg', e.target.value || null)} />
            </div>
            <div className="field">
              <label>PIS / NIT</label>
              <input
                value={f.pis ?? ''}
                onChange={(e) => campo('pis', e.target.value || null)}
                inputMode="numeric"
              />
            </div>
            <div className="field">
              <label>Data de nascimento</label>
              <input
                type="date"
                value={f.data_nascimento ?? ''}
                onChange={(e) => campo('data_nascimento', e.target.value || null)}
              />
            </div>
            <div className="field">
              <label>E-mail</label>
              <input type="email" value={f.email ?? ''} onChange={(e) => campo('email', e.target.value || null)} />
            </div>
            <div className="field campo-2">
              <label>Endereço</label>
              <input value={f.endereco ?? ''} onChange={(e) => campo('endereco', e.target.value || null)} />
            </div>
            <div className="field">
              <label>Cidade / UF</label>
              <input value={f.cidade ?? ''} onChange={(e) => campo('cidade', e.target.value || null)} />
            </div>
            <div className="field campo-toda">
              <label>Observações</label>
              <textarea
                rows={3}
                value={f.observacoes ?? ''}
                onChange={(e) => campo('observacoes', e.target.value || null)}
                placeholder="Experiência, disponibilidade de horários, referências…"
              />
            </div>
          </div>

          <h3 style={{ fontSize: '1rem', margin: '0.6rem 0 0.5rem' }}>Dados para pagamento (PIX)</h3>
          <div className="form-grade">
            <div className="field">
              <label>Chave PIX</label>
              <input
                value={f.pix_chave ?? ''}
                onChange={(e) => campo('pix_chave', e.target.value || null)}
                placeholder="telefone, CPF, e-mail ou chave aleatória"
              />
            </div>
            <div className="field">
              <label>Tipo da chave</label>
              <select value={f.pix_tipo ?? ''} onChange={(e) => campo('pix_tipo', e.target.value || null)}>
                <option value="">Escolher…</option>
                <option value="telefone">Telefone</option>
                <option value="cpf">CPF</option>
                <option value="email">E-mail</option>
                <option value="aleatoria">Chave aleatória</option>
              </select>
            </div>
            <div className="field campo-toda">
              <label>Banco</label>
              <input
                value={f.pix_banco ?? ''}
                onChange={(e) => campo('pix_banco', e.target.value || null)}
                placeholder="ex.: Nubank, Caixa, Itaú…"
              />
            </div>
          </div>

          <h3 style={{ fontSize: '1rem', margin: '0.6rem 0 0.5rem' }}>Documentos</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--t-500)', marginBottom: '0.6rem', lineHeight: 1.55 }}>
            Envie estes dois documentos <strong>pelo WhatsApp</strong> (é só tirar a foto e mandar):
          </p>
          <ul style={{ fontSize: '0.88rem', margin: '0 0 0.9rem', paddingLeft: '1.1rem', lineHeight: 1.7 }}>
            <li>Comprovante de residência atualizado</li>
            <li>Foto atualizada do seu documento com o CPF</li>
          </ul>
          <p style={{ marginBottom: '1.1rem' }}>
            <a className="btn btn--wpp" href={linkWhatsAppDocs(f.nome)} target="_blank" rel="noopener noreferrer">
              📲 Enviar documentos pelo WhatsApp
            </a>
          </p>

          <div className="pub-acoes" style={{ alignItems: 'center', gap: '0.8rem' }}>
            <button className="btn" type="submit" disabled={enviando || !f.nome.trim()}>
              {enviando ? 'Enviando…' : 'Enviar cadastro'}
            </button>
            <span style={{ fontSize: '0.78rem', color: 'var(--t-500)' }}>
              {salvo === 'salvando' ? 'Salvando…' : salvo === 'salvo' ? 'Salvo automaticamente ✓' : ''}
            </span>
          </div>
        </form>

        <div className="pub-rodape">Sistema Visual de Publicações da Marca · KA</div>
      </div>
    </div>
  )
}

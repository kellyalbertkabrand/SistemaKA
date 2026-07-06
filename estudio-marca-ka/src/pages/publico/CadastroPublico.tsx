import { useState, type FormEvent } from 'react'
import { cadastrarClientePublico, type FichaCliente } from '../../lib/gestao'
import '../../styles/gestao.css'

// Página pública de cadastro: o próprio cliente preenche a ficha dele e o
// registro entra na aba Clientes da KA. Link: /cadastro
export function CadastroPublico() {
  const [f, setF] = useState<FichaCliente & { nome_marca: string }>({ nome_marca: '' })
  const [enviando, setEnviando] = useState(false)
  const [pronto, setPronto] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function campo<K extends keyof (FichaCliente & { nome_marca: string })>(
    k: K,
    v: (FichaCliente & { nome_marca: string })[K],
  ) {
    setF((atual) => ({ ...atual, [k]: v }))
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!f.nome_marca.trim()) return
    setEnviando(true)
    setErro(null)
    try {
      await cadastrarClientePublico({ ...f, nome_marca: f.nome_marca.trim() })
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
            <div className="eyebrow">Cadastro · Kelly Albert — KA</div>
            <h1>Cadastro recebido! ✨</h1>
          </div>
          <p style={{ marginTop: '0.6rem', color: 'var(--t-600)', lineHeight: 1.6 }}>
            Obrigada! Recebemos os seus dados. A Kelly vai analisar e entrar em contato em breve.
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
          <div className="eyebrow">Cadastro · Kelly Albert — KA</div>
          <h1>Ficha de cadastro</h1>
          <div className="pub-doc__meta">
            Preencha os seus dados para começarmos. Campos com * são obrigatórios.
          </div>
        </div>

        {erro && <div className="erro-msg" style={{ marginTop: '1rem' }}>{erro}</div>}

        <form onSubmit={(e) => void enviar(e)} style={{ marginTop: '1.2rem' }}>
          <div className="form-grade">
            <div className="field campo-toda">
              <label>Nome da marca *</label>
              <input value={f.nome_marca} onChange={(e) => campo('nome_marca', e.target.value)} required />
            </div>
            <div className="field">
              <label>Responsável (seu nome)</label>
              <input value={f.responsavel ?? ''} onChange={(e) => campo('responsavel', e.target.value || null)} />
            </div>
            <div className="field">
              <label>E-mail</label>
              <input type="email" value={f.email_contato ?? ''} onChange={(e) => campo('email_contato', e.target.value || null)} />
            </div>
            <div className="field">
              <label>Telefone / WhatsApp</label>
              <input value={f.telefone ?? ''} onChange={(e) => campo('telefone', e.target.value || null)} />
            </div>
            <div className="field">
              <label>Instagram</label>
              <input value={f.instagram_handle ?? ''} onChange={(e) => campo('instagram_handle', e.target.value || null)} placeholder="@marca" />
            </div>
            <div className="field">
              <label>Segmento</label>
              <input value={f.segmento ?? ''} onChange={(e) => campo('segmento', e.target.value || null)} placeholder="ex.: decoração" />
            </div>
            <div className="field">
              <label>Site</label>
              <input value={f.site ?? ''} onChange={(e) => campo('site', e.target.value || null)} />
            </div>
            <div className="field campo-2">
              <label>Endereço</label>
              <input value={f.endereco ?? ''} onChange={(e) => campo('endereco', e.target.value || null)} />
            </div>
            <div className="field">
              <label>Cidade / UF</label>
              <input value={f.cidade ?? ''} onChange={(e) => campo('cidade', e.target.value || null)} />
            </div>
            <div className="field">
              <label>CPF / CNPJ</label>
              <input value={f.documento ?? ''} onChange={(e) => campo('documento', e.target.value || null)} />
            </div>
            <div className="field campo-toda">
              <label>Observações (o que você precisa)</label>
              <textarea
                rows={3}
                value={f.observacoes ?? ''}
                onChange={(e) => campo('observacoes', e.target.value || null)}
                placeholder="Conte um pouco sobre a sua marca e o que procura."
              />
            </div>
          </div>

          <div className="pub-acoes">
            <button className="btn" type="submit" disabled={enviando || !f.nome_marca.trim()}>
              {enviando ? 'Enviando…' : 'Enviar cadastro'}
            </button>
          </div>
        </form>

        <div className="pub-rodape">Sistema Visual de Publicações da Marca · KA</div>
      </div>
    </div>
  )
}

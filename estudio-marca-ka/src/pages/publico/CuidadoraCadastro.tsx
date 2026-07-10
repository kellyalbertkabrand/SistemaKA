import { useRef, useState, type FormEvent } from 'react'
import {
  cadastrarCuidadoraPublico,
  prepararArquivo,
  type FichaCuidadora,
  type PreparadoParaAnexo,
} from '../../lib/cuidadoras'
import '../../styles/gestao.css'

// Página pública: a pessoa que vai começar a trabalhar preenche a própria
// ficha e anexa os documentos. Link: /cadastro-cuidadora
export function CuidadoraCadastro() {
  const [f, setF] = useState<FichaCuidadora>({ nome: '' })
  const [arquivos, setArquivos] = useState<PreparadoParaAnexo[]>([])
  const [preparando, setPreparando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [pronto, setPronto] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function campo<K extends keyof FichaCuidadora>(k: K, v: FichaCuidadora[K]) {
    setF((atual) => ({ ...atual, [k]: v }))
  }

  async function escolherArquivos(files: FileList | null) {
    if (!files?.length) return
    setPreparando(true)
    setErro(null)
    try {
      const novos: PreparadoParaAnexo[] = []
      for (const file of Array.from(files)) {
        novos.push(await prepararArquivo(file))
      }
      setArquivos((atual) => [...atual, ...novos])
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setPreparando(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!f.nome.trim()) return
    setEnviando(true)
    setErro(null)
    try {
      await cadastrarCuidadoraPublico({ ...f, nome: f.nome.trim() }, arquivos)
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
            Obrigada! Seus dados e documentos foram enviados com sucesso. A Kelly vai revisar e
            entrar em contato com você.
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
            Preencha os seus dados e anexe os documentos pedidos. Campos com * são obrigatórios.
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

          <h3 style={{ fontSize: '1rem', margin: '0.6rem 0 0.5rem' }}>Documentos</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--t-500)', marginBottom: '0.8rem' }}>
            Anexe fotos do RG e do CPF (frente e verso) e um comprovante de endereço. Pode tirar a
            foto na hora pelo celular — as imagens são compactadas sozinhas.
          </p>

          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,.pdf"
            style={{ display: 'none' }}
            onChange={(e) => void escolherArquivos(e.target.files)}
          />
          <p style={{ marginBottom: '0.8rem' }}>
            <button
              type="button"
              className="btn--voltar"
              disabled={preparando}
              onClick={() => inputRef.current?.click()}
            >
              {preparando ? 'Processando…' : '+ Anexar documento'}
            </button>
          </p>

          {arquivos.length > 0 && (
            <ul style={{ listStyle: 'none', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {arquivos.map((a, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.82rem' }}>
                  {a.tipo.startsWith('image/') ? (
                    <img
                      src={a.dataUrl}
                      alt=""
                      style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(15,25,35,0.1)' }}
                    />
                  ) : (
                    <span>📄</span>
                  )}
                  <span style={{ flex: 1 }}>{a.nome}</span>
                  <button
                    type="button"
                    className="btn-mini btn-mini--perigo"
                    onClick={() => setArquivos((atual) => atual.filter((_, idx) => idx !== i))}
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="pub-acoes">
            <button className="btn" type="submit" disabled={enviando || preparando || !f.nome.trim()}>
              {enviando ? 'Enviando…' : 'Enviar cadastro'}
            </button>
          </div>
        </form>

        <div className="pub-rodape">Sistema Visual de Publicações da Marca · KA</div>
      </div>
    </div>
  )
}

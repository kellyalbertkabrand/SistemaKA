import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  anexarDocumento,
  baixarDocumento,
  criarCuidadora,
  excluirCuidadora,
  linkPublicoCadastroCuidadora,
  listarCuidadoras,
  listarDocumentos,
  marcarCuidadoraRevisada,
  prepararArquivo,
  removerDocumento,
  salvarCuidadora,
  type Cuidadora,
  type CuidadoraStatus,
  type DocumentoCuidadora,
  type FichaCuidadora,
} from '../../lib/cuidadoras'
import { formatarData } from '../../lib/gestao'

const BADGE_CUIDADORA: Record<CuidadoraStatus, string> = {
  pendente: 'badge--dourado',
  ativa: 'badge--verde',
  inativa: 'badge--cinza',
}

// CUIDADORAS — controle pessoal da KA: cadastro (manual ou pelo link público),
// ficha com os dados e documentos anexados de cada cuidadora.
export function GestaoCuidadoras() {
  const [lista, setLista] = useState<Cuidadora[]>([])
  const [sel, setSel] = useState<Cuidadora | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)

  async function recarregar() {
    try {
      setCarregando(true)
      setLista(await listarCuidadoras())
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

  async function copiarLinkCadastro() {
    await navigator.clipboard.writeText(linkPublicoCadastroCuidadora())
    setMsg(
      'Link de cadastro copiado. Envie por WhatsApp para a pessoa que vai começar. ' +
        'Ela preenche os dados, anexa os documentos e aparece aqui como "pendente".',
    )
    setTimeout(() => setMsg(null), 6000)
  }

  async function nova() {
    const nome = window.prompt('Nome da cuidadora:')
    if (!nome?.trim()) return
    try {
      const c = await criarCuidadora({ nome: nome.trim() })
      await recarregar()
      setSel(c)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    }
  }

  function abrir(c: Cuidadora) {
    setSel(c)
    if (!c.revisado) void marcarCuidadoraRevisada(c.id)
  }

  if (sel) {
    return (
      <FichaCuidadoraView
        cuidadora={sel}
        aoVoltar={() => {
          setSel(null)
          void recarregar()
        }}
      />
    )
  }

  return (
    <>
      <div className="gestao-acoes">
        <button className="btn" onClick={() => void copiarLinkCadastro()}>
          Copiar link de cadastro
        </button>
        <button className="btn--voltar" onClick={() => void nova()}>
          + Nova cuidadora
        </button>
        <span className="espaco" />
      </div>

      {erro && <div className="erro-msg">{erro}</div>}
      {msg && <div className="nota">{msg}</div>}
      {carregando && <p style={{ color: 'var(--t-500)', fontSize: '0.85rem' }}>Carregando…</p>}

      {!carregando && lista.length === 0 && !erro && (
        <div className="card">
          <h3>Nenhuma cuidadora cadastrada ainda.</h3>
          <p>
            Use “Copiar link de cadastro” e envie para a pessoa que vai começar a trabalhar. Ela
            preenche a própria ficha e anexa os documentos. Ou cadastre você mesma em “+ Nova
            cuidadora”.
          </p>
        </div>
      )}

      {lista.length > 0 && (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone</th>
                <th>Início</th>
                <th>Status</th>
                <th className="acoes"></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id}>
                  <td className="cel-nome" data-label="Nome">
                    <button className="cel-abrir" onClick={() => abrir(c)} title="Abrir ficha">
                      <strong>{c.nome}</strong>
                    </button>
                    {!c.revisado && (
                      <span className="badge badge--vermelho" style={{ marginLeft: 8 }}>
                        novo
                      </span>
                    )}
                  </td>
                  <td data-label="Telefone">{c.telefone || '-'}</td>
                  <td data-label="Início">{c.inicio ? formatarData(c.inicio) : '-'}</td>
                  <td data-label="Status">
                    <span className={`badge ${BADGE_CUIDADORA[c.status]}`}>{c.status}</span>
                  </td>
                  <td className="acoes">
                    <button className="btn-mini" onClick={() => abrir(c)}>
                      Abrir ficha
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Ficha da cuidadora: dados + documentos anexados.
// ---------------------------------------------------------------------------
function FichaCuidadoraView({ cuidadora, aoVoltar }: { cuidadora: Cuidadora; aoVoltar: () => void }) {
  const [f, setF] = useState<FichaCuidadora>({ ...cuidadora })
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  function campo<K extends keyof FichaCuidadora>(k: K, v: FichaCuidadora[K]) {
    setF((atual) => ({ ...atual, [k]: v }))
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro(null)
    try {
      await salvarCuidadora(cuidadora.id, f)
      setMsg('Ficha salva.')
      setTimeout(() => setMsg(null), 2500)
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err))
    } finally {
      setSalvando(false)
    }
  }

  async function excluir() {
    if (!window.confirm(`Excluir ${cuidadora.nome} e todos os documentos anexados? Não dá para desfazer.`)) return
    try {
      await excluirCuidadora(cuidadora.id)
      aoVoltar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <>
      <p style={{ marginBottom: '1rem' }}>
        <button className="btn--voltar" onClick={aoVoltar}>
          ← Todas as cuidadoras
        </button>
      </p>

      <div className="card">
        <h3>Ficha da cuidadora</h3>
        <p style={{ marginBottom: '1rem' }}>
          {cuidadora.origem === 'auto-cadastro'
            ? 'Cadastro feito pela própria pessoa pelo link. Revise os dados e mude o status para "ativa" quando começar.'
            : 'Dados pessoais e do trabalho. Só você enxerga esta área.'}
        </p>
        {erro && <div className="erro-msg">{erro}</div>}

        <form onSubmit={(e) => void salvar(e)}>
          <div className="form-grade">
            <div className="field campo-2">
              <label>Nome completo</label>
              <input value={f.nome ?? ''} onChange={(e) => campo('nome', e.target.value)} required />
            </div>
            <div className="field">
              <label>Telefone / WhatsApp</label>
              <input value={f.telefone ?? ''} onChange={(e) => campo('telefone', e.target.value || null)} />
            </div>
            <div className="field">
              <label>CPF</label>
              <input value={f.cpf ?? ''} onChange={(e) => campo('cpf', e.target.value || null)} />
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
            <div className="field">
              <label>Início do trabalho</label>
              <input type="date" value={f.inicio ?? ''} onChange={(e) => campo('inicio', e.target.value || null)} />
            </div>
            <div className="field">
              <label>Status</label>
              <select value={f.status ?? 'pendente'} onChange={(e) => campo('status', e.target.value as CuidadoraStatus)}>
                <option value="pendente">pendente (aguardando revisão)</option>
                <option value="ativa">ativa (trabalhando)</option>
                <option value="inativa">inativa (não trabalha mais)</option>
              </select>
            </div>
            <div className="field campo-toda">
              <label>Observações</label>
              <textarea
                rows={3}
                value={f.observacoes ?? ''}
                onChange={(e) => campo('observacoes', e.target.value || null)}
                placeholder="Horários, combinados, referências, contato de emergência…"
              />
            </div>
          </div>

          <p style={{ display: 'flex', gap: '0.7rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn" type="submit" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar ficha'}
            </button>
            {msg && <span style={{ color: '#2e6b45', fontSize: '0.8rem' }}>{msg}</span>}
            <span className="espaco" style={{ flex: 1 }} />
            <button type="button" className="btn-mini btn-mini--perigo" onClick={() => void excluir()}>
              Excluir cuidadora
            </button>
          </p>
        </form>
      </div>

      <Documentos cuidadora={cuidadora} />
    </>
  )
}

// ---------------------------------------------------------------------------
// Documentos anexados (RG, CPF, comprovante de endereço, contrato…).
// ---------------------------------------------------------------------------
function Documentos({ cuidadora }: { cuidadora: Cuidadora }) {
  const [docs, setDocs] = useState<DocumentoCuidadora[]>([])
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function recarregar() {
    try {
      setDocs(await listarDocumentos(cuidadora.id))
      setErro(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    }
  }

  useEffect(() => {
    void recarregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuidadora.id])

  async function anexar(files: FileList | null) {
    if (!files?.length) return
    setEnviando(true)
    setErro(null)
    try {
      for (const file of Array.from(files)) {
        const preparado = await prepararArquivo(file)
        await anexarDocumento(cuidadora.id, preparado)
      }
      await recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setEnviando(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function remover(d: DocumentoCuidadora) {
    if (!window.confirm(`Excluir o documento "${d.nome}"?`)) return
    try {
      await removerDocumento(cuidadora.id, d.id)
      await recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="card">
      <h3>Documentos</h3>
      <p style={{ marginBottom: '0.9rem' }}>
        RG, CPF, comprovante de endereço, contrato assinado… Fotos são comprimidas sozinhas; PDFs
        valem até ~600 KB.
      </p>

      {erro && <div className="erro-msg">{erro}</div>}

      <p style={{ marginBottom: '1rem' }}>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.pdf"
          style={{ display: 'none' }}
          onChange={(e) => void anexar(e.target.files)}
        />
        <button className="btn" disabled={enviando} onClick={() => inputRef.current?.click()}>
          {enviando ? 'Enviando…' : '+ Anexar documento'}
        </button>
      </p>

      {docs.length === 0 ? (
        <p style={{ color: 'var(--t-500)', fontSize: '0.82rem' }}>Nenhum documento anexado ainda.</p>
      ) : (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Enviado em</th>
                <th className="acoes"></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td>
                    {d.tipo.startsWith('image/') ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                        <img
                          src={d.dataUrl}
                          alt=""
                          style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(15,25,35,0.1)' }}
                        />
                        {d.nome}
                      </span>
                    ) : (
                      <span>📄 {d.nome}</span>
                    )}
                  </td>
                  <td>{formatarData(d.criado_em)}</td>
                  <td className="acoes">
                    <button className="btn-mini" onClick={() => baixarDocumento(d)}>
                      Baixar
                    </button>
                    <button className="btn-mini btn-mini--perigo" onClick={() => void remover(d)}>
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

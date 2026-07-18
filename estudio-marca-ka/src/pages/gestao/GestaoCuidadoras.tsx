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
  mensagemDadosCuidadora,
  prepararArquivo,
  removerDocumento,
  salvarCuidadora,
  type Cuidadora,
  type CuidadoraStatus,
  type DocumentoCuidadora,
  type FichaCuidadora,
} from '../../lib/cuidadoras'
import { formatarData } from '../../lib/gestao'
import { abrirWhatsApp } from '../../lib/whatsapp'
import { confirmar } from '../../lib/confirmar'
import { useToast } from '../../components/Toast'
import { useCopiar } from '../../hooks/useCopiar'
import { useFichaUrl } from '../../hooks/useFichaUrl'
import { rotuloStatus } from '../../lib/rotulos'
import { Busca, normalizar } from '../../components/Busca'

const BADGE_CUIDADORA: Record<CuidadoraStatus, string> = {
  pendente: 'badge--dourado',
  ativa: 'badge--verde',
  inativa: 'badge--cinza',
}

// CUIDADORAS — controle pessoal da KA: cadastro (manual ou pelo link público),
// ficha com os dados e documentos anexados de cada cuidadora.
export function GestaoCuidadoras() {
  const { mostrar } = useToast()
  const copiar = useCopiar()
  const { idAberto, abrir: abrirUrl, fechar } = useFichaUrl('id')
  const [lista, setLista] = useState<Cuidadora[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')

  const listaFiltrada = (() => {
    const q = normalizar(busca).trim()
    if (!q) return lista
    return lista.filter((c) =>
      normalizar(`${c.nome} ${c.telefone ?? ''} ${c.cpf ?? ''}`).includes(q),
    )
  })()

  // Ficha aberta vem da URL (?id=<uuid>): F5 e "voltar" do navegador funcionam.
  const sel: Cuidadora | null = idAberto ? (lista.find((c) => c.id === idAberto) ?? null) : null

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
    await copiar(
      linkPublicoCadastroCuidadora(),
      'Link de cadastro copiado. Envie no WhatsApp para a pessoa preencher a ficha.',
    )
  }

  // Cria uma ficha em branco e abre para preencher — sem window.prompt (que o
  // Safari do iPhone suprime, fazendo o botão "não fazer nada").
  async function nova() {
    if (criando) return
    setCriando(true)
    try {
      const c = await criarCuidadora({ nome: 'Nova cuidadora' })
      setLista((l) => [c, ...l])
      abrirUrl(c.id)
      mostrar('Ficha criada — preencha o nome e os dados.', 'ok')
    } catch (e) {
      mostrar(e instanceof Error ? e.message : String(e), 'erro')
    } finally {
      setCriando(false)
    }
  }

  function abrir(c: Cuidadora) {
    abrirUrl(c.id)
    if (!c.revisado) void marcarCuidadoraRevisada(c.id)
  }

  async function excluir(c: Cuidadora) {
    if (!(await confirmar(`Excluir ${c.nome} e todos os documentos? Não dá para desfazer.`, { perigo: true, confirmar: 'Excluir' }))) return
    setLista((l) => l.filter((x) => x.id !== c.id))
    try {
      await excluirCuidadora(c.id)
      mostrar('Cuidadora excluída.', 'ok')
    } catch (e) {
      mostrar(e instanceof Error ? e.message : String(e), 'erro')
      void recarregar()
    }
  }

  if (sel) {
    return (
      <FichaCuidadoraView
        key={sel.id}
        cuidadora={sel}
        aoVoltar={() => {
          fechar()
          void recarregar()
        }}
      />
    )
  }

  return (
    <>
      <div className="gestao-acoes">
        <button className="btn" onClick={() => void nova()} disabled={criando}>
          + Nova cuidadora
        </button>
        <button className="btn--ghost" onClick={() => void copiarLinkCadastro()}>
          Copiar link de cadastro
        </button>
        <span className="espaco" />
      </div>

      {erro && <div className="erro-msg">{erro}</div>}
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
        <Busca valor={busca} aoMudar={setBusca} placeholder="Buscar cuidadora por nome, telefone…" />
      )}
      {lista.length > 0 && listaFiltrada.length === 0 && (
        <p className="ativ-vazio">Nenhuma cuidadora encontrada para “{busca}”.</p>
      )}

      {listaFiltrada.length > 0 && (
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
              {listaFiltrada.map((c) => (
                <tr key={c.id}>
                  <td className="cel-nome" data-label="Nome">
                    <button className="cel-abrir" onClick={() => abrir(c)} title="Abrir ficha">
                      <strong>{c.nome}</strong>
                    </button>
                    {!c.revisado && (
                      <span className="badge badge--verde" style={{ marginLeft: 8 }}>
                        NOVO
                      </span>
                    )}
                  </td>
                  <td data-label="Telefone">{c.telefone || '-'}</td>
                  <td data-label="Início">{c.inicio ? formatarData(c.inicio) : '-'}</td>
                  <td data-label="Status">
                    <span className={`badge ${BADGE_CUIDADORA[c.status]}`}>{rotuloStatus('cuidadora', c.status)}</span>
                  </td>
                  <td className="acoes">
                    <button className="btn-mini" onClick={() => abrir(c)} title="Abrir ficha">
                      Abrir
                    </button>
                    <button className="btn-mini btn-mini--perigo" onClick={() => void excluir(c)} title="Excluir">
                      ✕
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
    if (!(await confirmar(`Excluir ${cuidadora.nome} e todos os documentos anexados? Não dá para desfazer.`, { perigo: true, confirmar: 'Excluir' }))) return
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
              <input type="tel" inputMode="tel" value={f.telefone ?? ''} onChange={(e) => campo('telefone', e.target.value || null)} />
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
              <label>PIS / NIT</label>
              <input value={f.pis ?? ''} inputMode="numeric" onChange={(e) => campo('pis', e.target.value || null)} />
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

          <h3 style={{ fontSize: '1rem', margin: '0.4rem 0 0.5rem' }}>Dados para pagamento (PIX)</h3>
          <div className="form-grade">
            <div className="field">
              <label>Chave PIX</label>
              <input value={f.pix_chave ?? ''} onChange={(e) => campo('pix_chave', e.target.value || null)} />
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
            <div className="field">
              <label>Banco</label>
              <input value={f.pix_banco ?? ''} onChange={(e) => campo('pix_banco', e.target.value || null)} placeholder="ex.: Nubank" />
            </div>
          </div>

          <p style={{ display: 'flex', gap: '0.7rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn" type="submit" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar ficha'}
            </button>
            <button
              type="button"
              className="btn--voltar btn--voltar-whats"
              onClick={() =>
                abrirWhatsApp(
                  null,
                  mensagemDadosCuidadora({ ...cuidadora, ...f } as Cuidadora),
                  cuidadora.nome,
                )
              }
            >
              Enviar dados no WhatsApp
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
    if (!(await confirmar(`Excluir o documento "${d.nome}"?`, { perigo: true, confirmar: 'Excluir' }))) return
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
        {docs.length > 0 && (
          <button
            type="button"
            className="btn--voltar"
            style={{ marginLeft: '0.6rem' }}
            onClick={() => docs.forEach((d, i) => setTimeout(() => baixarDocumento(d), i * 400))}
          >
            Baixar todos ({docs.length})
          </button>
        )}
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

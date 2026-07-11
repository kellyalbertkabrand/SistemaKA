import { useEffect, useState, type FormEvent } from 'react'
import type { Cliente, Usuario } from '../../lib/database.types'
import {
  criarCliente,
  listarClientes,
  listarUsuariosDoCliente,
  listarUsuariosSemVinculo,
  vincularUsuario,
  desvincularUsuario,
} from '../../lib/api'
import {
  convidarUsuario,
  excluirCliente,
  formatarBRL,
  linkPublicoCadastro,
  marcarClienteRevisado,
  salvarFichaCliente,
  type FichaCliente,
} from '../../lib/gestao'

/** Cadastro que veio do link público e a KA ainda não abriu. */
function ehNovo(c: Cliente): boolean {
  return c.origem === 'auto-cadastro' && !c.revisado
}

// Clientes & Acessos: ficha completa de cada cliente (dados cadastrais,
// cobrança/mensalidade) + quem tem login vinculado à marca.
export function GestaoClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [sel, setSel] = useState<Cliente | 'novo' | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)

  async function copiarLinkCadastro() {
    await navigator.clipboard.writeText(linkPublicoCadastro())
    setMsg('Link de cadastro copiado! Envie ao cliente para ele preencher a ficha.')
    setTimeout(() => setMsg(null), 5000)
  }

  // Abrir a ficha de um cadastro novo já o marca como visto (tira o "NOVO").
  function abrir(c: Cliente) {
    if (ehNovo(c)) void marcarClienteRevisado(c.id).catch(() => {})
    setSel(c)
  }

  async function excluir(c: Cliente) {
    if (
      !window.confirm(
        `Excluir o cliente "${c.nome_marca}"? A ficha e os acessos somem de vez. ` +
          'Orçamentos, contratos e cobranças ligados a ele NÃO são apagados junto. ' +
          'Se também forem teste, apague-os nas outras abas.',
      )
    )
      return
    try {
      await excluirCliente(c.id)
      await recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    }
  }

  const novos = clientes.filter(ehNovo).length

  async function recarregar() {
    try {
      setCarregando(true)
      const lista = await listarClientes()
      setClientes(lista)
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

  if (sel) {
    return (
      <FichaDoCliente
        cliente={sel === 'novo' ? null : sel}
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
        <span className="espaco" />
        <button className="btn--voltar" onClick={() => void copiarLinkCadastro()}>
          Copiar link de cadastro
        </button>
        <button className="btn" onClick={() => setSel('novo')}>
          + Novo cliente
        </button>
      </div>

      {novos > 0 && (
        <div className="nota" style={{ borderLeft: '3px solid #2e6b45' }}>
          🔔 Você tem <strong>{novos}</strong>{' '}
          {novos === 1 ? 'novo cadastro' : 'novos cadastros'} pelo link, marcados com{' '}
          <span className="badge badge--verde">NOVO</span> na lista abaixo. Abra a ficha para revisar.
        </div>
      )}
      {msg && <div className="nota">{msg}</div>}
      {erro && <div className="erro-msg">{erro}</div>}
      {carregando && <p style={{ color: 'var(--t-500)', fontSize: '0.85rem' }}>Carregando…</p>}

      {!carregando && clientes.length === 0 && !erro && (
        <div className="card">
          <h3>Nenhum cliente cadastrado no banco ainda.</h3>
          <p>
            Crie o primeiro com “+ Novo cliente”. (Os templates do estúdio continuam funcionando
            de forma independente; o cadastro aqui organiza dados, acessos e cobrança.)
          </p>
        </div>
      )}

      {clientes.length > 0 && (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Marca</th>
                <th>Responsável</th>
                <th>Contato</th>
                <th>Mensalidade</th>
                <th>Status</th>
                <th className="acoes"></th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.nome_marca}</strong>
                    {c.slug && (
                      <span style={{ color: 'var(--t-400)', marginLeft: 6 }}>/{c.slug}</span>
                    )}
                    {ehNovo(c) && (
                      <span className="badge badge--verde" style={{ marginLeft: 8 }}>
                        NOVO
                      </span>
                    )}
                  </td>
                  <td>{c.responsavel || '-'}</td>
                  <td>{c.telefone || c.email_contato || '-'}</td>
                  <td className="num">
                    {c.cobranca_ativa && c.valor_mensalidade
                      ? `${formatarBRL(c.valor_mensalidade)} · dia ${c.dia_vencimento}`
                      : '-'}
                  </td>
                  <td>
                    <span className={`badge ${c.status === 'ativo' ? 'badge--verde' : 'badge--cinza'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="acoes">
                    <button className="btn-mini" onClick={() => abrir(c)}>
                      Abrir ficha
                    </button>
                    <button className="btn-mini btn-mini--perigo" onClick={() => void excluir(c)}>
                      Excluir
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
// Ficha do cliente: dados cadastrais + cobrança + acessos.
// ---------------------------------------------------------------------------
function FichaDoCliente({ cliente, aoVoltar }: { cliente: Cliente | null; aoVoltar: () => void }) {
  const criando = !cliente
  const [f, setF] = useState<FichaCliente>(
    cliente ? { ...cliente } : { status: 'ativo', dia_vencimento: 10, cobranca_ativa: false },
  )
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  function campo<K extends keyof FichaCliente>(k: K, v: FichaCliente[K]) {
    setF((atual) => ({ ...atual, [k]: v }))
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!f.nome_marca?.trim()) {
      setErro('Informe o nome da marca.')
      return
    }
    setSalvando(true)
    setErro(null)
    const dados: FichaCliente = {
      ...f,
      nome_marca: f.nome_marca.trim(),
      valor_mensalidade:
        f.valor_mensalidade == null || Number.isNaN(Number(f.valor_mensalidade))
          ? null
          : Number(f.valor_mensalidade),
      dia_vencimento: Math.min(28, Math.max(1, Number(f.dia_vencimento) || 10)),
    }
    try {
      if (criando) {
        // Cria o cliente e já grava a ficha completa; volta para a lista.
        const novo = await criarCliente({
          nome_marca: dados.nome_marca!,
          instagram_handle: dados.instagram_handle ?? null,
          segmento: dados.segmento ?? null,
          site: dados.site ?? null,
        })
        await salvarFichaCliente(novo.id, dados)
        aoVoltar()
        return
      }
      await salvarFichaCliente(cliente!.id, dados)
      setMsg('Ficha salva.')
      setTimeout(() => setMsg(null), 2500)
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
      <p style={{ marginBottom: '1rem' }}>
        <button className="btn--voltar" onClick={aoVoltar}>
          ← Todos os clientes
        </button>
      </p>

      <div className="card">
        <h3>{criando ? 'Novo cliente' : 'Ficha do cliente'}</h3>
        <p style={{ marginBottom: '1rem' }}>
          Dados cadastrais e de contato, ficam guardados aqui, num lugar só.
        </p>
        {erro && <div className="erro-msg">{erro}</div>}
        <form onSubmit={(e) => void salvar(e)}>
          <div className="form-grade">
            <div className="field">
              <label>Nome da marca</label>
              <input value={f.nome_marca ?? ''} onChange={(e) => campo('nome_marca', e.target.value)} required />
            </div>
            <div className="field">
              <label>Slug (marca no estúdio)</label>
              <input
                value={f.slug ?? ''}
                onChange={(e) => campo('slug', e.target.value.trim().toLowerCase() || null)}
                placeholder="ex.: shapes"
              />
            </div>
            <div className="field">
              <label>Responsável</label>
              <input value={f.responsavel ?? ''} onChange={(e) => campo('responsavel', e.target.value || null)} />
            </div>
            <div className="field">
              <label>E-mail de contato</label>
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
              <label>Status</label>
              <select value={f.status ?? 'ativo'} onChange={(e) => campo('status', e.target.value as Cliente['status'])}>
                <option value="ativo">ativo</option>
                <option value="pausado">pausado</option>
              </select>
            </div>
            <div className="field campo-toda">
              <label>Observações</label>
              <textarea
                rows={3}
                value={f.observacoes ?? ''}
                onChange={(e) => campo('observacoes', e.target.value || null)}
                placeholder="Anotações internas sobre o cliente (briefing, preferências, histórico…)"
              />
            </div>
          </div>

          <h3 style={{ margin: '0.6rem 0 0.8rem' }}>Cobrança</h3>
          <div className="form-grade">
            <div className="field">
              <label>CPF/CNPJ (boleto)</label>
              <input value={f.documento ?? ''} onChange={(e) => campo('documento', e.target.value || null)} />
            </div>
            <div className="field">
              <label>E-mail de cobrança</label>
              <input type="email" value={f.email_cobranca ?? ''} onChange={(e) => campo('email_cobranca', e.target.value || null)} />
            </div>
            <div className="field">
              <label>Mensalidade (R$)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={f.valor_mensalidade ?? ''}
                onChange={(e) => campo('valor_mensalidade', e.target.value === '' ? null : Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>Dia do vencimento</label>
              <input
                type="number"
                min={1}
                max={28}
                value={f.dia_vencimento ?? 10}
                onChange={(e) => campo('dia_vencimento', Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>Cobrança mensal ativa?</label>
              <select
                value={f.cobranca_ativa ? 'sim' : 'nao'}
                onChange={(e) => campo('cobranca_ativa', e.target.value === 'sim')}
              >
                <option value="nao">não</option>
                <option value="sim">sim, gerar mensalidade</option>
              </select>
            </div>
          </div>

          <p style={{ display: 'flex', gap: '0.7rem', alignItems: 'center' }}>
            <button className="btn" type="submit" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar ficha'}
            </button>
            {msg && <span style={{ color: '#2e6b45', fontSize: '0.8rem' }}>{msg}</span>}
          </p>
        </form>
      </div>

      {cliente ? (
        <Acessos cliente={cliente} slug={f.slug ?? null} />
      ) : (
        <p style={{ color: 'var(--t-500)', fontSize: '0.82rem', marginTop: '1rem' }}>
          Salve a ficha para poder convidar acessos deste cliente.
        </p>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Acessos: usuários com login vinculado a este cliente + convite por e-mail.
// ---------------------------------------------------------------------------
function Acessos({ cliente, slug }: { cliente: Cliente; slug: string | null }) {
  const [vinculados, setVinculados] = useState<Usuario[]>([])
  const [candidatos, setCandidatos] = useState<Usuario[]>([])
  const [email, setEmail] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function recarregar() {
    try {
      const [v, c] = await Promise.all([
        listarUsuariosDoCliente(cliente.id),
        listarUsuariosSemVinculo(),
      ])
      setVinculados(v)
      setCandidatos(c)
      setErro(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    }
  }

  useEffect(() => {
    void recarregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente.id])

  async function convidar(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setOcupado(true)
    setErro(null)
    setMsg(null)
    try {
      await convidarUsuario(email.trim().toLowerCase(), cliente.id, slug)
      setMsg(`Convite enviado para ${email.trim()}. A pessoa recebe um link para criar a senha.`)
      setEmail('')
      await recarregar()
    } catch (err) {
      setErro(
        (err instanceof Error ? err.message : String(err)) +
          ', se a função "convidar-usuario" ainda não foi publicada no Supabase, convide pelo ' +
          'painel (Authentication → Users → Invite user) e depois vincule aqui embaixo.',
      )
    } finally {
      setOcupado(false)
    }
  }

  async function vincular(u: Usuario) {
    setOcupado(true)
    try {
      await vincularUsuario(u.id, cliente.id)
      await recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(false)
    }
  }

  async function desvincular(u: Usuario) {
    if (!window.confirm(`Remover o acesso de ${u.email} a ${cliente.nome_marca}?`)) return
    setOcupado(true)
    try {
      await desvincularUsuario(u.id)
      await recarregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="card">
      <h3>Acessos</h3>
      <p style={{ marginBottom: '0.9rem' }}>
        Quem pode entrar no sistema e ver o estúdio da marca <strong>{cliente.nome_marca}</strong>.
      </p>

      {erro && <div className="erro-msg">{erro}</div>}
      {msg && <div className="nota">{msg}</div>}

      <form onSubmit={(e) => void convidar(e)} style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.1rem' }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e-mail do cliente"
          style={{
            flex: '1 1 240px',
            fontFamily: 'var(--body)',
            fontSize: '16px',
            border: '1px solid rgba(15,25,35,0.12)',
            borderRadius: 8,
            padding: '0.7rem 0.8rem',
            background: 'var(--bg-1)',
          }}
        />
        <button className="btn" disabled={ocupado || !email.trim()}>
          Convidar por e-mail
        </button>
      </form>

      {vinculados.length > 0 ? (
        <div className="tabela-wrap" style={{ marginBottom: '1rem' }}>
          <table className="tabela">
            <thead>
              <tr>
                <th>E-mail</th>
                <th>Papel</th>
                <th className="acoes"></th>
              </tr>
            </thead>
            <tbody>
              {vinculados.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>
                    <span className="badge badge--azul">{u.papel}</span>
                  </td>
                  <td className="acoes">
                    <button className="btn-mini btn-mini--perigo" disabled={ocupado} onClick={() => void desvincular(u)}>
                      Remover acesso
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ color: 'var(--t-500)', fontSize: '0.82rem', marginBottom: '1rem' }}>
          Nenhum login vinculado a este cliente ainda.
        </p>
      )}

      {candidatos.length > 0 && (
        <>
          <h3 style={{ fontSize: '0.95rem' }}>Logins sem vínculo</h3>
          <p style={{ color: 'var(--t-500)', fontSize: '0.8rem', marginBottom: '0.6rem' }}>
            Pessoas que já criaram login mas ainda não foram ligadas a uma marca.
          </p>
          <div className="tabela-wrap">
            <table className="tabela">
              <tbody>
                {candidatos.map((u) => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td className="acoes">
                      <button className="btn-mini" disabled={ocupado} onClick={() => void vincular(u)}>
                        Vincular a {cliente.nome_marca}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

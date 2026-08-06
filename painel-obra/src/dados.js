// Camada de dados: concentra TODO o acesso ao Firebase (Firestore + Auth).
// As telas (views) só chamam estas funções — não conhecem o Firestore direto.
//
// Coleções (nível superior). O ID da obra É o slug, para o painel público e o
// cadastro lerem por getDoc direto (sem índices) e as Regras liberarem por dono
// ou por obra publicada:
//   obras/{slug}         -> nome, cliente, slug, orcamento, publicado, ownerId, criadoEm
//   etapas/{id}          -> obraId(slug), nome, orcado, ownerId, criadoEm
//   lancamentos/{id}     -> obraId(slug), etapa, descricao, valor, status, data, ownerId, criadoEm
//   convites/{token}     -> rotulo, obraId, ownerId, criadoEm        (link de autopreenchimento)
//   clientes/{id}        -> token, ownerId, nome, email, telefone, documento, cidade, endereco, observacoes, criadoEm
//   fornecedores/{id}    -> nome, categoria, telefone, email, cnpj, observacoes, ownerId, criadoEm

import { auth, db } from './firebase.js';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  query,
  where,
} from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Autenticação (escritório)
// ---------------------------------------------------------------------------
export function entrar(email, senha) {
  return signInWithEmailAndPassword(auth, email, senha);
}
export function sair() {
  return signOut(auth);
}
export function aoMudarAuth(cb) {
  return onAuthStateChanged(auth, cb);
}
export function usuarioAtual() {
  return auth?.currentUser ?? null;
}
// Envia o e-mail de redefinição de senha (funciona mesmo se esqueceu a atual).
export function redefinirSenha(email) {
  return sendPasswordResetEmail(auth, email);
}
const uid = () => auth?.currentUser?.uid;

const docsComId = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

// ---------------------------------------------------------------------------
// Obras (docId = slug)
// ---------------------------------------------------------------------------
export async function listarObras() {
  // Escritório único: lista todas as obras (a regra já exige estar logado).
  const snap = await getDocs(collection(db, 'obras'));
  const obras = docsComId(snap);
  obras.sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
  return obras;
}

export async function slugExiste(slug) {
  const d = await getDoc(doc(db, 'obras', slug));
  return d.exists();
}

export async function criarObra({ nome, cliente, slug, orcamento, percentualEscritorio, publicado }) {
  await setDoc(doc(db, 'obras', slug), {
    nome,
    cliente: cliente ?? null,
    slug,
    orcamento: Number(orcamento || 0),
    percentualEscritorio: Number(percentualEscritorio || 0),
    publicado: Boolean(publicado),
    ownerId: uid(),
    criadoEm: Date.now(),
  });
  return { id: slug };
}

export async function obterObra(id) {
  const d = await getDoc(doc(db, 'obras', id));
  return d.exists() ? { id: d.id, ...d.data() } : null;
}

export async function atualizarObra(id, dados) {
  await updateDoc(doc(db, 'obras', id), dados);
}

export async function definirPublicado(id, valor) {
  await updateDoc(doc(db, 'obras', id), { publicado: Boolean(valor) });
}

// Exclui a obra e TUDO ligado a ela (etapas, lançamentos, fotos e seus
// binários pesados guardados à parte: imagens cheias e notas fiscais).
export async function excluirObra(id) {
  const apagarPorObra = async (col) => {
    const snap = await getDocs(query(collection(db, col), where('obraId', '==', id)));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  };
  await Promise.all([
    apagarPorObra('etapas'),
    apagarPorObra('lancamentos'),
    apagarPorObra('fotos'),
    apagarPorObra('fotos_bin').catch(() => {}),
    apagarPorObra('recibos').catch(() => {}),
    apagarPorObra('pagamentos').catch(() => {}),
  ]);
  await deleteDoc(doc(db, 'obras', id));
}

// Painel do cliente (sem login): getDoc direto. As Regras só liberam se publicada;
// leitura negada cai no catch e devolvemos null (tratado como "não encontrada").
export async function obterObraPublicaPorSlug(slug) {
  try {
    const d = await getDoc(doc(db, 'obras', slug));
    if (!d.exists()) return null;
    const obra = { id: d.id, ...d.data() };
    return obra.publicado ? obra : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Etapas
// ---------------------------------------------------------------------------
export async function listarEtapas(obraId) {
  const snap = await getDocs(query(collection(db, 'etapas'), where('obraId', '==', obraId)));
  const etapas = docsComId(snap);
  etapas.sort((a, b) => (a.criadoEm || 0) - (b.criadoEm || 0));
  return etapas;
}

export async function criarEtapa({ obraId, nome, orcado }) {
  await addDoc(collection(db, 'etapas'), {
    obraId,
    nome,
    orcado: Number(orcado || 0),
    ownerId: uid(),
    criadoEm: Date.now(),
  });
}

export async function criarEtapas(lista) {
  await Promise.all(lista.map((e) => criarEtapa(e)));
}

export async function atualizarEtapa(id, dados) {
  await updateDoc(doc(db, 'etapas', id), dados);
}

export async function excluirEtapa(id) {
  await deleteDoc(doc(db, 'etapas', id));
}

// ---------------------------------------------------------------------------
// Lançamentos
// ---------------------------------------------------------------------------
export async function listarLancamentos(obraId) {
  const snap = await getDocs(query(collection(db, 'lancamentos'), where('obraId', '==', obraId)));
  const lancs = docsComId(snap);
  lancs.sort((a, b) => String(b.data).localeCompare(String(a.data))); // data desc
  return lancs;
}

// Todos os lançamentos do escritório (para totais da home e exportação geral).
export async function listarLancamentosDoEscritorio() {
  const snap = await getDocs(collection(db, 'lancamentos'));
  return docsComId(snap);
}

// Soma dos lançamentos por obra (obraId -> total).
export async function totaisPorObra() {
  const t = {};
  for (const l of await listarLancamentosDoEscritorio()) {
    t[l.obraId] = (t[l.obraId] || 0) + Number(l.valor || 0);
  }
  return t;
}

export async function criarLancamento({ obraId, etapa, descricao, valor, status, pagoPor }) {
  await addDoc(collection(db, 'lancamentos'), {
    obraId,
    etapa,
    descricao: descricao ?? null,
    valor: Number(valor || 0),
    status,
    // Quem pagou o fornecedor: 'escritorio' (padrão, o cliente reembolsa) ou
    // 'cliente' (pago direto pelo cliente — não entra no reembolso).
    pagoPor: pagoPor === 'cliente' ? 'cliente' : 'escritorio',
    data: new Date().toISOString(),
    ownerId: uid(),
    criadoEm: Date.now(),
  });
}

export async function atualizarLancamento(id, dados) {
  await updateDoc(doc(db, 'lancamentos', id), dados);
}

export async function excluirLancamento(id) {
  await deleteDoc(doc(db, 'lancamentos', id));
}

// ---------------------------------------------------------------------------
// Pagamentos do CLIENTE ao ESCRITÓRIO (recebimentos). Registro do que o cliente
// já pagou (reembolso + honorário), para constar e apurar o saldo em aberto.
//   pagamentos/{id} -> obraId, valor, data(YYYY-MM-DD), forma, observacao, ownerId, criadoEm
// ---------------------------------------------------------------------------
export async function criarPagamento({ obraId, valor, data, forma, observacao }) {
  await addDoc(collection(db, 'pagamentos'), {
    obraId,
    valor: Number(valor || 0),
    data: data || new Date().toISOString().slice(0, 10),
    forma: forma ?? null,
    observacao: observacao ?? null,
    ownerId: uid(),
    criadoEm: Date.now(),
  });
}

export async function listarPagamentos(obraId) {
  const snap = await getDocs(query(collection(db, 'pagamentos'), where('obraId', '==', obraId)));
  const ps = docsComId(snap);
  ps.sort((a, b) => String(b.data).localeCompare(String(a.data))); // mais recente primeiro
  return ps;
}

export async function excluirPagamento(id) {
  await deleteDoc(doc(db, 'pagamentos', id));
}

// ---------------------------------------------------------------------------
// Convites + Clientes (link de autopreenchimento)
// ---------------------------------------------------------------------------
// Gera um convite com um token único (docId = token) e devolve o token.
export async function criarConvite({ rotulo, obraId, tipo }) {
  const token = crypto.randomUUID();
  await setDoc(doc(db, 'convites', token), {
    rotulo: rotulo ?? null,
    obraId: obraId ?? null,
    tipo: tipo ?? 'cliente', // 'cliente' | 'fornecedor'
    ownerId: uid(),
    criadoEm: Date.now(),
  });
  return token;
}

// Leitura pública do convite (o cadastro precisa validar o link e pegar o dono).
export async function obterConvite(token) {
  try {
    const d = await getDoc(doc(db, 'convites', token));
    return d.exists() ? { token: d.id, ...d.data() } : null;
  } catch {
    return null;
  }
}

export async function listarClientes() {
  const snap = await getDocs(collection(db, 'clientes'));
  const clientes = docsComId(snap);
  clientes.sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
  return clientes;
}

// Envio público do cadastro. O ownerId vem do convite (validado nas Regras).
export async function criarClientePublico({ token, ownerId, ...campos }) {
  await addDoc(collection(db, 'clientes'), {
    token,
    ownerId,
    ...campos,
    criadoEm: Date.now(),
  });
}

// Cadastro feito direto pelo escritório (sem link/convite).
export async function criarClienteEscritorio(campos) {
  await addDoc(collection(db, 'clientes'), {
    ...campos,
    ownerId: uid(),
    criadoEm: Date.now(),
  });
}

export async function excluirCliente(id) {
  await deleteDoc(doc(db, 'clientes', id));
}

// ---------------------------------------------------------------------------
// Fornecedores
// ---------------------------------------------------------------------------
export async function listarFornecedores() {
  const snap = await getDocs(collection(db, 'fornecedores'));
  const fs = docsComId(snap);
  fs.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')));
  return fs;
}

export async function criarFornecedor(campos) {
  await addDoc(collection(db, 'fornecedores'), {
    ...campos,
    ownerId: uid(),
    criadoEm: Date.now(),
  });
}

// Envio público do cadastro do fornecedor. O ownerId vem do convite (validado
// nas Regras), igual ao autopreenchimento do cliente.
export async function criarFornecedorPublico({ token, ownerId, ...campos }) {
  await addDoc(collection(db, 'fornecedores'), {
    token,
    ownerId,
    ...campos,
    criadoEm: Date.now(),
  });
}

export async function atualizarFornecedor(id, campos) {
  await updateDoc(doc(db, 'fornecedores', id), campos);
}

export async function excluirFornecedor(id) {
  await deleteDoc(doc(db, 'fornecedores', id));
}

// ---------------------------------------------------------------------------
// Recibo / Nota fiscal de um lançamento
// O arquivo pesado (imagem/PDF em data URL) fica numa coleção à parte
// "recibos/{lancamentoId}", carregada só quando a nota é aberta. O documento
// do lançamento guarda apenas o essencial (nome + flag), ficando leve para
// listar (totais da home, tabela de lançamentos). Campo antigo reciboDataUrl,
// se existir, é apagado na migração/gravação.
// ---------------------------------------------------------------------------
export async function anexarRecibo(lancamentoId, dataUrl, nome, obraId) {
  await setDoc(doc(db, 'recibos', lancamentoId), {
    dataUrl,
    nome: nome || 'nota-fiscal',
    obraId: obraId ?? null,
    ownerId: uid(),
    criadoEm: Date.now(),
  });
  await updateDoc(doc(db, 'lancamentos', lancamentoId), {
    temRecibo: true,
    reciboNome: nome || 'nota-fiscal',
    reciboEm: Date.now(),
    reciboDataUrl: deleteField(),
  });
}

export async function removerRecibo(lancamentoId) {
  await deleteDoc(doc(db, 'recibos', lancamentoId)).catch(() => {});
  await updateDoc(doc(db, 'lancamentos', lancamentoId), {
    temRecibo: false,
    reciboNome: null,
    reciboEm: null,
    reciboDataUrl: deleteField(),
  });
}

// Busca o arquivo da nota fiscal sob demanda (ao clicar em "ver NF").
export async function obterRecibo(lancamentoId) {
  try {
    const d = await getDoc(doc(db, 'recibos', lancamentoId));
    return d.exists() ? { dataUrl: d.data().dataUrl, nome: d.data().nome } : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Fotos das visitas à obra.
// A GALERIA carrega leve: o documento "fotos/{id}" guarda só uma MINIATURA
// (thumbUrl, pequena) + metadados. A imagem CHEIA fica em "fotos_bin/{id}" e
// é buscada apenas quando a foto é ampliada/baixada. Fotos antigas ainda têm
// dataUrl inline (compatível): thumbUrl || dataUrl na hora de exibir.
// ---------------------------------------------------------------------------
export async function enviarFoto(obraId, { thumbUrl, fullUrl, nome, texto, dataVisita }) {
  const ref = doc(collection(db, 'fotos'));
  await setDoc(ref, {
    obraId,
    thumbUrl: thumbUrl ?? null,
    nome: nome ?? null,
    texto: texto ?? null,
    legenda: null,
    dataVisita: dataVisita ?? null,
    ownerId: uid(),
    criadoEm: Date.now(),
  });
  await setDoc(doc(db, 'fotos_bin', ref.id), {
    obraId,
    dataUrl: fullUrl,
    ownerId: uid(),
    criadoEm: Date.now(),
  });
  return ref.id;
}

export async function listarFotos(obraId) {
  const snap = await getDocs(query(collection(db, 'fotos'), where('obraId', '==', obraId)));
  const fotos = docsComId(snap);
  fotos.sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
  return fotos;
}

export async function atualizarFoto(id, dados) {
  await updateDoc(doc(db, 'fotos', id), dados);
}

// Imagem cheia sob demanda (ao ampliar/baixar). Fotos antigas usam o inline.
// Também serve de "cofre" genérico de binários (arquivos de projeto), guardados
// por id à parte do documento da obra para não estourar o limite de 1 MB.
export async function obterFotoBin(id) {
  try {
    const d = await getDoc(doc(db, 'fotos_bin', id));
    return d.exists() ? d.data().dataUrl : null;
  } catch {
    return null;
  }
}

export async function excluirBin(id) {
  await deleteDoc(doc(db, 'fotos_bin', id)).catch(() => {});
}

export async function excluirFoto(id) {
  await Promise.all([
    deleteDoc(doc(db, 'fotos', id)),
    deleteDoc(doc(db, 'fotos_bin', id)).catch(() => {}),
  ]);
}

// --- Migração das fotos antigas (base64 inline -> coleção "fotos_bin") ---
// Grava o binário separado ANTES de apagar o inline, para nunca perder dado.
export async function salvarFotoBin(id, obraId, dataUrl) {
  await setDoc(doc(db, 'fotos_bin', id), {
    obraId: obraId ?? null,
    dataUrl,
    ownerId: uid(),
    criadoEm: Date.now(),
  });
}

export async function definirThumbFoto(id, thumbUrl) {
  await updateDoc(doc(db, 'fotos', id), { thumbUrl, dataUrl: deleteField() });
}

// Todas as fotos do escritório (para a exportação geral em ZIP).
export async function listarFotosDoEscritorio() {
  return docsComId(await getDocs(collection(db, 'fotos')));
}

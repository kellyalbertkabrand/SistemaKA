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

export async function criarObra({ nome, cliente, slug, orcamento, publicado }) {
  await setDoc(doc(db, 'obras', slug), {
    nome,
    cliente: cliente ?? null,
    slug,
    orcamento: Number(orcamento || 0),
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

export async function criarLancamento({ obraId, etapa, descricao, valor, status }) {
  await addDoc(collection(db, 'lancamentos'), {
    obraId,
    etapa,
    descricao: descricao ?? null,
    valor: Number(valor || 0),
    status,
    data: new Date().toISOString(),
    ownerId: uid(),
    criadoEm: Date.now(),
  });
}

export async function excluirLancamento(id) {
  await deleteDoc(doc(db, 'lancamentos', id));
}

// ---------------------------------------------------------------------------
// Convites + Clientes (link de autopreenchimento)
// ---------------------------------------------------------------------------
// Gera um convite com um token único (docId = token) e devolve o token.
export async function criarConvite({ rotulo, obraId }) {
  const token = crypto.randomUUID();
  await setDoc(doc(db, 'convites', token), {
    rotulo: rotulo ?? null,
    obraId: obraId ?? null,
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

export async function excluirFornecedor(id) {
  await deleteDoc(doc(db, 'fornecedores', id));
}

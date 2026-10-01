// Fluxo do diagnóstico: acesso → perfil → 35 perguntas → geração → resultado.
import { doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { api, banco, sair, usuarioAtual } from "./sessao.js";
import { CONFIG } from "./config.js";

let usuario = null;
let conteudo = null;
let perguntas = []; // lista achatada: { dimensao, pergunta, posicaoNaDimensao }
let estado = { perfil: {}, respostas: {}, atual: 0 };
let salvarTimer = null;

// ---------- utilidades ----------
const $ = (id) => document.getElementById(id);

function mostrarTela(nome) {
  document.querySelectorAll("[data-tela]").forEach((el) => el.classList.toggle("oculto", el.dataset.tela !== nome));
  window.scrollTo(0, 0);
}

function el(tag, attrs = {}, ...filhos) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k === "texto") n.textContent = v;
    else n.setAttribute(k, v);
  }
  for (const f of filhos) if (f) n.append(f);
  return n;
}

function paragrafos(texto) {
  const caixa = el("div", { class: "texto-ia" });
  String(texto || "").split(/\n\s*\n/).filter((t) => t.trim()).forEach((t) => caixa.append(el("p", { texto: t.trim() })));
  return caixa;
}

const refRespostas = () => doc(banco, "respostas", usuario.uid);
const refResultado = () => doc(banco, "resultados", usuario.uid);

function salvar(imediato = false) {
  clearTimeout(salvarTimer);
  const gravar = () => setDoc(refRespostas(), { ...estado, atualizadoEm: new Date().toISOString() }, { merge: true });
  if (imediato) return gravar();
  salvarTimer = setTimeout(gravar, 800);
}

// ---------- início ----------
async function iniciar() {
  document.querySelectorAll(".js-checkout").forEach((a) => (a.href = CONFIG.checkoutUrl));
  $("sair").addEventListener("click", sair);
  $("trocar-email").addEventListener("click", () => sair().then(() => (location.href = "/entrar")));

  usuario = await usuarioAtual();
  if (!usuario) { location.href = "/entrar"; return; }

  const acesso = await api("/api/acesso");
  if (!acesso.ok) { location.href = "/entrar"; return; }

  // Quem já tem resultado pronto continua vendo, mesmo depois do prazo de acesso.
  const resultado = (await getDoc(refResultado())).data();
  if (resultado?.status === "pronto") return renderResultado(resultado);

  if (!acesso.dados.ativo) return telaSemAcesso(acesso.dados);
  const travada = resultado?.status === "gerando" && Date.now() - new Date(resultado.iniciadoEm).getTime() > 10 * 60 * 1000;
  if (resultado?.status === "gerando" && !travada) return acompanharGeracao();

  const resp = await fetch("/api/conteudo");
  conteudo = await resp.json();
  perguntas = conteudo.dimensoes.flatMap((d) => d.perguntas.map((p, i) => ({ dimensao: d, pergunta: p, posicao: i })));

  const salvo = (await getDoc(refRespostas())).data();
  if (salvo) estado = { perfil: salvo.perfil || {}, respostas: salvo.respostas || {}, atual: salvo.atual || 0 };

  if (resultado?.status === "erro" || travada) return telaErro();
  if (!estado.perfil.marca) return telaPerfil();
  telaPergunta(Math.min(estado.atual, perguntas.length - 1));
}

function telaSemAcesso(dados) {
  if (dados.motivo === "expirado") {
    $("sem-acesso-titulo").textContent = "O seu acesso expirou.";
    $("sem-acesso-texto").textContent = "Para fazer um novo diagnóstico, garanta um novo acesso.";
  } else {
    $("sem-acesso-texto").textContent =
      `Você entrou com ${dados.email}. Use o mesmo e-mail da compra na Hotmart. Se a compra foi agora, aguarde alguns minutos e entre de novo.`;
  }
  mostrarTela("sem-acesso");
}

// ---------- perfil ----------
function telaPerfil() {
  const form = $("form-perfil");
  form.innerHTML = "";
  for (const campo of conteudo.perfil) {
    const id = `perfil-${campo.id}`;
    form.append(el("label", { for: id, texto: campo.texto + (campo.obrigatorio ? "" : " (opcional)") }));
    const input = el("input", { id, type: "text" });
    input.value = estado.perfil[campo.id] || "";
    if (campo.obrigatorio) input.required = true;
    form.append(input);
  }
  form.append(el("button", { class: "botao botao-largo", type: "submit", texto: "Começar o diagnóstico" }));
  form.onsubmit = (ev) => {
    ev.preventDefault();
    for (const campo of conteudo.perfil) estado.perfil[campo.id] = $(`perfil-${campo.id}`).value.trim();
    salvar(true);
    telaPergunta(estado.atual || 0);
  };
  mostrarTela("perfil");
}

// ---------- perguntas ----------
function respondida(item) {
  const v = estado.respostas[item.pergunta.id];
  return item.pergunta.tipo === "escala" ? typeof v === "number" : typeof v === "string" && v.trim().length >= 3;
}

function telaPergunta(indice) {
  estado.atual = indice;
  const item = perguntas[indice];
  const { dimensao, pergunta } = item;

  $("p-cap").textContent = `Cap. ${String(dimensao.capitulo).padStart(2, "0")} · ${dimensao.nome}`;
  $("p-barra").style.width = `${Math.round((indice / perguntas.length) * 100)}%`;
  $("p-contador").textContent = `Pergunta ${indice + 1} de ${perguntas.length}`;
  $("p-texto").textContent = pergunta.texto;
  $("p-ajuda").textContent = pergunta.ajuda || (pergunta.tipo === "escala" ? "O quanto essa frase é verdade hoje na sua marca?" : "");

  const campo = $("p-campo");
  campo.innerHTML = "";
  const avancar = $("p-avancar");
  const atualizarBotao = () => { avancar.disabled = !respondida(item); };

  if (pergunta.tipo === "escala") {
    const grade = el("div", { class: "escala", role: "group", "aria-label": "Escala de concordância" });
    for (const opcao of conteudo.escala) {
      const b = el("button", { type: "button", "aria-pressed": String(estado.respostas[pergunta.id] === opcao.valor) });
      b.textContent = opcao.rotulo;
      b.addEventListener("click", () => {
        estado.respostas[pergunta.id] = opcao.valor;
        salvar();
        grade.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", "false"));
        b.setAttribute("aria-pressed", "true");
        atualizarBotao();
        setTimeout(irAdiante, 250); // avança sozinho depois de escolher
      });
      grade.append(b);
    }
    campo.append(grade);
  } else {
    const area = el("textarea", { "aria-label": "Sua resposta", placeholder: "Escreva com as suas palavras. Quanto mais verdade, melhor a leitura." });
    area.value = estado.respostas[pergunta.id] || "";
    area.addEventListener("input", () => { estado.respostas[pergunta.id] = area.value; salvar(); atualizarBotao(); });
    campo.append(area);
    setTimeout(() => area.focus(), 50);
  }

  const ultima = indice === perguntas.length - 1;
  avancar.textContent = ultima ? "Gerar o meu diagnóstico" : "Avançar";
  avancar.onclick = irAdiante;
  $("p-voltar").onclick = () => (indice === 0 ? telaPerfil() : telaPergunta(indice - 1));
  atualizarBotao();
  mostrarTela("pergunta");
}

function irAdiante() {
  const item = perguntas[estado.atual];
  if (!respondida(item)) return;
  if (estado.atual < perguntas.length - 1) return telaPergunta(estado.atual + 1);
  enviar();
}

// ---------- geração ----------
async function enviar() {
  const pendente = perguntas.findIndex((p) => !respondida(p));
  if (pendente >= 0) return telaPergunta(pendente);

  await salvar(true);
  mostrarTela("gerando");
  const r = await api("/api/gerar", { method: "POST" });
  if (!r.ok) {
    if (r.dados?.faltando?.length) {
      const i = perguntas.findIndex((p) => p.pergunta.id === r.dados.faltando[0]);
      return telaPergunta(Math.max(i, 0));
    }
    return telaErro(r.status === 429 ? "Você já usou as tentativas de diagnóstico deste acesso. Fale com a gente para ajudar." : undefined);
  }
  acompanharGeracao();
}

function acompanharGeracao() {
  mostrarTela("gerando");
  const parar = onSnapshot(refResultado(), (snap) => {
    const dados = snap.data();
    if (dados?.status === "pronto") { parar(); renderResultado(dados); }
    if (dados?.status === "erro") { parar(); telaErro(); }
  });
}

function telaErro(texto) {
  if (texto) $("erro-texto").textContent = texto;
  $("tentar-de-novo").onclick = () => (perguntas.length ? enviar() : location.reload());
  mostrarTela("erro");
}

// ---------- resultado ----------
function renderResultado(r) {
  const raiz = $("resultado");
  raiz.innerHTML = "";
  const leitura = r.leitura || {};
  const porId = Object.fromEntries((leitura.dimensoes || []).map((d) => [d.id, d]));
  const marca = r.perfil?.marca || "a sua marca";

  // Abertura com nota geral
  raiz.append(el("section", { class: "secao" }, el("div", { class: "container" },
    el("span", { class: "rotulo", texto: `Diagnóstico Marca com Essência© · ${marca}` }),
    el("div", { class: "nota-geral" }, String(r.notaGeral), el("small", { texto: "/100" })),
    el("h2", { texto: r.faixa?.nome || "" }),
    el("p", { class: "suave", texto: r.faixa?.resumo || "" }),
    el("p", { class: "frase-sintese", texto: leitura.frase_sintese || "" }),
  )));

  // Mapa das 7 dimensões
  const mapa = el("div", { class: "container" }, el("span", { class: "rotulo", texto: "Mapa da sua marca" }));
  for (const d of r.dimensoes || []) {
    const trilho = el("div", { class: "barra-trilho" }, el("span"));
    trilho.firstChild.style.width = `${d.nota}%`;
    mapa.append(el("div", { class: "barra" },
      el("div", { class: "barra-topo" }, el("span", { texto: d.nome }), el("span", { texto: String(d.nota) })),
      trilho,
    ));
  }
  raiz.append(el("section", { class: "secao secao-escura" }, mapa));

  // Leitura geral e coerência
  raiz.append(el("section", { class: "secao" }, el("div", { class: "container" },
    el("span", { class: "rotulo", texto: "Leitura geral" }),
    paragrafos(leitura.leitura_geral),
    el("div", { class: "cartao", style: "margin-top: 24px;" },
      el("span", { class: "rotulo", texto: "O que as suas palavras revelam" }),
      paragrafos(leitura.coerencia),
    ),
  )));

  // Uma leitura por dimensão
  const blocoDim = el("div", { class: "container" }, el("span", { class: "rotulo", texto: "Dimensão por dimensão" }));
  for (const d of r.dimensoes || []) {
    const l = porId[d.id] || {};
    blocoDim.append(el("div", { class: "cartao bloco-leitura" },
      el("p", { class: "pergunta-cap", texto: `Cap. ${String(d.capitulo).padStart(2, "0")}` }),
      el("h3", { texto: d.nome }),
      el("div", { class: "dimensao-nota", texto: String(d.nota) }),
      el("p", { style: "margin-top: 12px;", texto: l.leitura || "" }),
      el("h4", { texto: "Ponto forte" }), el("p", { texto: l.ponto_forte || "" }),
      el("h4", { texto: "Ponto cego" }), el("p", { texto: l.ponto_cego || "" }),
      el("h4", { texto: "Primeiro passo" }), el("p", { texto: l.primeiro_passo || "" }),
    ));
  }
  raiz.append(el("section", { class: "secao" }, blocoDim));

  // Prioridades
  const lista = el("ol", { class: "prioridades" });
  (leitura.prioridades || []).forEach((p) => lista.append(el("li", { texto: p })));
  raiz.append(el("section", { class: "secao secao-escura" }, el("div", { class: "container" },
    el("span", { class: "rotulo", texto: "Suas 3 prioridades" }), lista,
  )));

  // Bibliografia
  const livros = el("div", { class: "container" }, el("span", { class: "rotulo", texto: "Bibliografia indicada para a sua marca" }));
  for (const b of r.livros || []) {
    livros.append(el("div", { class: "cartao" },
      el("h3", { texto: b.titulo }),
      el("p", { class: "suave pequeno", texto: b.autor }),
      el("p", { texto: b.motivo }),
    ));
  }
  raiz.append(el("section", { class: "secao" }, livros));

  // Ações
  const imprimir = el("button", { class: "botao", type: "button", texto: "Salvar em PDF" });
  imprimir.addEventListener("click", () => window.print());
  raiz.append(el("section", { class: "secao nao-imprimir" }, el("div", { class: "container centro" },
    el("h2", { texto: "Quer transformar esta leitura em direção?" }),
    el("p", { texto: "O diagnóstico mostra onde a sua marca está. O próximo passo é decidir para onde ela vai." }),
    imprimir,
    el("p", { style: "margin-top: 16px;" }, el("a", { class: "botao botao-contorno", href: CONFIG.contatoUrl, texto: "Falar com a KA" })),
    el("p", { class: "suave pequeno", texto: `Gerado em ${new Date(r.geradoEm).toLocaleDateString("pt-BR")}` }),
  )));

  mostrarTela("resultado");
}

iniciar().catch((e) => {
  console.error(e);
  telaErro("Não conseguimos carregar o diagnóstico. Atualize a página para tentar de novo.");
});

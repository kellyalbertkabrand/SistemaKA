"""Radar de Leads — prospecção por gatilhos de momento.

Fluxo (roda todo dia junto com a coleta de notícias, ou sozinho com
`python -m sistemaka leads`):

1. Busca no Google Notícias (Brasil) as notícias de cada GATILHO configurado em
   config/leads.yaml (fusão, sucessão, expansão, aporte, aniversário...).
2. Para cada notícia, identifica a EMPRESA, o setor, a cidade, o porte e dá uma
   nota de encaixe com o perfil de cliente ideal (com a Claude, se houver
   ANTHROPIC_API_KEY; sem chave, usa regras simples e marca "a confirmar").
3. Escreve o "porquê agora", o cargo de quem decide e a 1ª mensagem de
   abordagem (LinkedIn + e-mail) no tom da Kelly.
4. Guarda tudo numa base única (data/leads/leads.json), sem duplicar empresa:
   um novo sinal da mesma empresa soma ao histórico dela e sobe a nota.
5. O painel ganha a página "Leads" (public/leads.html) e a planilha
   public/leads.csv (abre no Excel/Google Sheets ou importa em qualquer CRM).

Só usa informação pública de notícias. Não raspa LinkedIn nem coleta e-mail
pessoal — o painel traz o link de busca para a Kelly achar o decisor à mão.
"""

from __future__ import annotations

import csv
import hashlib
import json
import logging
import re
import time
import unicodedata
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote_plus

import requests
import yaml

from . import config

log = logging.getLogger("sistemaka.leads")

LEADS_CONFIG_PATH = config.ROOT / "config" / "leads.yaml"
LEADS_DIR = config.ROOT / "data" / "leads"
LEADS_DB = LEADS_DIR / "leads.json"

ENTRIES_PER_QUERY = 8
AI_BATCH = 6


# ---------------------------------------------------------------------------
# Modelo
# ---------------------------------------------------------------------------

@dataclass
class Signal:
    """Um sinal (notícia) que indica momento de compra."""
    gatilho: str
    titulo: str
    link: str
    fonte: str
    data: str


@dataclass
class Lead:
    empresa: str
    setor: str = ""
    local: str = ""
    porte: str = ""                 # pequena | média | grande | ?
    gatilho: str = ""               # id do gatilho mais forte
    gatilho_nome: str = ""
    por_que_agora: str = ""
    decisor: str = ""               # cargo de quem decide
    pessoa_citada: str = ""         # nome citado na notícia (se houver)
    msg_linkedin: str = ""
    email_assunto: str = ""
    email_corpo: str = ""
    encaixe: int = 0                # 0–10 (IA) — encaixe com o ICP
    score: int = 0                  # nota final para ordenar
    confirmado: bool = False        # True = analisado pela IA
    sinais: list = field(default_factory=list)
    primeiro_sinal: str = ""
    ultimo_sinal: str = ""

    @property
    def id(self) -> str:
        return company_key(self.empresa)

    @property
    def linkedin_busca(self) -> str:
        cargo = "fundador OR CEO OR sócio OR marketing"
        return ("https://www.linkedin.com/search/results/people/?keywords="
                + quote_plus(f"{self.empresa} {cargo}"))

    @property
    def google_busca(self) -> str:
        return "https://www.google.com/search?q=" + quote_plus(f"{self.empresa} {self.local} site oficial")

    @property
    def sinal_principal(self) -> dict:
        return self.sinais[0] if self.sinais else {}

    def to_dict(self) -> dict:
        d = asdict(self)
        d["id"] = self.id
        return d

    @classmethod
    def from_dict(cls, data: dict) -> "Lead":
        known = set(cls.__dataclass_fields__)  # type: ignore[attr-defined]
        return cls(**{k: v for k, v in data.items() if k in known})


def _ascii(text: str) -> str:
    text = unicodedata.normalize("NFKD", text or "")
    return "".join(c for c in text if not unicodedata.combining(c)).lower()


_SUFFIXES = r"\b(sa|ltda|eireli|me|epp|grupo|holding|cia|companhia)\b"


def _name_tokens(name: str) -> list[str]:
    n = _ascii(name)
    n = re.sub(r"[^\w]+", " ", n)
    n = re.sub(_SUFFIXES, " ", n)
    return [t for t in n.split() if len(t) > 1]


# Palavras que podem vir depois do nome sem mudar a empresa ("Fruki Bebidas").
_DESCRITORES = {
    "bebidas", "alimentos", "calcados", "moveis", "cosmeticos", "industria", "industrias",
    "comercio", "brasil", "group", "participacoes", "sa", "ltda", "do", "brasil", "tecnologia",
    "engenharia", "construtora", "incorporadora", "textil", "moda", "saude", "agro",
}


def company_key(name: str) -> str:
    n = " ".join(_name_tokens(name))
    return hashlib.sha1(n.encode()).hexdigest()[:12] if n else ""


def _same_company(a: str, b: str) -> bool:
    """'Fruki' == 'Fruki Bebidas S.A.' (um nome começa com o outro)."""
    ta, tb = _name_tokens(a), _name_tokens(b)
    if not ta or not tb:
        return False
    short, long_ = (ta, tb) if len(ta) <= len(tb) else (tb, ta)
    if long_[:len(short)] != short:
        return False
    extra = long_[len(short):]
    return len(short) >= 2 or all(t in _DESCRITORES for t in extra)


# ---------------------------------------------------------------------------
# Configuração e base
# ---------------------------------------------------------------------------

def load_leads_config() -> dict:
    if not LEADS_CONFIG_PATH.exists():
        return {}
    with open(LEADS_CONFIG_PATH, "r", encoding="utf-8") as fh:
        return yaml.safe_load(fh) or {}


def load_db() -> list[Lead]:
    if not LEADS_DB.exists():
        return []
    try:
        with open(LEADS_DB, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        return [Lead.from_dict(d) for d in data.get("leads", [])]
    except Exception as exc:  # noqa: BLE001
        log.warning("Base de leads ilegível (%s) — começando do zero.", exc)
        return []


def save_db(leads: list[Lead]) -> None:
    LEADS_DIR.mkdir(parents=True, exist_ok=True)
    with open(LEADS_DB, "w", encoding="utf-8") as fh:
        json.dump({"generated_at": datetime.now(timezone.utc).isoformat(),
                   "count": len(leads),
                   "leads": [ld.to_dict() for ld in leads]},
                  fh, ensure_ascii=False, indent=2)


# ---------------------------------------------------------------------------
# Coleta dos sinais
# ---------------------------------------------------------------------------

def collect_signals(cfg: dict, window: int | None = None) -> list[Signal]:
    from .fetch import (_domain, _entry_date, _is_real_source, _safe_parse,
                        _strip_html, resolve_source_url)

    window = int(window or cfg.get("window_days", 3))
    max_items = int(cfg.get("max_items", 60))
    excl = [_ascii(t) for t in (cfg.get("icp", {}) or {}).get("excluir_termos", []) or []]
    session = requests.Session()
    seen_titles: set[str] = set()
    out: list[Signal] = []

    for g in cfg.get("gatilhos", []) or []:
        for query in g.get("buscas", []) or []:
            if len(out) >= max_items:
                break
            url = ("https://news.google.com/rss/search?q="
                   + quote_plus(f"{query} when:{window}d")
                   + "&hl=pt-BR&gl=BR&ceid=BR:pt-419")
            feed = _safe_parse(url, session)
            for entry in feed.entries[:ENTRIES_PER_QUERY]:
                data = _entry_date(entry)
                if not data:
                    continue
                titulo = _strip_html(entry.get("title", ""))
                key = re.sub(r"\W+", " ", _ascii(titulo)).strip()[:80]
                if not key or key in seen_titles:
                    continue
                if any(t in _ascii(titulo) for t in excl):
                    continue
                seen_titles.add(key)
                link = resolve_source_url(entry.get("link", ""), session)
                if not _is_real_source(link):
                    # mantém o link do Google Notícias: para lead, o sinal vale
                    # mesmo que o redirect não resolva.
                    link = entry.get("link", "")
                src = getattr(entry, "source", None)
                fonte = getattr(src, "title", None) or _domain(link) or "Google Notícias"
                out.append(Signal(gatilho=g["id"], titulo=titulo, link=link,
                                  fonte=fonte, data=data))
            time.sleep(0.4)
    log.info("Radar de Leads: %d sinais coletados", len(out))
    return out[:max_items]


# ---------------------------------------------------------------------------
# Radar de vagas (Gupy)
# ---------------------------------------------------------------------------

# Endpoints públicos que o portal de vagas da Gupy usa (o 1º é o atual; o 2º
# fica de reserva). Se a Gupy mudar, o radar só registra o aviso e segue.
GUPY_ENDPOINTS = [
    ("https://portal.api.gupy.io/api/job", "name"),
    ("https://portal.api.gupy.io/api/v1/jobs", "jobName"),
]


def _buscar_gupy(session: requests.Session, termo: str) -> list[dict]:
    erros = []
    for url, campo in GUPY_ENDPOINTS:
        try:
            r = session.get(url, params={campo: termo, "offset": 0, "limit": 100},
                            timeout=20, headers={"User-Agent": "Mozilla/5.0",
                                                 "Accept": "application/json"})
            r.raise_for_status()
            return r.json().get("data", []) or []
        except Exception as exc:  # noqa: BLE001
            erros.append(f"{url}: {exc}")
    raise RuntimeError(" | ".join(erros))


def collect_vagas(cfg: dict) -> tuple[list[Signal], list[dict]]:
    """Vagas de marketing abertas → (sinais, análises prontas).

    A empresa vem estruturada da plataforma (não precisa de IA para achar o
    nome). Devolve as análises no mesmo formato da IA, para o merge.
    """
    vcfg = cfg.get("vagas", {}) or {}
    if not vcfg.get("ativo"):
        return [], []
    dias = int(vcfg.get("dias", 7))
    limite = (datetime.now(timezone.utc) - timedelta(days=dias)).date().isoformat()
    estados = {e.upper() for e in vcfg.get("estados", []) or []}
    gat = _gatilhos_by_id(cfg).get("vaga", {})
    por_que_base = " ".join((gat.get("por_que") or "").split())
    session = requests.Session()
    vistos: set[str] = set()
    sinais: list[Signal] = []
    analises: list[dict] = []
    for termo in vcfg.get("buscas", []) or []:
        try:
            vagas = _buscar_gupy(session, termo)
        except Exception as exc:  # noqa: BLE001
            log.warning("Radar de vagas falhou (%s): %s", termo, exc)
            continue
        for v in vagas:
            empresa = (v.get("careerPageName") or "").strip()
            data = (v.get("publishedDate") or "")[:10]
            uf = (v.get("state") or "").strip()
            uf = UFS.get(_ascii(uf), uf.upper()[:2]) if uf else ""
            if not empresa or not data or data < limite:
                continue
            if estados and uf not in estados:
                continue
            k = company_key(empresa)
            if not k or k in vistos or _excluded(cfg, empresa):
                continue
            vistos.add(k)
            cargo = (v.get("name") or termo).strip()
            cidade = (v.get("city") or "").strip()
            sinais.append(Signal(gatilho="vaga", titulo=f"Vaga: {cargo}",
                                 link=v.get("jobUrl") or v.get("careerPageUrl") or "",
                                 fonte="Gupy", data=data))
            analises.append({
                "i": len(sinais) - 1, "empresa": empresa, "setor": "",
                "local": f"{cidade}/{uf}" if cidade and uf else cidade or uf,
                "porte": "?", "encaixe": 5,
                "por_que_agora": f"Está contratando {cargo.lower()}. {por_que_base}",
                "decisor": "Gestor(a) de marketing ou sócio(a)",
                "_fraco": True,  # não sobrescreve análise de notícia já feita
            })
            if len(sinais) >= int(vcfg.get("max_empresas", 40)):
                break
        time.sleep(0.5)
    log.info("Radar de vagas: %d empresas contratando marketing", len(sinais))
    return sinais, analises


UFS = {
    "acre": "AC", "alagoas": "AL", "amapa": "AP", "amazonas": "AM", "bahia": "BA", "ceara": "CE",
    "distrito federal": "DF", "espirito santo": "ES", "goias": "GO", "maranhao": "MA",
    "mato grosso": "MT", "mato grosso do sul": "MS", "minas gerais": "MG", "para": "PA",
    "paraiba": "PB", "parana": "PR", "pernambuco": "PE", "piaui": "PI", "rio de janeiro": "RJ",
    "rio grande do norte": "RN", "rio grande do sul": "RS", "rondonia": "RO", "roraima": "RR",
    "santa catarina": "SC", "sao paulo": "SP", "sergipe": "SE", "tocantins": "TO",
}


# ---------------------------------------------------------------------------
# Análise (IA ou regras)
# ---------------------------------------------------------------------------

def _gatilhos_by_id(cfg: dict) -> dict:
    return {g["id"]: g for g in cfg.get("gatilhos", []) or []}


def _system_prompt(cfg: dict) -> str:
    icp = cfg.get("icp", {}) or {}
    b = config.load_config().get("business", {}) or {}
    gat = "\n".join(f"- {g['id']} ({g['nome']}): {' '.join(g.get('por_que', '').split())}"
                    for g in cfg.get("gatilhos", []) or [])
    return f"""Você é o analista de prospecção da KA | Inteligência para Marcas, escritório
de POSICIONAMENTO e REPOSICIONAMENTO de marca da Kelly Albert (método Marca com Essência©,
de dentro para fora: da essência dos fundadores à percepção do mercado).

NEGÓCIO: {' '.join((b.get('descricao') or '').split())}

CLIENTE IDEAL: {' '.join((icp.get('descricao') or '').split())}
Setores prioritários: {', '.join(icp.get('setores_prioritarios', []) or [])}.

GATILHOS DE MOMENTO (por que a notícia indica compra):
{gat}

Para cada notícia recebida, devolva um objeto JSON com:
- "i": o índice recebido
- "empresa": o NOME PRÓPRIO da empresa protagonista do momento (a que vive a mudança).
  Use null (sem aspas) se: o nome não aparece no título (NUNCA invente nem escreva
  descrições como "Empresa familiar", "nome não identificado", "uma indústria"); for
  órgão público, prefeitura, escola/cursinho, ONG, coletivo, clube, cooperativa de
  crédito ou entidade sem fins lucrativos; for grande rede nacional, multinacional ou
  marca muito conhecida no país inteiro (Havan, Heinz, Magalu, Ambev, bancos, Petrobras
  etc.) — essas não contratam um escritório como a KA; for agência de comunicação/branding
  (concorrente); ou a notícia não for sobre um momento de negócio da empresa.
- "setor": setor em poucas palavras
- "local": "Cidade/UF" (ex.: "Lajeado/RS"), só se der para saber; senão ""
- "porte": "pequena" | "média" | "grande" | "?"
- "encaixe": 0 a 10 — quanto essa empresa, NESTE momento, tem cara de comprar um projeto de
  posicionamento/reposicionamento da KA (PMEs e médias, lideradas por fundadores, em virada = nota alta;
  gigantes ou empresas sem momento claro = nota baixa)
- "por_que_agora": 1 frase, concreta, ligando o fato da notícia à necessidade de posicionamento
- "decisor": cargo provável de quem decide (ex.: "Fundador(a) / CEO", "Diretor(a) de Marketing")
- "pessoa_citada": nome e cargo de quem a notícia cita como líder, se houver (senão "")
- "msg_linkedin": nota de conexão do LinkedIn, até 280 caracteres
- "email_assunto": assunto curto e específico (sem caixa alta, sem emoji)
- "email_corpo": e-mail de 60 a 110 palavras, assinado "Kelly Albert · KA | Inteligência para Marcas"

TOM DAS MENSAGENS (Kelly Albert, estrategista gaúcha com mais de 20 anos):
- próxima e direta, de uma pessoa para outra: "você", "a gente" (nunca "nós"/"vocês");
- começa pelo FATO da notícia (parabeniza ou comenta o momento), nunca por apresentação longa;
- frases curtas. Português impecável. Zero jargão e zero clichê ("agregar valor",
  "se destacar da concorrência", "espero que esteja bem", "alavancar", "sinergia");
- fala em "posicionamento", não em "branding" solto; "Inteligência Artificial" por extenso;
- nunca pede para comprar ("compre", "adquira", "invista"); o pedido é uma conversa curta
  (15–20 minutos) ou uma leitura gratuita de como a marca está sendo percebida;
- não inventa números nem fatos que não estão na notícia.

Responda SOMENTE com um array JSON."""


def _analyze_with_claude(cfg: dict, signals: list[Signal]) -> list[dict]:
    try:
        import anthropic
    except ImportError:
        log.warning("Pacote 'anthropic' ausente — análise por regras.")
        return []
    client = anthropic.Anthropic(api_key=config.anthropic_api_key())
    model = config.leads_model()
    system = _system_prompt(cfg)
    gats = _gatilhos_by_id(cfg)
    results: list[dict] = []
    for start in range(0, len(signals), AI_BATCH):
        batch = signals[start:start + AI_BATCH]
        payload = [{"i": start + k, "gatilho": gats.get(s.gatilho, {}).get("nome", s.gatilho),
                    "titulo": s.titulo, "fonte": s.fonte, "data": s.data}
                   for k, s in enumerate(batch)]
        try:
            msg = client.messages.create(
                model=model, max_tokens=4000, system=system,
                messages=[{"role": "user",
                           "content": "Notícias:\n" + json.dumps(payload, ensure_ascii=False)}],
            )
            text = "".join(b.text for b in msg.content if getattr(b, "type", "") == "text")
            m = re.search(r"\[.*\]", text, re.S)
            if m:
                results.extend(json.loads(m.group(0)))
        except Exception as exc:  # noqa: BLE001
            log.warning("Lote de IA (leads) falhou: %s", exc)
    return results


# Sem IA: tenta pegar o nome da empresa do começo do título.
_VERBS = (r"\b(anuncia|inaugura|adquire|compra|completa|recebe|capta|lança|lanca|abre|"
          r"expande|chega|assume|investe|celebra|comemora|muda|fecha|conclui|vai|"
          r"cresce|dobra|aposta|passa|ganha|tem|é|e)\b")


def _guess_company(title: str) -> str:
    t = re.sub(r"\s+-\s+[^-]+$", "", title)  # tira " - Nome do Veículo"
    m = re.split(_VERBS, t, maxsplit=1, flags=re.I)
    cand = (m[0] if m else "").strip(" :,–-\"'")
    words = cand.split()
    if not (1 <= len(words) <= 5) or not cand[:1].isupper():
        return ""
    if _ascii(words[0]) in _GENERIC_STARTS:
        return ""
    return cand


_GENERIC_STARTS = {
    "segunda", "terceira", "nova", "novo", "empresa", "empresas", "marca", "marcas",
    "rede", "startup", "fundo", "governo", "prefeitura", "como", "por", "o", "a", "os",
    "as", "um", "uma", "quem", "apos", "com", "em", "de", "setor", "industria", "brasil",
}


def _fallback_analysis(cfg: dict, s: Signal) -> dict:
    g = _gatilhos_by_id(cfg).get(s.gatilho, {})
    empresa = _guess_company(s.titulo)
    por_que = " ".join((g.get("por_que") or "").split())
    return {
        "empresa": empresa or None,
        "setor": "", "local": "", "porte": "?", "encaixe": 5,
        "por_que_agora": por_que,
        "decisor": "Fundador(a) / CEO",
        "pessoa_citada": "",
        "msg_linkedin": (f"Oi! Vi a notícia sobre {empresa or 'a empresa'} "
                         f"({g.get('nome', 'um momento importante').lower()}). Parabéns! "
                         "Eu trabalho com posicionamento de marca e adoraria trocar uma ideia "
                         "com você sobre esse momento da empresa."),
        "email_assunto": f"{empresa or 'Sua empresa'}: o momento novo e a marca",
        "email_corpo": (f"Olá! Vi a notícia \"{s.titulo}\". Parabéns pelo momento.\n\n"
                        f"{por_que}\n\nEu sou a Kelly Albert, estrategista de posicionamento "
                        "de marca. Topa uma conversa de 20 minutos? Eu te mostro, sem compromisso, "
                        "como a marca está sendo percebida hoje.\n\n"
                        "Kelly Albert · KA | Inteligência para Marcas"),
    }


# ---------------------------------------------------------------------------
# Pontuação e mescla na base
# ---------------------------------------------------------------------------

_GENERICOS = re.compile(
    r"n[aã]o identificad|n[aã]o informad|desconhecid|^empresa\b|^uma\b|^um\b|\?|^null$|^none$",
    re.I)


def nome_generico(empresa: str) -> bool:
    """True para 'Empresa familiar (nome não identificado)' e afins."""
    return bool(_GENERICOS.search(empresa.strip()))


def _excluded(cfg: dict, empresa: str) -> bool:
    lista = [_ascii(e) for e in (cfg.get("icp", {}) or {}).get("excluir_empresas", []) or []]
    n = _ascii(empresa)
    return any(re.search(rf"\b{re.escape(e)}\b", n) for e in lista if e)


def _score(cfg: dict, lead: Lead) -> int:
    gats = _gatilhos_by_id(cfg)
    pesos = sorted((gats.get(s.get("gatilho"), {}).get("peso", 1) for s in lead.sinais),
                   reverse=True)
    base = (pesos[0] * 10 if pesos else 0) + sum(p * 3 for p in pesos[1:4])
    base += lead.encaixe * 5
    base += {"pequena": 6, "média": 10, "media": 10, "grande": -10}.get(lead.porte, 0)
    regioes = [_ascii(r) for r in (cfg.get("icp", {}) or {}).get("regioes_bonus", []) or []]
    if lead.local and any(r and r in _ascii(lead.local) for r in regioes):
        base += 8
    # frescor: sinal recente vale mais
    try:
        age = (datetime.now(timezone.utc).date()
               - datetime.fromisoformat(lead.ultimo_sinal).date()).days
        base += max(0, 10 - age // 3)
    except Exception:
        pass
    return int(base)


def merge(cfg: dict, existing: list[Lead], signals: list[Signal],
          analyses: list[dict]) -> list[Lead]:
    gats = _gatilhos_by_id(cfg)
    by_id: dict[str, Lead] = {ld.id: ld for ld in existing if ld.id}
    by_index = {a.get("i"): a for a in analyses if isinstance(a, dict)}
    use_ai = bool(analyses)

    for idx, s in enumerate(signals):
        a = by_index.get(idx) if use_ai else _fallback_analysis(cfg, s)
        if not a:
            a = _fallback_analysis(cfg, s)
        empresa = (a.get("empresa") or "").strip()
        if not empresa or _excluded(cfg, empresa) or nome_generico(empresa):
            continue
        key = company_key(empresa)
        if not key:
            continue
        sig = asdict(s)
        lead = by_id.get(key) or next(
            (ld for ld in by_id.values() if _same_company(ld.empresa, empresa)), None)
        if lead is None:
            lead = Lead(empresa=empresa, primeiro_sinal=s.data)
            by_id[key] = lead
        if any(x.get("link") == s.link or x.get("titulo") == s.titulo for x in lead.sinais):
            continue
        lead.sinais.insert(0, sig)
        lead.sinais = sorted(lead.sinais, key=lambda x: x.get("data", ""), reverse=True)[:8]
        lead.ultimo_sinal = max(lead.ultimo_sinal or "", s.data)
        lead.primeiro_sinal = min(lead.primeiro_sinal or s.data, s.data)
        # o gatilho de maior peso define a etiqueta
        best = max(lead.sinais, key=lambda x: gats.get(x.get("gatilho"), {}).get("peso", 0))
        lead.gatilho = best.get("gatilho", "")
        lead.gatilho_nome = gats.get(lead.gatilho, {}).get("nome", lead.gatilho)
        # textos: o sinal mais novo atualiza a abordagem (IA vence regra)
        fraco = bool(a.get("_fraco")) and lead.confirmado
        if (use_ai and not fraco) or not lead.confirmado:
            for f in ("setor", "local", "porte", "por_que_agora", "decisor",
                      "pessoa_citada", "msg_linkedin", "email_assunto", "email_corpo"):
                val = (a.get(f) or "")
                if isinstance(val, str) and val.strip():
                    setattr(lead, f, val.strip())
            try:
                lead.encaixe = max(0, min(10, int(a.get("encaixe", lead.encaixe) or 0)))
            except (TypeError, ValueError):
                pass
            lead.confirmado = lead.confirmado or use_ai

    # expira leads sem sinal novo há muito tempo
    limit = (datetime.now(timezone.utc).date()
             - timedelta(days=int(cfg.get("expire_days", 120)))).isoformat()
    leads = [ld for ld in by_id.values() if (ld.ultimo_sinal or "") >= limit]
    for ld in leads:
        ld.score = _score(cfg, ld)
    leads.sort(key=lambda ld: (ld.score, ld.ultimo_sinal), reverse=True)
    return leads


# ---------------------------------------------------------------------------
# Exportação
# ---------------------------------------------------------------------------

CSV_FIELDS = [
    ("Nota", "score"), ("Empresa", "empresa"), ("Gatilho", "gatilho_nome"),
    ("Setor", "setor"), ("Local", "local"), ("Porte", "porte"),
    ("Encaixe (0-10)", "encaixe"), ("Por que agora", "por_que_agora"),
    ("Quem decide", "decisor"), ("Pessoa citada", "pessoa_citada"),
    ("Último sinal", "ultimo_sinal"), ("Notícia", "_titulo"), ("Link da notícia", "_link"),
    ("Mensagem LinkedIn", "msg_linkedin"), ("Assunto do e-mail", "email_assunto"),
    ("E-mail", "email_corpo"), ("Buscar decisor no LinkedIn", "linkedin_busca"),
    ("Status", "_status"), ("Próximo passo", "_vazio"),
]


def write_csv(leads: list[Lead], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.writer(fh, delimiter=";")
        w.writerow([h for h, _ in CSV_FIELDS])
        for ld in leads:
            sp = ld.sinal_principal
            row = []
            for _, attr in CSV_FIELDS:
                if attr == "_titulo":
                    row.append(sp.get("titulo", ""))
                elif attr == "_link":
                    row.append(sp.get("link", ""))
                elif attr == "_status":
                    row.append("Novo")
                elif attr == "_vazio":
                    row.append("")
                else:
                    row.append(getattr(ld, attr))
            w.writerow(row)


# ---------------------------------------------------------------------------
# Orquestração
# ---------------------------------------------------------------------------

def run(window: int | None = None) -> list[Lead]:
    cfg = load_leads_config()
    if not cfg.get("gatilhos"):
        log.info("Radar de Leads: sem config/leads.yaml — pulando.")
        return load_db()
    existing = load_db()
    known = {(x.get("link"), x.get("titulo")) for ld in existing for x in ld.sinais}
    known_links = {k[0] for k in known}
    known_titles = {k[1] for k in known}
    signals = [s for s in collect_signals(cfg, window)
               if s.link not in known_links and s.titulo not in known_titles]
    analyses: list[dict] = []
    if signals and config.anthropic_api_key():
        log.info("Analisando %d sinais com IA (%s).", len(signals), config.leads_model())
        analyses = _analyze_with_claude(cfg, signals)
    leads = merge(cfg, existing, signals, analyses)

    vagas, analises_vagas = collect_vagas(cfg)
    if vagas:  # o merge já ignora a mesma vaga vista em dias anteriores
        leads = merge(cfg, leads, vagas, analises_vagas)

    save_db(leads)
    log.info("Radar de Leads: %d leads na base.", len(leads))

    from . import prospeccao_publish
    try:
        prospeccao_publish.publish(leads)
    except Exception as exc:  # noqa: BLE001
        log.warning("Gravação na Prospecção do app falhou: %s", exc)
    return leads


def gatilhos_for_site() -> list[dict]:
    return [{"id": g["id"], "nome": g["nome"]}
            for g in load_leads_config().get("gatilhos", []) or []]

"""Tradução, resumo e gancho de conteúdo em português.

Para cada matéria gera:
- título traduzido (se estrangeira) e resumo da essência em português;
- "gancho" de conteúdo;
- "link_kelly": como aquela matéria pode ser ligada ao negócio da Kelly
  (KA · Inteligência para Marcas) e aos seus produtos.

Com a chave da Claude (ANTHROPIC_API_KEY) tudo isso sai sob medida e inteligente.
Sem a chave: tradução automática gratuita + rodapé por categoria (genérico).
"""

from __future__ import annotations

import json
import logging
import re

from . import config
from .models import Item

log = logging.getLogger("sistemaka.summarize")

BATCH_SIZE = 8

# Rodapé genérico por categoria (usado quando NÃO há IA). Liga ao trabalho da KA.
FALLBACK_LINK = {
    "branding_ia": "IA aplicada a marca — gancho para o Projeto e a Direção com Essência.",
    "marketing_ia": "IA no marketing — Direção com Essência / Projeto Marca com Essência.",
    "branding": "Construção de marca — tema do Livro e da Mentoria.",
    "essencia": "Essência/propósito/cultura — a etapa que abre o método Marca com Essência.",
    "pme": "Marca para pequeno negócio/marca pessoal — público do Livro e da Mentoria.",
    "campanha": "Case de campanha — referência para o Projeto e a Mentoria.",
    "posicionamento": "Posicionamento/reposicionamento — coração do método Marca com Essência.",
    "semiotica": "Semiótica de marca — base do Livro e da Mentoria.",
    "neuromarketing": "Neuromarketing — embasa o Livro e a Mentoria.",
    "polemica": "Marca/reputação — gancho para a Mentoria e a Direção com Essência.",
    "influencer": "Reputação de marca pessoal/influenciador — gestão de crise: gancho para a Mentoria e a Direção com Essência.",
    "pesquisa": "Dado de pesquisa/tendência — sustenta argumentos na Mentoria e na Direção com Essência.",
    "academico": "Autoridade acadêmica — material de apoio para o Livro e a Mentoria.",
}

# Por que o conteúdo é útil para o pequeno/médio empresário (PME).
FALLBACK_PME = {
    "branding_ia": "PME: como usar IA para fortalecer a marca sem precisar de grande orçamento.",
    "marketing_ia": "PME: ideias práticas de IA para o marketing do dia a dia do negócio.",
    "branding": "PME: lições de construção de marca aplicáveis a negócios pequenos e médios.",
    "essencia": "PME: como partir da essência e do propósito para uma marca mais verdadeira e coerente.",
    "pme": "PME: branding aplicado à realidade de quem tem pouco orçamento e precisa se diferenciar.",
    "campanha": "PME: ideias de campanha que dá para adaptar com poucos recursos.",
    "posicionamento": "PME: como se posicionar e se diferenciar no seu mercado.",
    "semiotica": "PME: como usar símbolos e significados para comunicar o valor da marca.",
    "neuromarketing": "PME: gatilhos de decisão para aplicar em vendas e comunicação.",
    "polemica": "PME: o que aprender sobre reputação e gestão de crise da marca.",
    "influencer": "PME: lições de reputação e gestão de crise aplicáveis à marca (pessoal ou do negócio).",
    "pesquisa": "PME: dados de consumo/tendências para decidir com base em evidência.",
    "academico": "PME: base sólida para decisões de marca com mais segurança.",
}


def _apply_fallback_notes(item: Item) -> None:
    # Sem IA: deixamos a "persona" vazia (decidir persona exige leitura/raciocínio).
    item.link_kelly = ""
    item.pme_pt = FALLBACK_PME.get(item.category, FALLBACK_PME["branding"])


def _business_block() -> str:
    b = config.load_config().get("business", {}) or {}
    prods = []
    for p in b.get("produtos", []) or []:
        if isinstance(p, dict):
            persona = " ".join((p.get("persona") or "").split())
            prods.append(
                f"- {p.get('nome')} ({p.get('preco','')}, {p.get('nivel','')}): "
                f"persona = {persona} Dor: {p.get('dor','')}"
            )
        else:
            prods.append(f"- {p}")
    return (
        f"NEGÓCIO DA KELLY: {b.get('nome','')}. {b.get('descricao','')}\n"
        f"PRODUTOS E PERSONAS:\n" + "\n".join(prods) + f"\nPúblico: {b.get('publico','')}"
    )


def _system_prompt() -> str:
    return (
        "Você é editor(a) e estrategista de conteúdo da Kelly Albert (branding). "
        + _business_block() +
        " Para cada item escreva em PORTUGUÊS do Brasil: (1) 'titulo' — título "
        "traduzido (se já estiver em PT, repita); (2) 'resumo' — 1 frase CURTA "
        "com a essência da matéria, para triagem rápida; (3) 'persona' — diga "
        "para QUAL persona/produto esta matéria mais interessa e por quê, em 1 "
        "frase, escolhendo entre: Livro (faça você mesmo, autonomia), Mentoria "
        "(apoio estratégico ao vivo em grupo), Projeto (feito sob medida pra "
        "você) ou Direção (acompanhamento estratégico contínuo); se não "
        "interessar a nenhuma, devolva \"\"; (4) 'pme' — 1 frase prática de como o "
        "conteúdo é útil para o pequeno/médio empresário. Seja fiel, sem inventar. "
        "Responda SOMENTE um array JSON na ordem dos itens: "
        '[{"i":0,"titulo":"...","resumo":"...","persona":"...","pme":"..."}].'
    )


def summarize_items(items: list[Item]) -> list[Item]:
    if config.anthropic_api_key():
        _with_claude(items)
    else:
        log.info("Sem ANTHROPIC_API_KEY — tradução automática + rodapé por categoria.")
        for item in items:
            _translate_fallback(item)
            _apply_fallback_notes(item)
    return items


# ---- Caminho com IA (Claude) ----------------------------------------------

def _with_claude(items: list[Item]) -> None:
    try:
        import anthropic
    except ImportError:
        log.warning("Pacote 'anthropic' ausente — caindo no modo gratuito.")
        for item in items:
            _translate_fallback(item)
            _apply_fallback_notes(item)
        return

    client = anthropic.Anthropic(api_key=config.anthropic_api_key())
    model = config.anthropic_model()
    system = _system_prompt()
    log.info("Resumindo/traduzindo/linkando %d itens com IA (%s).", len(items), model)

    for start in range(0, len(items), BATCH_SIZE):
        batch = items[start:start + BATCH_SIZE]
        try:
            _claude_batch(client, model, system, batch)
        except Exception as exc:  # noqa: BLE001
            log.warning("Lote de IA falhou (%s) — modo gratuito no lote.", exc)
            for item in batch:
                _translate_fallback(item)
                _apply_fallback_notes(item)


def _claude_batch(client, model: str, system: str, batch: list[Item]) -> None:
    payload = [
        {"i": idx, "titulo": it.title, "idioma": it.lang, "categoria": it.category,
         "trecho": (it.raw_summary or "")[:800]}
        for idx, it in enumerate(batch)
    ]
    message = client.messages.create(
        model=model, max_tokens=2500, system=system,
        messages=[{"role": "user",
                   "content": "Itens:\n" + json.dumps(payload, ensure_ascii=False)}],
    )
    text = "".join(b.text for b in message.content if getattr(b, "type", "") == "text")
    parsed = _extract_json(text) or []
    by_index = {e.get("i"): e for e in parsed}
    for idx, item in enumerate(batch):
        entry = by_index.get(idx)
        if entry and entry.get("resumo"):
            item.summary_pt = (entry.get("resumo") or "").strip()
            item.link_kelly = (entry.get("persona") or "").strip()  # "Para a persona ..."
            item.pme_pt = (entry.get("pme") or "").strip()
            if item.needs_translation:
                item.title_pt = (entry.get("titulo") or "").strip()
        else:
            _translate_fallback(item)
            _apply_fallback_notes(item)


def _extract_json(text: str):
    m = re.search(r"\[.*\]", text.strip(), re.DOTALL)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        return None


# ---- Caminho gratuito (tradução automática) -------------------------------

_translator = None


def _get_translator():
    global _translator
    if _translator is None:
        from deep_translator import GoogleTranslator
        _translator = GoogleTranslator(source="auto", target="pt")
    return _translator


def _translate(text: str) -> str:
    text = (text or "").strip()
    if not text:
        return ""
    try:
        return _get_translator().translate(text[:4500]) or text
    except Exception as exc:  # noqa: BLE001
        log.debug("Tradução falhou: %s", exc)
        return text


def _essence(text: str, max_chars: int = 180) -> str:
    """Resumo curto: 1–2 primeiras frases, para triagem rápida."""
    text = re.sub(r"\s+", " ", (text or "")).strip()
    if not text:
        return ""
    parts = re.split(r"(?<=[.!?])\s+", text)
    out = ""
    for p in parts:
        if not out:
            out = p
        elif len(out) + 1 + len(p) <= max_chars:
            out += " " + p
        else:
            break
    if len(out) > max_chars + 40:
        out = out[:max_chars].rsplit(" ", 1)[0] + "…"
    return out


def _translate_fallback(item: Item) -> Item:
    snippet = (item.raw_summary or "").strip()
    if item.needs_translation:
        item.title_pt = _translate(item.title)
        base = _translate(snippet) if snippet else _translate(item.title)
    else:
        base = snippet or item.title
    item.summary_pt = _essence(base)
    return item


# ---- Resumo mensal ---------------------------------------------------------

MONTH_SYSTEM_PROMPT = (
    "Você é estrategista de branding. Receberá manchetes de um mês sobre branding, "
    "IA, campanhas, posicionamento, semiótica e neuromarketing. Escreva, em "
    "PORTUGUÊS, um panorama em 2 a 4 parágrafos curtos: tendências, destaques de IA "
    "aplicada a marca e oportunidades de conteúdo. Responda em HTML usando só <p>."
)


def summarize_month(month: str, items: list[Item]) -> str:
    key = config.anthropic_api_key()
    if not key or not items:
        return ""
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=key)
        headlines = "\n".join(
            f"- [{it.category_label}] {it.display_title} — {it.summary_pt[:160]}"
            for it in items[:120]
        )
        message = client.messages.create(
            model=config.anthropic_model(), max_tokens=900,
            system=MONTH_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": f"Mês {month}:\n{headlines}"}],
        )
        return "".join(
            b.text for b in message.content if getattr(b, "type", "") == "text"
        ).strip()
    except Exception as exc:  # noqa: BLE001
        log.warning("Resumo mensal falhou: %s", exc)
        return ""


# ---- Boletim do dia --------------------------------------------------------

# Temas do boletim pedidos pela Kelly: branding, posicionamento, semiótica e
# comunicação (campanha/marketing). Essência e IA aplicada a marca entram juntas.
BULLETIN_CATEGORIES = {
    "branding", "posicionamento", "semiotica", "campanha", "essencia",
    "branding_ia", "marketing_ia",
}

BULLETIN_SYSTEM_PROMPT = (
    "Você é editora de branding e escreve com a voz da Kelly Albert (método "
    "Marca com Essência: marca construída de dentro para fora — essência, "
    "posicionamento, identidade verbal, comunicação). Receberá as notícias do "
    "dia sobre BRANDING, POSICIONAMENTO, SEMIÓTICA e COMUNICAÇÃO. Escreva, em "
    "PORTUGUÊS do Brasil, o BOLETIM DO DIA em DUAS partes, em HTML simples:\n"
    "1) <h4>Em resumo</h4> seguido de <ul> com 4 a 6 <li> CURTOS — cada um diz o "
    "que aconteceu e, em poucas palavras, por que importa para quem cuida de marca.\n"
    "2) <h4>Pronto para repostar</h4> seguido de 1 ou 2 <p> em tom editorial, na "
    "voz da Kelly, conectando os fatos a uma ideia central, e terminando com um "
    "gancho de reflexão/opinião que ela possa usar em post, story ou newsletter.\n"
    "Seja fiel às notícias (não invente). Não cite links. Use só <h4>, <ul>, <li>, <p>."
)


def generate_bulletin(day: str, items: list[Item]) -> str:
    """Gera o 'Boletim do dia' (HTML) a partir das notícias do dia nos temas
    de branding/posicionamento/semiótica/comunicação. Sem chave de IA: vazio."""
    key = config.anthropic_api_key()
    if not key:
        return ""
    relevantes = [it for it in items if it.category in BULLETIN_CATEGORIES and it.summary_pt]
    relevantes.sort(key=lambda it: it.score, reverse=True)
    relevantes = relevantes[:18]
    if len(relevantes) < 2:
        return ""
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=key)
        linhas = "\n".join(
            f"- [{it.category_label}] {it.display_title} — {it.summary_pt[:200]}"
            for it in relevantes
        )
        message = client.messages.create(
            model=config.anthropic_model(), max_tokens=1200,
            system=BULLETIN_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": f"Notícias de {day}:\n{linhas}"}],
        )
        return "".join(
            b.text for b in message.content if getattr(b, "type", "") == "text"
        ).strip()
    except Exception as exc:  # noqa: BLE001
        log.warning("Boletim do dia falhou (%s): %s", day, exc)
        return ""

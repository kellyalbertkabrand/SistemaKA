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
    "branding_ia": "IA aplicada a marca — gancho para a Direção de Marca e o Programa Marca com Essência.",
    "marketing_ia": "IA no marketing — Direção de Marca / Programa Marca com Essência.",
    "branding": "Construção de marca — tema do Livro e da Mentoria.",
    "campanha": "Case de campanha — referência para a Direção de Marca e a Mentoria.",
    "posicionamento": "Posicionamento/reposicionamento — coração do Programa Marca com Essência.",
    "semiotica": "Semiótica de marca — base do Livro e da Mentoria.",
    "neuromarketing": "Neuromarketing — embasa o Livro e a Mentoria.",
    "polemica": "Marca/reputação — gancho para a Mentoria e o Programa Marca com Essência.",
    "academico": "Autoridade acadêmica — material de apoio para o Livro e a Mentoria.",
}


def _business_block() -> str:
    b = config.load_config().get("business", {}) or {}
    prods = []
    for p in b.get("produtos", []) or []:
        if isinstance(p, dict):
            prods.append(f"{p.get('nome')} ({p.get('sobre')}) {p.get('url')}")
        else:
            prods.append(str(p))
    return (
        f"NEGÓCIO DA KELLY: {b.get('nome','')}. {b.get('descricao','')} "
        f"PRODUTOS (nome — sobre — link): {'; '.join(prods)}. Público: {b.get('publico','')}"
    )


def _system_prompt() -> str:
    return (
        "Você é editor(a) e estrategista de conteúdo da Kelly Albert (branding). "
        + _business_block() +
        " Para cada item escreva em PORTUGUÊS do Brasil: (1) 'titulo' — título "
        "traduzido (se já estiver em PT, repita); (2) 'resumo' — 1-2 frases com a "
        "essência; (3) 'gancho' — 1 frase de por que é útil para conteúdo de "
        "branding/posicionamento/semiótica/neuromarketing; (4) 'link' — 1 frase "
        "começando com 'Dá pra linkar:' dizendo como ESTA matéria conecta com UM "
        "produto específico da Kelly, citando-o pelo nome (Livro, Mentoria, "
        "Direção de Marca ou Programa Marca com Essência). Seja fiel, sem "
        "inventar. Responda SOMENTE um array JSON na ordem dos itens: "
        '[{"i":0,"titulo":"...","resumo":"...","gancho":"...","link":"..."}].'
    )


def summarize_items(items: list[Item]) -> list[Item]:
    if config.anthropic_api_key():
        _with_claude(items)
    else:
        log.info("Sem ANTHROPIC_API_KEY — tradução automática + rodapé por categoria.")
        for item in items:
            _translate_fallback(item)
            item.link_kelly = FALLBACK_LINK.get(item.category, FALLBACK_LINK["branding"])
    return items


# ---- Caminho com IA (Claude) ----------------------------------------------

def _with_claude(items: list[Item]) -> None:
    try:
        import anthropic
    except ImportError:
        log.warning("Pacote 'anthropic' ausente — caindo no modo gratuito.")
        for item in items:
            _translate_fallback(item)
            item.link_kelly = FALLBACK_LINK.get(item.category, FALLBACK_LINK["branding"])
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
                item.link_kelly = FALLBACK_LINK.get(item.category, FALLBACK_LINK["branding"])


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
            item.angle_pt = (entry.get("gancho") or "").strip()
            item.link_kelly = (entry.get("link") or "").strip()
            if item.needs_translation:
                item.title_pt = (entry.get("titulo") or "").strip()
        else:
            _translate_fallback(item)
            item.link_kelly = FALLBACK_LINK.get(item.category, FALLBACK_LINK["branding"])


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


def _translate_fallback(item: Item) -> Item:
    snippet = (item.raw_summary or "").strip()
    if item.needs_translation:
        item.title_pt = _translate(item.title)
        base = _translate(snippet) if snippet else _translate(item.title)
    else:
        base = snippet or item.title
    item.summary_pt = base[:320] + ("…" if len(base) > 320 else "")
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

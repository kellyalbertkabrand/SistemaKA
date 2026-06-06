"""Tradução e resumo em português.

Toda matéria em outra língua recebe TÍTULO traduzido e resumo em português.

- Com a chave da Claude (ANTHROPIC_API_KEY): tradução + síntese da essência +
  um gancho de conteúdo para o trabalho da Kelly (qualidade alta).
- Sem a chave: tradução automática gratuita (Google Translate via
  deep-translator) do título e do trecho. Funciona sem nenhuma configuração.
"""

from __future__ import annotations

import json
import logging
import re

from . import config
from .models import Item

log = logging.getLogger("sistemaka.summarize")

SYSTEM_PROMPT = (
    "Você é um editor brasileiro especialista em branding, publicidade, semiótica "
    "e neuromarketing. Para cada item, escreva em PORTUGUÊS do Brasil: (1) 'titulo' "
    "— o título traduzido para o português (se já estiver em português, repita-o); "
    "(2) 'resumo' — 1 a 2 frases com a essência do conteúdo; (3) 'gancho' — 1 frase "
    "curta sobre por que isso é útil para quem trabalha com campanha/ideia, "
    "posicionamento e reposicionamento de marca, semiótica e neuromarketing. Seja "
    "fiel, sem inventar. Responda SOMENTE com um array JSON, na mesma ordem dos "
    'itens: [{"i":0,"titulo":"...","resumo":"...","gancho":"..."}].'
)
BATCH_SIZE = 8


def summarize_items(items: list[Item]) -> list[Item]:
    if config.anthropic_api_key():
        _with_claude(items)
    else:
        log.info("Sem ANTHROPIC_API_KEY — usando tradução automática gratuita.")
        for item in items:
            _translate_fallback(item)
    return items


# ---- Caminho com IA (Claude) ----------------------------------------------

def _with_claude(items: list[Item]) -> None:
    try:
        import anthropic
    except ImportError:
        log.warning("Pacote 'anthropic' ausente — caindo na tradução automática.")
        for item in items:
            _translate_fallback(item)
        return

    client = anthropic.Anthropic(api_key=config.anthropic_api_key())
    model = config.anthropic_model()
    log.info("Resumindo/traduzindo %d itens com IA (%s).", len(items), model)

    for start in range(0, len(items), BATCH_SIZE):
        batch = items[start:start + BATCH_SIZE]
        try:
            _claude_batch(client, model, batch)
        except Exception as exc:  # noqa: BLE001
            log.warning("Lote de IA falhou (%s) — tradução automática no lote.", exc)
            for item in batch:
                _translate_fallback(item)


def _claude_batch(client, model: str, batch: list[Item]) -> None:
    payload = [
        {"i": idx, "titulo": it.title, "idioma": it.lang,
         "trecho": (it.raw_summary or "")[:800]}
        for idx, it in enumerate(batch)
    ]
    message = client.messages.create(
        model=model, max_tokens=2000, system=SYSTEM_PROMPT,
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
            if item.needs_translation:
                item.title_pt = (entry.get("titulo") or "").strip()
        else:
            _translate_fallback(item)


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

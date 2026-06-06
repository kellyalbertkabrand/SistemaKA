"""Geração dos resumos em português.

Com a chave da Claude (ANTHROPIC_API_KEY) o sistema traduz o que está em inglês
e escreve uma síntese curta da essência + um gancho de conteúdo para o trabalho
da Kelly (campanha/ideia, posicionamento, semiótica, neuromarketing).

Sem a chave, ele degrada com elegância: usa o próprio trecho da fonte como
resumo e segue funcionando.
"""

from __future__ import annotations

import json
import logging
import re

from . import config
from .models import Item

log = logging.getLogger("sistemaka.summarize")

SYSTEM_PROMPT = (
    "Você é um editor brasileiro especialista em branding, publicidade, "
    "semiótica e neuromarketing. Para cada item recebido, escreva em PORTUGUÊS "
    "do Brasil: (1) 'resumo' — 1 a 2 frases com a essência do conteúdo, claras e "
    "diretas, traduzindo se o original estiver em inglês; (2) 'gancho' — 1 frase "
    "curta dizendo por que isso é interessante para quem trabalha com campanha/"
    "ideia, posicionamento e reposicionamento de marca, semiótica e neuromarketing. "
    "Seja fiel ao conteúdo, sem inventar dados. Responda SOMENTE com um array JSON "
    "válido, na mesma ordem dos itens, no formato "
    '[{"i": 0, "resumo": "...", "gancho": "..."}].'
)

BATCH_SIZE = 8


def summarize_items(items: list[Item]) -> list[Item]:
    key = config.anthropic_api_key()
    if not key:
        log.info("Sem ANTHROPIC_API_KEY — usando trecho original como resumo.")
        return [_fallback(item) for item in items]

    try:
        import anthropic
    except ImportError:
        log.warning("Pacote 'anthropic' não instalado — usando fallback.")
        return [_fallback(item) for item in items]

    client = anthropic.Anthropic(api_key=key)
    model = config.anthropic_model()
    log.info("Resumindo %d itens com IA (modelo %s).", len(items), model)

    for start in range(0, len(items), BATCH_SIZE):
        batch = items[start:start + BATCH_SIZE]
        try:
            _summarize_batch(client, model, batch)
        except Exception as exc:  # noqa: BLE001
            log.warning("Lote de IA falhou (%s) — usando fallback no lote.", exc)
            for item in batch:
                _fallback(item)
    return items


def _summarize_batch(client, model: str, batch: list[Item]) -> None:
    payload = [
        {
            "i": idx,
            "titulo": item.title,
            "idioma": item.lang,
            "tipo": item.kind_label,
            "trecho": (item.raw_summary or "")[:800],
        }
        for idx, item in enumerate(batch)
    ]
    message = client.messages.create(
        model=model,
        max_tokens=1500,
        system=SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": "Itens:\n" + json.dumps(payload, ensure_ascii=False),
        }],
    )
    text = "".join(
        block.text for block in message.content if getattr(block, "type", "") == "text"
    )
    parsed = _extract_json(text)
    by_index = {entry.get("i"): entry for entry in parsed} if parsed else {}
    for idx, item in enumerate(batch):
        entry = by_index.get(idx)
        if entry and entry.get("resumo"):
            item.summary_pt = entry["resumo"].strip()
            item.angle_pt = (entry.get("gancho") or "").strip()
        else:
            _fallback(item)


def _extract_json(text: str):
    text = text.strip()
    match = re.search(r"\[.*\]", text, re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


MONTH_SYSTEM_PROMPT = (
    "Você é um(a) estrategista de branding brasileiro(a). Receberá uma lista de "
    "manchetes/resumos coletados ao longo de um mês sobre branding, IA, campanhas, "
    "posicionamento, semiótica e neuromarketing. Escreva, em PORTUGUÊS do Brasil, "
    "um panorama do mês em 2 a 4 parágrafos curtos: principais tendências, o que se "
    "destacou em IA aplicada a marca, e oportunidades de conteúdo para quem trabalha "
    "com campanha, posicionamento/reposicionamento, semiótica e neuromarketing. "
    "Responda em HTML simples usando apenas tags <p>."
)


def summarize_month(month: str, items: list[Item]) -> str:
    """Gera o panorama do mês. Usa IA quando disponível; senão, devolve vazio."""
    key = config.anthropic_api_key()
    if not key or not items:
        return ""
    try:
        import anthropic
    except ImportError:
        return ""
    try:
        client = anthropic.Anthropic(api_key=key)
        headlines = "\n".join(
            f"- [{it.category_label}] {it.title} — {it.summary_pt[:160]}"
            for it in items[:120]
        )
        message = client.messages.create(
            model=config.anthropic_model(),
            max_tokens=900,
            system=MONTH_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": f"Mês {month}:\n{headlines}"}],
        )
        text = "".join(
            b.text for b in message.content if getattr(b, "type", "") == "text"
        ).strip()
        return text
    except Exception as exc:  # noqa: BLE001
        log.warning("Resumo mensal falhou: %s", exc)
        return ""


def _fallback(item: Item) -> Item:
    snippet = (item.raw_summary or "").strip()
    if snippet:
        item.summary_pt = snippet[:320] + ("…" if len(snippet) > 320 else "")
    else:
        item.summary_pt = item.title
    if item.lang == "en" and not item.angle_pt:
        item.angle_pt = "Conteúdo em inglês — ative a IA para tradução e síntese automática."
    return item

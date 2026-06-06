"""Deduplicação e ranqueamento de relevância dos itens coletados."""

from __future__ import annotations

import logging
import re

from .models import Item

log = logging.getLogger("sistemaka.relevance")


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s]", " ", text.lower())).strip()


def score(item: Item, keywords: list[str]) -> int:
    """Pontua a relevância pela presença de palavras-chave no título/resumo."""
    haystack = f" {_normalize(item.title)} {_normalize(item.raw_summary)} "
    points = 0
    for kw in keywords:
        if _normalize(kw) and _normalize(kw) in haystack:
            points += 1
    # O título pesa mais que o corpo.
    title_norm = f" {_normalize(item.title)} "
    for kw in keywords:
        if _normalize(kw) and _normalize(kw) in title_norm:
            points += 1
    # Artigos acadêmicos entram com um bônus (são mais difíceis de achar).
    if item.kind == "academico":
        points += 1
    return points


def dedupe(items: list[Item]) -> list[Item]:
    """Remove duplicatas por id (link) e por título normalizado."""
    seen_ids: set[str] = set()
    seen_titles: set[str] = set()
    out: list[Item] = []
    for item in items:
        title_key = _normalize(item.title)[:80]
        if item.id in seen_ids or (title_key and title_key in seen_titles):
            continue
        seen_ids.add(item.id)
        if title_key:
            seen_titles.add(title_key)
        out.append(item)
    return out


def rank_and_filter(items: list[Item], cfg: dict) -> list[Item]:
    """Deduplica, descarta itens irrelevantes e ordena por relevância."""
    keywords = cfg.get("keywords", [])
    max_items = int(cfg.get("max_items_per_day", 40))

    unique = dedupe(items)
    scored: list[tuple[int, Item]] = []
    for item in unique:
        s = score(item, keywords)
        # Itens vindos de buscas temáticas já são relevantes (score mínimo 1).
        if s <= 0 and item.kind != "academico":
            continue
        scored.append((s, item))

    # Ordena por: relevância desc, depois data desc.
    scored.sort(key=lambda t: (t[0], t[1].published), reverse=True)
    result = [item for _, item in scored[:max_items]]
    log.info("Após ranqueamento: %d itens (de %d únicos)", len(result), len(unique))
    return result

"""Validação, deduplicação e ranqueamento dos itens coletados."""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from urllib.parse import urlparse

from .models import Item

log = logging.getLogger("sistemaka.relevance")


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s]", " ", text.lower())).strip()


def is_valid(item: Item) -> bool:
    """Item só vale se tiver fonte real (link de matéria) e data PLAUSÍVEL."""
    if not item.has_full_date:
        return False
    try:
        d = datetime.fromisoformat(item.published).date()
    except ValueError:
        return False
    today = datetime.now(timezone.utc).date()
    if d > today or d.year < 2005:  # datas no futuro ou absurdas → fora
        return False
    link = item.link or ""
    if not link.startswith(("http://", "https://")):
        return False
    host = urlparse(link).netloc.lower()
    if "google.com" in host or not item.title.strip():
        return False
    return True


def score(item: Item, keywords: list[str]) -> int:
    """Pontua a relevância pela presença de palavras-chave."""
    body = f" {_normalize(item.title)} {_normalize(item.raw_summary)} "
    title = f" {_normalize(item.title)} "
    points = 0
    for kw in keywords:
        nk = _normalize(kw)
        if not nk:
            continue
        if nk in body:
            points += 1
        if nk in title:
            points += 1  # título pesa o dobro
    if item.kind == "academico":
        points += 1
    return points


def dedupe(items: list[Item]) -> list[Item]:
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
    """Descarta inválidos, deduplica, pontua e ordena. Grava o score no item."""
    keywords = cfg.get("keywords", [])

    valid = [it for it in items if is_valid(it)]
    dropped = len(items) - len(valid)
    if dropped:
        log.info("Descartados por falta de fonte/data: %d", dropped)

    unique = dedupe(valid)
    kept: list[Item] = []
    for item in unique:
        s = score(item, keywords)
        if s <= 0 and item.kind != "academico":
            continue
        item.score = s
        kept.append(item)

    kept.sort(key=lambda it: (it.score, it.published), reverse=True)
    max_total = int(cfg.get("max_total_items", 90))
    kept = kept[:max_total]
    log.info("Após ranqueamento: %d itens válidos (de %d coletados)", len(kept), len(items))
    return kept

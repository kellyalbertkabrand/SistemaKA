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


# Para POLÊMICA valer, precisa ter termo FORTE de marca/marketing — corta
# "campanha" (política/esporte), fofoca de celebridade e afins.
_POLEMICA_REQUIRED = [
    "marketing", "publicidade", "publicitar", "propaganda", "branding",
    "rebrand", "boicote", "anunciante", "patrocin", "marca pessoal",
    "identidade de marca", "reposicionamento", "logotipo", "consumidor",
]


def _is_brand_polemica(item: Item) -> bool:
    hay = _normalize(f"{item.title} {item.raw_summary}")
    return any(t in hay for t in _POLEMICA_REQUIRED)


# Contexto NÚCLEO de marca (sem "marca"/"marketing" soltos, que pegam ruído).
# Usado para garantir que itens de IA sejam de fato sobre branding/posicionamento.
_CORE_BRANDING = [
    "branding", "rebrand", "posicionament", "reposicionament", "positioning",
    "repositioning", "identidade", "brand identity", "brand strategy",
    "estratégia de marca", "marca pessoal", "personal brand", "brand purpose",
    "propósito de marca", "semiót", "semiot", "gestão de marca", "brand management",
    "construção de marca", "essência da marca", "essência de marca",
]


def _has_core_branding(item: Item) -> bool:
    hay = _normalize(f"{item.title} {item.raw_summary}")
    return any(t in hay for t in _CORE_BRANDING)


# Ruído de política/justiça (a palavra "marca" como verbo costuma trazer isso).
_POLITICS_NOISE = [
    "stf", "stj", "stm", "tse", "bolsonaro", "lula", "ministro", "ministra",
    "relator", "deputado", "senador", "eleição", "eleitoral", "habeas",
    "presidente da república", "supremo", "inquérito",
]


def _is_politics_noise(item: Item) -> bool:
    hay = _normalize(f"{item.title} {item.raw_summary}")
    return any(t in hay for t in _POLITICS_NOISE)


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

    business_terms = (cfg.get("business", {}) or {}).get("termos_prioritarios", []) or []

    unique = dedupe(valid)
    kept: list[Item] = []
    for item in unique:
        # Polêmica só vale se tiver contexto de marca/marketing forte.
        if item.category == "polemica" and not _is_brand_polemica(item):
            continue
        # Itens de IA precisam ser de fato sobre branding/posicionamento (não IA genérica).
        if item.category in ("branding_ia", "marketing_ia") and not _has_core_branding(item):
            continue
        # Corta ruído de política/justiça (a menos que seja claramente sobre marca).
        if _is_politics_noise(item) and not _has_core_branding(item):
            continue
        if score(item, keywords) <= 0:
            continue  # sem nenhuma palavra-chave relevante → fora
        # GATE de produto: só mostra se tiver a ver com os temas/produtos da Kelly.
        biz = score(item, business_terms)
        if biz <= 0:
            continue
        item.score = 1 + 2 * biz  # relevância priorizando o encaixe com o negócio
        kept.append(item)

    kept.sort(key=lambda it: (it.score, it.published), reverse=True)
    max_total = int(cfg.get("max_total_items", 90))
    kept = kept[:max_total]
    log.info("Após ranqueamento: %d itens válidos (de %d coletados)", len(kept), len(items))
    return kept

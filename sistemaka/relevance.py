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


# Polêmica de INFLUENCIADOR (marca pessoal / reputação). Precisa ter um termo de
# influenciador (ou nome) E um termo de polêmica/crise — para não virar fofoca solta.
_INFLUENCER_TERMS = [
    "influenciador", "influencer", "digital influencer", "youtuber", "tiktoker",
    "criador de conteúdo", "content creator", "creator", "blogueir",
    "virginia fonseca", "carlinhos maia",
]
_POLEMICA_TERMS = [
    "polêmica", "polemica", "cancelad", "cancelament", "boicote", "crise",
    "escândalo", "escandalo", "processo", "processad", "acusa", "exposição",
    "exposicao", "expõe", "expos", "treta", "controvérsia", "controversia",
    "crítica", "criticad", "detona", "detonou", "repercussão", "repercute",
    "denúncia", "denuncia", "indiciad", "multa", "alvo de", "rebate", "ataca",
    "backlash", "boycott", "scandal", "controversy", "lawsuit", "cancel",
    "slammed", "accused", "apology", "apologiz",
]


def _is_influencer_polemica(item: Item) -> bool:
    hay = _normalize(f"{item.title} {item.raw_summary}")
    return (any(t in hay for t in _INFLUENCER_TERMS)
            and any(t in hay for t in _POLEMICA_TERMS))


# Contexto NÚCLEO de marca (sem "marca"/"marketing" soltos, que pegam ruído).
# Usado para garantir que itens de IA sejam de fato sobre branding/posicionamento.
_CORE_BRANDING = [
    "branding", "rebrand", "posicionament", "reposicionament", "positioning",
    "repositioning", "identidade", "brand identity", "brand strategy",
    "estratégia de marca", "marca pessoal", "personal brand", "brand purpose",
    "propósito de marca", "semiót", "semiot", "gestão de marca", "brand management",
    "construção de marca", "essência da marca", "essência de marca", "brand essence",
    "cultura de marca", "brand culture", "marca de fundador", "founder brand",
    "founder-led", "employer brand", "small business brand", "branding para",
    "branding for", "brand building",
]

# Categorias que SÓ valem se tiverem contexto-núcleo de marca (cortam ruído
# de "IA genérica", "marketing genérico" ou "pequeno negócio sem branding").
_CORE_REQUIRED_CATEGORIES = {"branding_ia", "marketing_ia", "essencia", "pme"}

# Peso extra por categoria — a especialidade da KA sobe no ranking.
_CATEGORY_BOOST = {"posicionamento": 4, "essencia": 3, "pme": 2, "polemica": 1,
                   "influencer": 1}

# Peso extra por ORIGEM — a Kelly quer o nacional priorizado (retido na triagem
# e mais bem ranqueado). Polêmica nacional fica no topo (categoria + região).
_REGION_BOOST = {"BR": 5}


def _region_boost(item: Item) -> int:
    return _REGION_BOOST.get((item.region or "").upper(), 0)


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
        # Polêmica de marca só vale com contexto de marca/marketing forte.
        if item.category == "polemica" and not _is_brand_polemica(item):
            continue
        # Polêmica de influenciador: exige influenciador + termo de polêmica/crise.
        if item.category == "influencer" and not _is_influencer_polemica(item):
            continue
        # IA, marketing, essência e PME precisam ser de fato sobre marca (não genéricos).
        if item.category in _CORE_REQUIRED_CATEGORIES and not _has_core_branding(item):
            continue
        # Corta ruído de política/justiça (a menos que seja claramente sobre marca).
        if _is_politics_noise(item) and not _has_core_branding(item):
            continue
        if item.category != "influencer" and score(item, keywords) <= 0:
            continue  # sem nenhuma palavra-chave relevante → fora
        if item.category == "influencer":
            # Marca pessoal / reputação é relevante por si — não exige termo de negócio.
            biz = max(score(item, business_terms), 1)
        else:
            # GATE de produto: só mostra se tiver a ver com os temas/produtos da Kelly.
            biz = score(item, business_terms)
            if biz <= 0:
                continue
        # Relevância: negócio + especialidade da KA + prioridade do nacional.
        item.score = (1 + 2 * biz
                      + _CATEGORY_BOOST.get(item.category, 0)
                      + _region_boost(item))
        kept.append(item)

    kept.sort(key=lambda it: (it.score, it.published), reverse=True)
    max_total = int(cfg.get("max_total_items", 90))
    kept = kept[:max_total]
    log.info("Após ranqueamento: %d itens válidos (de %d coletados)", len(kept), len(items))
    return kept

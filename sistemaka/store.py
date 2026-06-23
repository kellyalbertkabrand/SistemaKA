"""Persistência do arquivo histórico (data/items/AAAA-MM-DD.json).

Os itens são arquivados pela DATA REAL de publicação — então a página de um dia
mostra exatamente o que foi publicado naquele dia.
"""

from __future__ import annotations

import json
import logging
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

from . import config
from .models import Item

log = logging.getLogger("sistemaka.store")

DATE_RE = re.compile(r"\d{4}-\d{2}-\d{2}")


def _day_path(day: str) -> Path:
    return config.DATA_DIR / f"{day}.json"


def today_str() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def _norm_title(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s]", " ", (text or "").lower())).strip()[:90]


def save_day(day: str, items: list[Item], max_per_day: int = 60) -> Path:
    """Mescla os itens no arquivo do dia, deduplica (por link e por título) e
    ordena por relevância — a MESMA notícia aparece só uma vez no dia."""
    config.DATA_DIR.mkdir(parents=True, exist_ok=True)
    by_id = {it.id: it for it in load_day(day)}
    for item in items:
        by_id[item.id] = item  # novos sobrescrevem

    # Dedup por título: mantém o de maior relevância (corta repetição entre categorias).
    ordered = sorted(by_id.values(), key=lambda it: (it.score, it.published), reverse=True)
    seen_titles: set[str] = set()
    merged: list[Item] = []
    for it in ordered:
        t = _norm_title(it.title)
        if t and t in seen_titles:
            continue
        seen_titles.add(t)
        merged.append(it)
    merged = merged[:max_per_day]

    path = _day_path(day)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(
            {"date": day, "generated_at": datetime.now(timezone.utc).isoformat(),
             "count": len(merged), "items": [it.to_dict() for it in merged]},
            fh, ensure_ascii=False, indent=2,
        )
    return path


def save_items_by_published(items: list[Item], max_per_day: int = 60) -> list[str]:
    """Distribui os itens pelos arquivos da sua data de publicação."""
    by_day: dict[str, list[Item]] = defaultdict(list)
    for item in items:
        if item.has_full_date:
            by_day[item.published].append(item)
    for day, day_items in by_day.items():
        path = save_day(day, day_items, max_per_day)
        log.info("Salvo %s (%d novos)", path, len(day_items))
    return sorted(by_day.keys(), reverse=True)


def load_day(day: str) -> list[Item]:
    path = _day_path(day)
    if not path.exists():
        return []
    with open(path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    return [Item.from_dict(d) for d in data.get("items", [])]


def all_days() -> list[str]:
    if not config.DATA_DIR.exists():
        return []
    days = [p.stem for p in config.DATA_DIR.glob("*.json") if DATE_RE.fullmatch(p.stem)]
    return sorted(days, reverse=True)


def _bulletin_path(day: str) -> Path:
    return config.BULLETIN_DIR / f"{day}.html"


def save_bulletin(day: str, html: str) -> None:
    """Salva o 'Boletim do dia' (HTML) para aquela data."""
    if not html:
        return
    config.BULLETIN_DIR.mkdir(parents=True, exist_ok=True)
    with open(_bulletin_path(day), "w", encoding="utf-8") as fh:
        fh.write(html)


def load_bulletin(day: str) -> str:
    path = _bulletin_path(day)
    if not path.exists():
        return ""
    with open(path, "r", encoding="utf-8") as fh:
        return fh.read()


def load_month(year_month: str) -> list[Item]:
    items: list[Item] = []
    for day in all_days():
        if day.startswith(year_month):
            items.extend(load_day(day))
    return items

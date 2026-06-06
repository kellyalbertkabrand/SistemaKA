"""Persistência do arquivo histórico (data/items/AAAA-MM-DD.json)."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from . import config
from .models import Item

log = logging.getLogger("sistemaka.store")


def _day_path(day: str) -> Path:
    return config.DATA_DIR / f"{day}.json"


def today_str() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def save_day(day: str, items: list[Item]) -> Path:
    """Mescla os itens novos com o que já houver no dia (dedupe por id)."""
    config.DATA_DIR.mkdir(parents=True, exist_ok=True)
    existing = load_day(day)
    by_id = {item.id: item for item in existing}
    for item in items:
        by_id[item.id] = item  # novos sobrescrevem (resumos atualizados)
    merged = list(by_id.values())
    merged.sort(key=lambda it: (it.category, it.title.lower()))

    path = _day_path(day)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(
            {"date": day, "generated_at": datetime.now(timezone.utc).isoformat(),
             "count": len(merged), "items": [it.to_dict() for it in merged]},
            fh, ensure_ascii=False, indent=2,
        )
    log.info("Salvo %s (%d itens)", path, len(merged))
    return path


def load_day(day: str) -> list[Item]:
    path = _day_path(day)
    if not path.exists():
        return []
    with open(path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    return [Item.from_dict(d) for d in data.get("items", [])]


def all_days() -> list[str]:
    """Lista de datas (mais recente primeiro) presentes no histórico."""
    if not config.DATA_DIR.exists():
        return []
    days = [p.stem for p in config.DATA_DIR.glob("*.json")]
    return sorted(days, reverse=True)


def load_month(year_month: str) -> list[Item]:
    """Carrega todos os itens de um mês 'AAAA-MM'."""
    items: list[Item] = []
    for day in all_days():
        if day.startswith(year_month):
            items.extend(load_day(day))
    return items

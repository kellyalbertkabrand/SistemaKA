"""Orquestração: coletar → validar/ranquear → traduzir/resumir → salvar → site."""

from __future__ import annotations

import logging

from . import config, store
from .fetch import fetch_all
from .relevance import rank_and_filter
from .site import build_site
from .summarize import summarize_items

log = logging.getLogger("sistemaka.pipeline")


def run_daily(window: int | None = None) -> list[str]:
    """Coleta (janela em dias), arquiva por data de publicação e gera o site."""
    cfg = config.load_config()
    max_per_day = int(cfg.get("max_items_per_day", 40))

    log.info("=== SistemaKA · coleta (janela=%s dias) ===", window or cfg.get("window_days", 2))
    raw = fetch_all(cfg, window=window)
    selected = rank_and_filter(raw, cfg)
    summarize_items(selected)
    days = store.save_items_by_published(selected, max_per_day)

    build_site()
    log.info("=== Concluído: %d itens em %d dia(s): %s ===",
             len(selected), len(days), ", ".join(days) or "—")
    return days


def rebuild_site() -> None:
    build_site()

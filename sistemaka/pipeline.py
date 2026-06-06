"""Orquestração: coletar → ranquear → resumir → salvar → gerar site."""

from __future__ import annotations

import logging

from . import config, store
from .fetch import fetch_all
from .relevance import rank_and_filter
from .site import build_site
from .summarize import summarize_items

log = logging.getLogger("sistemaka.pipeline")


def run_daily() -> str:
    """Executa a coleta do dia e reconstrói o site. Retorna a data processada."""
    cfg = config.load_config()
    day = store.today_str()

    log.info("=== SistemaKA · coleta de %s ===", day)
    raw = fetch_all(cfg)
    selected = rank_and_filter(raw, cfg)
    summarize_items(selected)
    store.save_day(day, selected)

    build_site()
    log.info("=== Concluído: %d itens em %s ===", len(selected), day)
    return day


def rebuild_site() -> None:
    """Reconstrói o site a partir do histórico já salvo (sem coletar)."""
    build_site()

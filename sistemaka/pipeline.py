"""Orquestração: coletar → validar/ranquear → traduzir/resumir → salvar → site."""

from __future__ import annotations

import logging

from . import config, store
from .fetch import fetch_all
from .relevance import rank_and_filter
from .site import build_site
from .summarize import generate_bulletin, summarize_items

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

    # Boletim do dia: resumo editorial dos temas (branding, posicionamento,
    # semiótica, comunicação) para cada dia que recebeu matérias.
    for day in days:
        html = generate_bulletin(day, store.load_day(day))
        if html:
            store.save_bulletin(day, html)
            log.info("Boletim do dia gerado para %s", day)

    build_site()
    log.info("=== Concluído: %d itens em %d dia(s): %s ===",
             len(selected), len(days), ", ".join(days) or "—")
    return days


def refresh_history(resummarize: bool = True) -> list[str]:
    """Re-processa TODO o histórico já coletado com o perfil/lógica ATUAIS.

    O que faz em cada dia salvo:
    - recalcula o score/ordem com o peso novo da especialidade (posicionamento,
      essência, PME) — itens prioritários sobem;
    - regera persona, "Para o PME" e título traduzido com o perfil novo dos 4
      produtos (quando há ANTHROPIC_API_KEY; senão, tradução + rodapé por tema).

    Não recoleta (não é possível buscar notícias de dias passados). As novas
    categorias (Essência, PME) aparecem só nas coletas daqui pra frente.
    """
    from .relevance import score as _score, _CATEGORY_BOOST, _region_boost

    cfg = config.load_config()
    max_per_day = int(cfg.get("max_items_per_day", 40))
    business_terms = (cfg.get("business", {}) or {}).get("termos_prioritarios", []) or []

    days = store.all_days()
    log.info("=== SistemaKA · refresh do histórico: %d dia(s) ===", len(days))
    for day in days:
        items = store.load_day(day)
        if not items:
            continue
        for it in items:
            biz = _score(it, business_terms)
            it.score = (1 + 2 * max(biz, 0)
                        + _CATEGORY_BOOST.get(it.category, 0)
                        + _region_boost(it))
        if resummarize:
            summarize_items(items)  # regenera persona/PME/título com o perfil novo
        store.save_day(day, items, max_per_day)
        log.info("Atualizado %s (%d itens)", day, len(items))

    build_site()
    log.info("=== Refresh concluído: %d dia(s) atualizados ===", len(days))
    return days


def rebuild_site() -> None:
    build_site()

"""Geração do site estático (painel web) a partir do histórico em data/."""

from __future__ import annotations

import logging
import shutil
from collections import OrderedDict, defaultdict
from datetime import datetime, timezone
from jinja2 import Environment, FileSystemLoader, select_autoescape

from . import config, store
from .models import CATEGORY_LABELS, Item
from .summarize import summarize_month

log = logging.getLogger("sistemaka.site")

# Ordem fixa em que as categorias aparecem nas páginas.
CATEGORY_ORDER = [
    "branding_ia", "branding", "campanha",
    "posicionamento", "semiotica", "neuromarketing", "academico",
]

MESES_PT = [
    "", "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
]


def _br_date(value: str) -> str:
    try:
        d = datetime.fromisoformat(value).date()
        return f"{d.day} de {MESES_PT[d.month]} de {d.year}"
    except Exception:
        return value


def _br_month(value: str) -> str:
    try:
        year, month = value.split("-")
        return f"{MESES_PT[int(month)].capitalize()} de {year}"
    except Exception:
        return value


def _env() -> Environment:
    env = Environment(
        loader=FileSystemLoader(str(config.TEMPLATES_DIR)),
        autoescape=select_autoescape(["html"]),
    )
    env.filters["br_date"] = _br_date
    env.filters["br_month"] = _br_month
    return env


def _group_by_category(items: list[Item]) -> list[tuple[str, list[Item]]]:
    buckets: dict[str, list[Item]] = defaultdict(list)
    for item in items:
        cat = item.category if item.category in CATEGORY_LABELS else "branding"
        # Itens acadêmicos ficam visíveis na sua categoria temática, mas se a
        # categoria não estiver no order, caem em "academico".
        buckets[cat].append(item)
    ordered: list[tuple[str, list[Item]]] = []
    for cat in CATEGORY_ORDER:
        if buckets.get(cat):
            items_sorted = sorted(buckets[cat], key=lambda it: it.published, reverse=True)
            ordered.append((cat, items_sorted))
    return ordered


def build_site() -> None:
    env = _env()
    config.SITE_DIR.mkdir(parents=True, exist_ok=True)
    (config.SITE_DIR / "dia").mkdir(exist_ok=True)
    (config.SITE_DIR / "mes").mkdir(exist_ok=True)

    days = store.all_days()
    generated_at = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC")

    # Contagem por dia e por mês.
    day_counts: list[tuple[str, int]] = []
    month_items: "OrderedDict[str, list[Item]]" = OrderedDict()
    for day in days:
        items = store.load_day(day)
        day_counts.append((day, len(items)))
        month_items.setdefault(day[:7], []).extend(items)

    months = list(month_items.keys())
    month_counts = [(m, len(items)) for m, items in month_items.items()]
    recent_days = days[:10]

    common = {
        "site_title": config.site_base_title(),
        "generated_at": generated_at,
        "recent_days": recent_days,
        "months": months[:12],
        "update_url": config.update_url(),
    }

    # ---- Página inicial = dia mais recente ----
    latest = days[0] if days else store.today_str()
    latest_items = store.load_day(latest)
    has_ai = any(it.angle_pt and "ative a IA" not in it.angle_pt for it in latest_items)
    _render(env, "index.html", config.SITE_DIR / "index.html", rel="", **common,
            day=latest, total=len(latest_items),
            groups=_group_by_category(latest_items), has_ai=has_ai)

    # ---- Arquivo (sobrescreve 'months' com as contagens) ----
    archive_ctx = {**common, "months": month_counts}
    _render(env, "archive.html", config.SITE_DIR / "arquivo.html", rel="",
            days=day_counts, **archive_ctx)

    # ---- Páginas por dia ----
    for day in days:
        items = store.load_day(day)
        _render(env, "day.html", config.SITE_DIR / "dia" / f"{day}.html", rel="../",
                **common, day=day, total=len(items),
                groups=_group_by_category(items))

    # ---- Páginas por mês ----
    for month, items in month_items.items():
        cat_counts = _category_counts(items)
        summary = summarize_month(month, items)
        days_in_month = sum(1 for d in days if d.startswith(month))
        _render(env, "month.html", config.SITE_DIR / "mes" / f"{month}.html", rel="../",
                **common, month=month, total=len(items), days_count=days_in_month,
                groups=_group_by_category(items), category_counts=cat_counts,
                monthly_summary=summary)

    # ---- Estáticos ----
    shutil.copy(config.TEMPLATES_DIR / "styles.css", config.SITE_DIR / "styles.css")
    log.info("Site gerado em %s (%d dias, %d meses)",
             config.SITE_DIR, len(days), len(months))


def _category_counts(items: list[Item]) -> list[tuple[str, int]]:
    counts: dict[str, int] = defaultdict(int)
    for item in items:
        counts[item.category_label] += 1
    return sorted(counts.items(), key=lambda kv: kv[1], reverse=True)


def _render(env: Environment, template: str, out_path, **ctx) -> None:
    html = env.get_template(template).render(**ctx)
    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write(html)

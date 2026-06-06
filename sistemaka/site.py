"""Geração do site estático (painel web) a partir do histórico em data/."""

from __future__ import annotations

import logging
import shutil
from collections import OrderedDict, defaultdict
from datetime import date, datetime, timedelta, timezone

from jinja2 import Environment, FileSystemLoader, select_autoescape

from . import config, store
from .models import CATEGORY_LABELS, Item
from .summarize import summarize_month

log = logging.getLogger("sistemaka.site")

CATEGORY_ORDER = [
    "branding_ia", "branding", "campanha",
    "posicionamento", "semiotica", "neuromarketing", "academico",
]
MESES_PT = [
    "", "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
]
# Quantos dias para trás gerar páginas (mesmo vazias) a partir de hoje.
RANGE_DAYS = 90


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
        buckets[cat].append(item)
    ordered: list[tuple[str, list[Item]]] = []
    for cat in CATEGORY_ORDER:
        if buckets.get(cat):
            ordered.append((cat, sorted(buckets[cat], key=lambda it: it.score, reverse=True)))
    return ordered


def _date_range(min_day: str, today: date) -> list[str]:
    """Lista de datas (recente→antiga) de hoje até RANGE_DAYS atrás / min_day."""
    try:
        start = datetime.fromisoformat(min_day).date()
    except Exception:
        start = today
    start = max(start, today - timedelta(days=RANGE_DAYS))
    out, d = [], today
    while d >= start:
        out.append(d.isoformat())
        d -= timedelta(days=1)
    return out


def build_site() -> None:
    env = _env()
    config.SITE_DIR.mkdir(parents=True, exist_ok=True)
    (config.SITE_DIR / "dia").mkdir(exist_ok=True)
    (config.SITE_DIR / "mes").mkdir(exist_ok=True)

    today = datetime.now(timezone.utc).date()
    today_iso = today.isoformat()
    generated_at = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC")

    data_days = store.all_days()  # só dias COM matérias (recente→antiga)
    min_day = data_days[-1] if data_days else today_iso
    all_dates = sorted(set(_date_range(min_day, today)) | set(data_days), reverse=True)

    # Contagem por mês.
    month_items: "OrderedDict[str, list[Item]]" = OrderedDict()
    day_counts: dict[str, int] = {}
    for day in data_days:
        items = store.load_day(day)
        day_counts[day] = len(items)
        month_items.setdefault(day[:7], []).extend(items)
    months = list(month_items.keys())

    common = {
        "site_title": config.site_base_title(),
        "generated_at": generated_at,
        "recent_days": data_days[:10],
        "months": months[:12],
        "update_url": config.update_url(),
        "date_min": min_day,
        "date_max": today_iso,
    }

    # ---- Página inicial: hoje (ou o dia mais recente com matérias) ----
    if store.load_day(today_iso):
        home_day = today_iso
    elif data_days:
        home_day = data_days[0]
    else:
        home_day = today_iso
    home_items = store.load_day(home_day)
    has_ai = any(it.angle_pt and "Conteúdo em inglês" not in it.angle_pt for it in home_items)
    _render(env, "index.html", config.SITE_DIR / "index.html", rel="", **common,
            day=home_day, is_today=(home_day == today_iso), total=len(home_items),
            groups=_group_by_category(home_items), has_ai=has_ai)

    # ---- Arquivo ----
    archive_ctx = {**common, "months": [(m, len(i)) for m, i in month_items.items()]}
    _render(env, "archive.html", config.SITE_DIR / "arquivo.html", rel="",
            days=[(d, day_counts[d]) for d in data_days], **archive_ctx)

    # ---- Página por dia (inclui dias sem matérias, com aviso) ----
    for day in all_dates:
        items = store.load_day(day)
        _render(env, "day.html", config.SITE_DIR / "dia" / f"{day}.html", rel="../",
                **common, day=day, total=len(items), groups=_group_by_category(items))

    # ---- Página por mês ----
    for month, items in month_items.items():
        _render(env, "month.html", config.SITE_DIR / "mes" / f"{month}.html", rel="../",
                **common, month=month, total=len(items),
                days_count=sum(1 for d in data_days if d.startswith(month)),
                groups=_group_by_category(items),
                category_counts=_category_counts(items),
                monthly_summary=summarize_month(month, items))

    # ---- Página 404 (datas/links inexistentes) ----
    _render(env, "notfound.html", config.SITE_DIR / "404.html", rel="", **common)

    shutil.copy(config.TEMPLATES_DIR / "styles.css", config.SITE_DIR / "styles.css")
    log.info("Site gerado (%d dias com matérias, %d páginas de dia)",
             len(data_days), len(all_dates))


def _category_counts(items: list[Item]) -> list[tuple[str, int]]:
    counts: dict[str, int] = defaultdict(int)
    for item in items:
        counts[item.category_label] += 1
    return sorted(counts.items(), key=lambda kv: kv[1], reverse=True)


def _render(env: Environment, template: str, out_path, **ctx) -> None:
    html = env.get_template(template).render(**ctx)
    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write(html)

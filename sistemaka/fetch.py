"""Coleta de itens a partir de Google News, feeds RSS, Crossref e arXiv.

Cada fonte é isolada: se uma falhar (timeout, feed fora do ar, etc.), o erro é
registrado e a coleta continua nas demais.
"""

from __future__ import annotations

import logging
import re
import time
from datetime import datetime, timezone
from html import unescape
from urllib.parse import quote_plus, urlparse

import requests

from .models import Item

log = logging.getLogger("sistemaka.fetch")

USER_AGENT = (
    "Mozilla/5.0 (compatible; SistemaKA/1.0; +https://github.com/) "
    "branding-news-aggregator"
)
TIMEOUT = 25


# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------

def _strip_html(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", " ", text)
    text = unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def _domain(url: str) -> str:
    try:
        host = urlparse(url).netloc.lower()
        return host[4:] if host.startswith("www.") else host
    except Exception:
        return ""


def _entry_date(entry) -> str:
    for attr in ("published_parsed", "updated_parsed"):
        value = getattr(entry, attr, None)
        if value:
            try:
                return datetime(*value[:6], tzinfo=timezone.utc).date().isoformat()
            except Exception:
                pass
    return datetime.now(timezone.utc).date().isoformat()


def resolve_source_url(google_link: str, session: requests.Session) -> str:
    """Resolve o redirect do Google News para o link real do veículo.

    O usuário quer o link EXATO da fonte. O Google News entrega um link
    intermediário (news.google.com/rss/articles/...); seguimos o redirect
    para obter a URL final do artigo. Em caso de falha, devolve o link original.
    """
    if "news.google.com" not in google_link:
        return google_link
    try:
        resp = session.get(
            google_link, timeout=TIMEOUT, allow_redirects=True,
            headers={"User-Agent": USER_AGENT},
        )
        final = resp.url
        if final and "news.google.com" not in final:
            return final
        # Alguns redirects vêm via meta-refresh / data-attr no HTML.
        m = re.search(r'data-n-au="([^"]+)"', resp.text or "")
        if m:
            return unescape(m.group(1))
    except Exception as exc:  # noqa: BLE001
        log.debug("Falha ao resolver %s: %s", google_link, exc)
    return google_link


# ---------------------------------------------------------------------------
# Google News
# ---------------------------------------------------------------------------

def fetch_google_news(cfg: dict, session: requests.Session) -> list[Item]:
    items: list[Item] = []
    locales = cfg.get("google_news_locales", [])
    topics = cfg.get("google_news_topics", [])
    window = int(cfg.get("window_days", 2))

    for locale in locales:
        lang = locale.get("lang", "pt")
        query_key = "query_pt" if lang == "pt" else "query_en"
        for topic in topics:
            query = topic.get(query_key)
            if not query:
                continue
            # "when:Nd" restringe aos últimos N dias direto na busca do Google.
            full_query = f"{query} when:{window}d"
            url = (
                "https://news.google.com/rss/search?"
                f"q={quote_plus(full_query)}"
                f"&hl={locale['hl']}&gl={locale['gl']}&ceid={locale['ceid']}"
            )
            feed = _safe_parse(url, session)
            for entry in feed.entries[:15]:
                source_name = ""
                src = getattr(entry, "source", None)
                if src and getattr(src, "title", None):
                    source_name = src.title
                link = resolve_source_url(entry.get("link", ""), session)
                if not link:
                    continue
                items.append(Item(
                    title=_strip_html(entry.get("title", "")),
                    link=link,
                    source=source_name or _domain(link) or "Google News",
                    lang=lang,
                    region=locale.get("region", "world"),
                    category=topic.get("category", "branding"),
                    kind="noticia",
                    published=_entry_date(entry),
                    raw_summary=_strip_html(entry.get("summary", "")),
                ))
            time.sleep(0.4)  # gentileza com o servidor
    log.info("Google News: %d itens", len(items))
    return items


# ---------------------------------------------------------------------------
# Feeds RSS diretos
# ---------------------------------------------------------------------------

def fetch_rss_feeds(cfg: dict, session: requests.Session) -> list[Item]:
    items: list[Item] = []
    window = int(cfg.get("window_days", 2))
    today = datetime.now(timezone.utc).date()
    for feed_cfg in cfg.get("rss_feeds", []):
        feed = _safe_parse(feed_cfg["url"], session)
        for entry in feed.entries[:20]:
            published = _entry_date(entry)
            try:
                age = (today - datetime.fromisoformat(published).date()).days
            except Exception:
                age = 0
            if age > window:
                continue
            link = entry.get("link", "")
            if not link:
                continue
            items.append(Item(
                title=_strip_html(entry.get("title", "")),
                link=link,
                source=feed_cfg.get("name") or _domain(link),
                lang=feed_cfg.get("lang", "pt"),
                region=feed_cfg.get("region", "world"),
                category=feed_cfg.get("category", "branding"),
                kind="noticia",
                published=published,
                raw_summary=_strip_html(entry.get("summary", "")),
            ))
    log.info("Feeds RSS: %d itens", len(items))
    return items


# ---------------------------------------------------------------------------
# Crossref (artigos acadêmicos)
# ---------------------------------------------------------------------------

def fetch_crossref(cfg: dict, session: requests.Session) -> list[Item]:
    items: list[Item] = []
    academic = cfg.get("academic", {})
    window = int(academic.get("crossref_window_days", 30))
    from_date = (datetime.now(timezone.utc).date()).fromordinal(
        datetime.now(timezone.utc).date().toordinal() - window
    ).isoformat()
    for q in academic.get("crossref_queries", []):
        url = (
            "https://api.crossref.org/works?"
            f"query={quote_plus(q['query'])}"
            f"&filter=from-pub-date:{from_date}"
            "&sort=published&order=desc&rows=5"
            "&select=title,DOI,URL,author,abstract,issued,container-title"
        )
        try:
            resp = session.get(url, timeout=TIMEOUT,
                               headers={"User-Agent": USER_AGENT})
            data = resp.json()
        except Exception as exc:  # noqa: BLE001
            log.warning("Crossref falhou (%s): %s", q["query"], exc)
            continue
        for work in data.get("message", {}).get("items", []):
            title_list = work.get("title") or []
            if not title_list:
                continue
            authors = ", ".join(
                f"{a.get('given', '')} {a.get('family', '')}".strip()
                for a in (work.get("author") or [])[:4]
            )
            container = (work.get("container-title") or [""])[0]
            issued = work.get("issued", {}).get("date-parts", [[None]])[0]
            published = "-".join(str(p).zfill(2) for p in issued if p) if issued and issued[0] else ""
            items.append(Item(
                title=_strip_html(title_list[0]),
                link=work.get("URL") or (f"https://doi.org/{work['DOI']}" if work.get("DOI") else ""),
                source=container or "Crossref",
                lang="en",
                region="world",
                category=q.get("category", "academico"),
                kind="academico",
                published=published,
                raw_summary=_strip_html(work.get("abstract", "")),
                authors=authors,
            ))
    log.info("Crossref: %d itens", len(items))
    return [i for i in items if i.link]


# ---------------------------------------------------------------------------
# arXiv (preprints)
# ---------------------------------------------------------------------------

def fetch_arxiv(cfg: dict, session: requests.Session) -> list[Item]:
    items: list[Item] = []
    for q in cfg.get("academic", {}).get("arxiv_queries", []):
        url = (
            "http://export.arxiv.org/api/query?"
            f"search_query={quote_plus('all:' + q['query'])}"
            "&sortBy=submittedDate&sortOrder=descending&max_results=5"
        )
        feed = _safe_parse(url, session)
        for entry in feed.entries:
            authors = ", ".join(a.get("name", "") for a in getattr(entry, "authors", [])[:4])
            items.append(Item(
                title=_strip_html(entry.get("title", "")),
                link=entry.get("link", ""),
                source="arXiv",
                lang="en",
                region="world",
                category=q.get("category", "academico"),
                kind="academico",
                published=_entry_date(entry),
                raw_summary=_strip_html(entry.get("summary", "")),
                authors=authors,
            ))
    log.info("arXiv: %d itens", len(items))
    return [i for i in items if i.link]


# ---------------------------------------------------------------------------

def _safe_parse(url: str, session: requests.Session):
    """feedparser sobre um GET com timeout e user-agent controlados."""
    import feedparser  # import tardio: só é exigido na coleta real
    try:
        resp = session.get(url, timeout=TIMEOUT, headers={"User-Agent": USER_AGENT})
        return feedparser.parse(resp.content)
    except Exception as exc:  # noqa: BLE001
        log.warning("Feed falhou %s: %s", url, exc)
        return feedparser.parse("")


def fetch_all(cfg: dict) -> list[Item]:
    """Coleta de todas as fontes configuradas."""
    session = requests.Session()
    collected: list[Item] = []
    for fn in (fetch_google_news, fetch_rss_feeds, fetch_crossref, fetch_arxiv):
        try:
            collected.extend(fn(cfg, session))
        except Exception as exc:  # noqa: BLE001
            log.exception("Fonte %s falhou por completo: %s", fn.__name__, exc)
    log.info("Total coletado (bruto): %d itens", len(collected))
    return collected

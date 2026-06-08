"""Coleta de itens a partir de Google News, feeds RSS, Crossref e arXiv.

Princípios (pedidos pela Kelly):
- Fidelidade de data: cada item carrega a DATA REAL de publicação. Se não for
  possível determinar a data, o item é descartado (melhor não trazer do que
  trazer com data errada).
- Fonte real: só entram itens cujo link aponta para a matéria original. Links
  que não resolvem para a fonte (ex.: redirect do Google News que não abre) são
  descartados.

Cada fonte é isolada: se uma falhar, o erro é registrado e a coleta continua.
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
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)
TIMEOUT = 20
RESOLVE_TIMEOUT = 8          # resolução de link tem que ser rápida
MAX_ENTRIES_PER_QUERY = 12   # limita o trabalho por busca


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
    """Data de publicação (AAAA-MM-DD) ou '' se desconhecida.

    Importante: NÃO inventa data. Sem data confiável → string vazia, e o item
    é descartado depois.
    """
    for attr in ("published_parsed", "updated_parsed"):
        value = getattr(entry, attr, None)
        if value:
            try:
                return datetime(*value[:6], tzinfo=timezone.utc).date().isoformat()
            except Exception:
                pass
    return ""


def _is_real_source(url: str) -> bool:
    """True se a URL parece apontar para a matéria original (não um redirect)."""
    if not url or not url.startswith(("http://", "https://")):
        return False
    host = urlparse(url).netloc.lower()
    bad = ("news.google.com", "consent.google.com", "google.com/url")
    return not any(b in url for b in bad) and "google.com" not in host


def _decode_google_news(google_link: str, session: requests.Session) -> str:
    """Decodifica o link criptografado do Google Notícias para a URL real.

    Usa o método atual (batchexecute): obtém assinatura+timestamp da página do
    artigo e pede a URL de origem. Best-effort: '' se não conseguir.
    """
    from urllib.parse import urlparse, quote
    import json as _json
    try:
        parts = urlparse(google_link).path.split("/")
        if len(parts) < 2 or parts[-2] not in ("articles", "read"):
            return ""
        gid = parts[-1]
        r = session.get(f"https://news.google.com/rss/articles/{gid}",
                        timeout=RESOLVE_TIMEOUT, headers={"User-Agent": USER_AGENT})
        sig = re.search(r'data-n-a-sg="([^"]+)"', r.text)
        ts = re.search(r'data-n-a-ts="([^"]+)"', r.text)
        if not (sig and ts):
            return ""
        inner = _json.dumps([
            "garturlreq",
            [["X", "X", ["X", "X"], None, None, 1, 1, "US:en", None, 1,
              None, None, None, None, None, 0, 1],
             "X", "X", 1, [1, 1, 1], 1, 1, None, 0, 0, None, 0],
            gid, int(ts.group(1)), sig.group(1),
        ])
        freq = _json.dumps([[["Fbv4je", inner, None, "generic"]]])
        resp = session.post(
            "https://news.google.com/_/DotsSplashUi/data/batchexecute",
            data="f.req=" + quote(freq), timeout=RESOLVE_TIMEOUT,
            headers={"User-Agent": USER_AGENT,
                     "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"},
        )
        m = re.search(r'garturlres\\",\\"(.+?)\\"', resp.text)
        if not m:
            return ""
        real = m.group(1).encode("utf-8").decode("unicode_escape")
        return real if _is_real_source(real) else ""
    except Exception as exc:  # noqa: BLE001
        log.debug("decode gnews falhou: %s", exc)
        return ""


def resolve_source_url(google_link: str, session: requests.Session) -> str:
    """Resolve o link do Google Notícias para o link real do veículo.

    Devolve a URL final da matéria, ou '' se não conseguir resolver para uma
    fonte real (nesse caso o item será descartado).
    """
    if _is_real_source(google_link):
        return google_link
    if "news.google.com" not in google_link:
        return ""
    # 1) Decodificador atual do Google Notícias.
    real = _decode_google_news(google_link, session)
    if real:
        return real
    # 2) Plano B: seguir o redirect e tentar extrair do HTML.
    try:
        resp = session.get(
            google_link, timeout=RESOLVE_TIMEOUT, allow_redirects=True,
            headers={"User-Agent": USER_AGENT},
        )
        if _is_real_source(resp.url):
            return resp.url
        for pattern in (r'data-n-au="([^"]+)"',
                        r'url=(https?://[^"&]+)'):
            m = re.search(pattern, resp.text or "")
            if m:
                candidate = unescape(m.group(1))
                if _is_real_source(candidate):
                    return candidate
    except Exception as exc:  # noqa: BLE001
        log.debug("Falha ao resolver %s: %s", google_link, exc)
    return ""


# ---------------------------------------------------------------------------
# Google News
# ---------------------------------------------------------------------------

def _matches_keywords(text: str, norm_keywords: list[str]) -> bool:
    """Filtro barato de relevância (antes de gastar rede resolvendo o link)."""
    if not norm_keywords:
        return True
    hay = " " + re.sub(r"[^\w\s]", " ", text.lower()) + " "
    return any(kw in hay for kw in norm_keywords)


def _norm(s: str) -> str:
    return re.sub(r"[^\w\s]", " ", (s or "").lower())


def _weak_summary(summary: str, title: str) -> bool:
    """True quando o resumo é fraco (vazio, curto ou ~igual ao título)."""
    s = _norm(summary).split()
    t = set(_norm(title).split())
    if len(s) < 12:
        return True
    # se quase todas as palavras do resumo já estão no título → é só o título
    overlap = sum(1 for w in s if w in t)
    return overlap / max(len(s), 1) > 0.8


def _fetch_description(url: str, session: requests.Session) -> str:
    """Abre a matéria e extrai a descrição real (o que o artigo diz).

    Tenta og:description / meta description e, por fim, o 1º parágrafo do corpo.
    """
    try:
        r = session.get(url, timeout=RESOLVE_TIMEOUT, headers={"User-Agent": USER_AGENT})
        html = r.text or ""
    except Exception as exc:  # noqa: BLE001
        log.debug("descrição falhou %s: %s", url, exc)
        return ""
    patterns = [
        r'<meta[^>]+property=["\']og:description["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:description["\']',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']description["\']',
    ]
    for pat in patterns:
        m = re.search(pat, html, re.I)
        if m:
            d = _strip_html(unescape(m.group(1)))
            if len(d) > 50:
                return d
    # fallback: primeiro parágrafo razoável do corpo
    for m in re.finditer(r"<p[^>]*>(.*?)</p>", html, re.I | re.S):
        d = _strip_html(m.group(1))
        if len(d) > 80:
            return d
    return ""


def _enrich_summary(item: "Item", session: requests.Session) -> None:
    """Se o resumo for fraco, lê a descrição real da matéria na fonte."""
    if _weak_summary(item.raw_summary, item.title):
        desc = _fetch_description(item.link, session)
        if desc:
            item.raw_summary = desc


def fetch_google_news(cfg: dict, session: requests.Session, window: int) -> list[Item]:
    items: list[Item] = []
    locales = cfg.get("google_news_locales", [])
    topics = cfg.get("google_news_topics", [])
    norm_keywords = [re.sub(r"[^\w\s]", " ", k.lower()).strip()
                     for k in cfg.get("keywords", []) if k.strip()]

    for locale in locales:
        lang = locale.get("lang", "pt")
        query_key = "query_pt" if lang == "pt" else "query_en"
        for topic in topics:
            query = topic.get(query_key)
            if not query:
                continue
            full_query = f"{query} when:{window}d"
            url = (
                "https://news.google.com/rss/search?"
                f"q={quote_plus(full_query)}"
                f"&hl={locale['hl']}&gl={locale['gl']}&ceid={locale['ceid']}"
            )
            feed = _safe_parse(url, session)
            for entry in feed.entries[:MAX_ENTRIES_PER_QUERY]:
                published = _entry_date(entry)
                if not published:
                    continue  # sem data confiável → fora
                title = _strip_html(entry.get("title", ""))
                summary = _strip_html(entry.get("summary", ""))
                # Pré-filtro de relevância ANTES de resolver o link (economiza rede).
                if not _matches_keywords(f"{title} {summary}", norm_keywords):
                    continue
                link = resolve_source_url(entry.get("link", ""), session)
                if not _is_real_source(link):
                    continue  # sem fonte real → fora
                source_name = ""
                src = getattr(entry, "source", None)
                if src and getattr(src, "title", None):
                    source_name = src.title
                it = Item(
                    title=title,
                    link=link,
                    source=source_name or _domain(link) or "Google News",
                    lang=lang,
                    region=locale.get("region", "world"),
                    category=topic.get("category", "branding"),
                    kind="noticia",
                    published=published,
                    raw_summary=summary,
                )
                _enrich_summary(it, session)  # lê a descrição real se o resumo for fraco
                items.append(it)
            time.sleep(0.4)
    log.info("Google News: %d itens com fonte real", len(items))
    return items


# ---------------------------------------------------------------------------
# Feeds RSS diretos (já trazem o link real do artigo)
# ---------------------------------------------------------------------------

def fetch_rss_feeds(cfg: dict, session: requests.Session, window: int) -> list[Item]:
    items: list[Item] = []
    today = datetime.now(timezone.utc).date()
    for feed_cfg in cfg.get("rss_feeds", []):
        feed = _safe_parse(feed_cfg["url"], session)
        for entry in feed.entries[:25]:
            published = _entry_date(entry)
            if not published:
                continue
            try:
                age = (today - datetime.fromisoformat(published).date()).days
            except Exception:
                continue
            if age < 0 or age > window:
                continue
            link = entry.get("link", "")
            if not _is_real_source(link):
                continue
            it = Item(
                title=_strip_html(entry.get("title", "")),
                link=link,
                source=feed_cfg.get("name") or _domain(link),
                lang=feed_cfg.get("lang", "pt"),
                region=feed_cfg.get("region", "world"),
                category=feed_cfg.get("category", "branding"),
                kind="noticia",
                published=published,
                raw_summary=_strip_html(entry.get("summary", "")),
            )
            _enrich_summary(it, session)  # lê a descrição real se o resumo do feed for fraco
            items.append(it)
    log.info("Feeds RSS: %d itens", len(items))
    return items


# ---------------------------------------------------------------------------
# Crossref (artigos acadêmicos)
# ---------------------------------------------------------------------------

def fetch_crossref(cfg: dict, session: requests.Session) -> list[Item]:
    items: list[Item] = []
    academic = cfg.get("academic", {})
    window = int(academic.get("crossref_window_days", 30))
    from_date = datetime.now(timezone.utc).date().fromordinal(
        datetime.now(timezone.utc).date().toordinal() - window
    ).isoformat()
    for q in academic.get("crossref_queries", []):
        url = (
            "https://api.crossref.org/works?"
            f"query={quote_plus(q['query'])}"
            f"&filter=from-pub-date:{from_date}"
            "&sort=published&order=desc&rows=5"
            "&select=title,DOI,URL,author,abstract,issued,published,container-title"
        )
        try:
            resp = session.get(url, timeout=TIMEOUT, headers={"User-Agent": USER_AGENT})
            data = resp.json()
        except Exception as exc:  # noqa: BLE001
            log.warning("Crossref falhou (%s): %s", q["query"], exc)
            continue
        for work in data.get("message", {}).get("items", []):
            title_list = work.get("title") or []
            if not title_list:
                continue
            link = work.get("URL") or (f"https://doi.org/{work['DOI']}" if work.get("DOI") else "")
            if not _is_real_source(link):
                continue
            published = _crossref_date(work)
            if not published:
                continue
            authors = ", ".join(
                f"{a.get('given', '')} {a.get('family', '')}".strip()
                for a in (work.get("author") or [])[:4]
            )
            container = (work.get("container-title") or [""])[0]
            items.append(Item(
                title=_strip_html(title_list[0]),
                link=link,
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
    return items


def _crossref_date(work: dict) -> str:
    """Extrai uma data completa AAAA-MM-DD do registro Crossref, ou ''."""
    for key in ("published", "published-online", "published-print", "issued"):
        parts = (work.get(key) or {}).get("date-parts", [[]])
        if parts and len(parts[0]) == 3:
            y, m, d = parts[0]
            try:
                return datetime(int(y), int(m), int(d)).date().isoformat()
            except Exception:
                continue
    return ""


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
            published = _entry_date(entry)
            link = entry.get("link", "")
            if not published or not _is_real_source(link):
                continue
            authors = ", ".join(a.get("name", "") for a in getattr(entry, "authors", [])[:4])
            items.append(Item(
                title=_strip_html(entry.get("title", "")),
                link=link,
                source="arXiv",
                lang="en",
                region="world",
                category=q.get("category", "academico"),
                kind="academico",
                published=published,
                raw_summary=_strip_html(entry.get("summary", "")),
                authors=authors,
            ))
    log.info("arXiv: %d itens", len(items))
    return items


# ---------------------------------------------------------------------------

def _safe_parse(url: str, session: requests.Session):
    """feedparser sobre um GET com timeout e user-agent controlados.

    Registra status HTTP e nº de entradas para que os logs do run revelem
    feeds mortos/bloqueados (403, 404, vazios) e a gente possa podá-los.
    """
    import feedparser  # import tardio: só é exigido na coleta real
    try:
        resp = session.get(url, timeout=TIMEOUT, headers={"User-Agent": USER_AGENT})
        parsed = feedparser.parse(resp.content)
        n = len(getattr(parsed, "entries", []) or [])
        if resp.status_code != 200:
            log.warning("Feed status %s (%d entradas): %s", resp.status_code, n, url)
        elif n == 0:
            log.warning("Feed sem entradas (200, mas vazio/ilegível): %s", url)
        return parsed
    except Exception as exc:  # noqa: BLE001
        log.warning("Feed falhou %s: %s", url, exc)
        return feedparser.parse("")


def fetch_all(cfg: dict, window: int | None = None) -> list[Item]:
    """Coleta de todas as fontes. `window` em dias (sobrepõe o do config)."""
    window = int(window or cfg.get("window_days", 2))
    session = requests.Session()
    collected: list[Item] = []

    for name, fn in (
        ("google_news", lambda: fetch_google_news(cfg, session, window)),
        ("rss", lambda: fetch_rss_feeds(cfg, session, window)),
        ("crossref", lambda: fetch_crossref(cfg, session)),
        ("arxiv", lambda: fetch_arxiv(cfg, session)),
    ):
        try:
            collected.extend(fn())
        except Exception as exc:  # noqa: BLE001
            log.exception("Fonte %s falhou: %s", name, exc)

    log.info("Total coletado (bruto, com fonte e data): %d itens", len(collected))
    return collected

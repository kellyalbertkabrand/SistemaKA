"""Estruturas de dados centrais do SistemaKA."""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any

# Rótulos amigáveis (em português) para cada categoria temática.
CATEGORY_LABELS = {
    "branding_ia": "Branding & IA",
    "branding": "Branding",
    "campanha": "Campanhas & Ideias",
    "posicionamento": "Posicionamento & Reposicionamento",
    "semiotica": "Semiótica de Marca",
    "neuromarketing": "Neuromarketing",
    "academico": "Acadêmico",
}

# Rótulos para o tipo de fonte.
KIND_LABELS = {
    "noticia": "Notícia",
    "academico": "Artigo acadêmico",
}


def _slugify(text: str) -> str:
    text = re.sub(r"[^\w\s-]", "", text.lower())
    return re.sub(r"[\s_-]+", "-", text).strip("-")


@dataclass
class Item:
    """Um item coletado (notícia ou artigo acadêmico)."""

    title: str
    link: str                       # link EXATO da fonte original
    source: str                     # nome do veículo/publicação
    lang: str = "pt"                # "pt" ou "en"
    region: str = "world"           # "BR" ou "world"
    category: str = "branding"      # chave de CATEGORY_LABELS
    kind: str = "noticia"           # "noticia" ou "academico"
    published: str = ""             # data ISO (YYYY-MM-DD) da publicação
    raw_summary: str = ""           # trecho/descrição original da fonte
    summary_pt: str = ""            # essência resumida em português
    angle_pt: str = ""              # gancho de conteúdo para o trabalho da Kelly
    authors: str = ""               # autores (artigos acadêmicos)
    fetched_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    @property
    def id(self) -> str:
        """Identificador estável baseado no link (para deduplicar)."""
        canonical = re.sub(r"[#?].*$", "", self.link.strip().lower())
        return hashlib.sha1(canonical.encode("utf-8")).hexdigest()[:16]

    @property
    def category_label(self) -> str:
        return CATEGORY_LABELS.get(self.category, self.category.title())

    @property
    def kind_label(self) -> str:
        return KIND_LABELS.get(self.kind, self.kind.title())

    @property
    def lang_label(self) -> str:
        return {"pt": "PT", "en": "EN"}.get(self.lang, self.lang.upper())

    @property
    def region_label(self) -> str:
        return {"BR": "Brasil", "world": "Mundo"}.get(self.region, self.region)

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        d["id"] = self.id
        return d

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Item":
        known = {f for f in cls.__dataclass_fields__}  # type: ignore[attr-defined]
        clean = {k: v for k, v in data.items() if k in known}
        return cls(**clean)

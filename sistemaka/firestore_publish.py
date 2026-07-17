"""Publica as matérias coletadas na aba "Notícias" do app da Kelly (SaaS).

Contrato combinado com a sessão que construiu a aba (Firestore do projeto
`estudio-de-marcas-ka`, coleção `noticias`, 1 documento por matéria, upsert
por ID determinístico — reexecutar não duplica). O app lê essa coleção
diretamente; não há site externo envolvido.

Hoje as regras do Firestore estão em modo teste (aceitam a chave pública sem
outra credencial). Quando o modo seguro for ligado, isto vai precisar trocar
para o Firebase Admin SDK com uma conta de serviço — ver README.
"""

from __future__ import annotations

import hashlib
import logging

import requests

from . import config
from .models import Item

log = logging.getLogger("sistemaka.firestore_publish")

COLLECTION = "noticias"


def _base_url() -> str:
    return (
        f"https://firestore.googleapis.com/v1/projects/{config.firestore_project()}"
        f"/databases/(default)/documents/{COLLECTION}"
    )


def _doc_id(item: Item) -> str:
    basis = (item.link or item.title).strip()
    return hashlib.sha1(basis.encode("utf-8")).hexdigest()[:20]


def _fields(item: Item) -> dict:
    values = {
        "titulo": item.display_title,
        "criado_em": item.fetched_at,
        "data": item.published if item.has_full_date else "",
        "resumo": item.summary_pt,
        "fonte": item.source,
        "url": item.link,
        "categoria": item.category,
    }
    return {k: {"stringValue": v} for k, v in values.items() if v}


def publish_items(items: list[Item]) -> int:
    """Publica cada item no Firestore (upsert por PATCH). Devolve quantos deu certo."""
    if not config.firestore_enabled():
        log.info("Publicação no app desligada (SISTEMAKA_FIRESTORE_PUBLISH=0).")
        return 0
    if not items:
        return 0
    sent = 0
    for item in items:
        try:
            resp = requests.patch(
                f"{_base_url()}/{_doc_id(item)}",
                params={"key": config.firestore_api_key()},
                json={"fields": _fields(item)},
                timeout=20,
            )
            resp.raise_for_status()
            sent += 1
        except Exception as exc:  # noqa: BLE001
            log.warning("Falha ao publicar %r no app: %s", item.title, exc)
    log.info("Publicado(s) %d/%d item(ns) no app da Kelly (Firestore).", sent, len(items))
    return sent

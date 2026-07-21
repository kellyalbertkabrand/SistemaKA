"""Carregamento de configuração e caminhos do projeto."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT / "config" / "sources.yaml"
CASOS_PATH = ROOT / "config" / "casos.yaml"
DATA_DIR = ROOT / "data" / "items"
BULLETIN_DIR = ROOT / "data" / "bulletins"
SITE_DIR = ROOT / "public"
TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"


def load_config(path: Path | None = None) -> dict[str, Any]:
    """Lê o sources.yaml e devolve um dicionário."""
    path = path or CONFIG_PATH
    with open(path, "r", encoding="utf-8") as fh:
        return yaml.safe_load(fh) or {}


def load_casos() -> dict[str, list]:
    """Lê a biblioteca curada de 'Casos de Virada' (config/casos.yaml).

    Sem data — é uma vitrine fixa. Devolve {'nacionais': [...], 'internacionais': [...]}.
    """
    if not CASOS_PATH.exists():
        return {"nacionais": [], "internacionais": []}
    with open(CASOS_PATH, "r", encoding="utf-8") as fh:
        data = yaml.safe_load(fh) or {}
    casos = (data.get("casos") or {})
    return {
        "nacionais": casos.get("nacionais") or [],
        "internacionais": casos.get("internacionais") or [],
    }


# ---- Configuração da IA (opcional) ----------------------------------------

def anthropic_api_key() -> str | None:
    key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    return key or None


def anthropic_model() -> str:
    # Modelo rápido/econômico por padrão; pode ser trocado via env.
    return os.environ.get("SISTEMAKA_MODEL", "claude-haiku-4-5-20251001").strip()


# ---- Configuração da geração de imagem (opcional) --------------------------

def openai_api_key() -> str | None:
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    return key or None


def openai_image_model() -> str:
    return os.environ.get("SISTEMAKA_IMAGE_MODEL", "gpt-image-1").strip()


# ---- Publicação no app da Kelly (Firestore) --------------------------------
# Chave pública do Firebase Web do projeto (o banco está em modo teste —
# publicável sem segredo; ver README/briefing). Pode ser trocada via env, ex.:
# quando o Firestore passar para o modo seguro (conta de serviço).

_FIRESTORE_DEFAULT_KEY = "AIzaSyB0wvONtPSbE8dleIYlzmWxeylVxfkZGm0"
_FIRESTORE_DEFAULT_PROJECT = "estudio-de-marcas-ka"


def firestore_api_key() -> str:
    return os.environ.get("FIRESTORE_API_KEY", "").strip() or _FIRESTORE_DEFAULT_KEY


def firestore_project() -> str:
    return os.environ.get("FIRESTORE_PROJECT", "").strip() or _FIRESTORE_DEFAULT_PROJECT


def firestore_enabled() -> bool:
    # DESLIGADO por padrão (a pedido da Kelly, 2026-07-17): a aba Notícias saiu
    # do site. Para religar, defina SISTEMAKA_FIRESTORE_PUBLISH=1.
    return os.environ.get("SISTEMAKA_FIRESTORE_PUBLISH", "0").strip() == "1"


def site_base_title() -> str:
    return os.environ.get("SISTEMAKA_TITLE", "SistemaKA · Radar de Branding & IA")


def repo_slug() -> str:
    """owner/repo — usado para montar o botão 'Atualizar agora'."""
    return os.environ.get("SISTEMAKA_REPO", "kellyalbertkabrand/SistemaKA").strip()


def workflow_file() -> str:
    return os.environ.get("SISTEMAKA_WORKFLOW", "daily.yml").strip()


def update_url() -> str:
    """Link para a tela do GitHub Actions onde se clica em 'Run workflow'."""
    return f"https://github.com/{repo_slug()}/actions/workflows/{workflow_file()}"

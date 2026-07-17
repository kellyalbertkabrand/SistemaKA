"""Post pronto do dia: legenda + imagem, prontos para revisar e publicar.

Alterna a fonte da legenda por data (determinístico, sem estado a guardar):
- dias pares: baseado nas notícias do dia (mesmo material do Boletim);
- dias ímpares: baseado num "Caso de Virada" da biblioteca curada
  (config/casos.yaml), sempre 2 ou mais fontes reais por trás do caso.

Com ANTHROPIC_API_KEY: a legenda sai na voz da Kelly, ligada aos produtos dela.
Sem a chave: legenda simples, sem síntese.

Com OPENAI_API_KEY: gera também a imagem (gpt-image-1). Sem a chave: só a
legenda (nada é inventado no lugar da imagem).
"""

from __future__ import annotations

import base64
import json
import logging
import re
from datetime import date

import requests

from . import config
from .models import Item
from .summarize import _business_block

log = logging.getLogger("sistemaka.content")

IMAGE_SIZE = "1024x1024"

POST_SYSTEM_NEWS = (
    "Você é a Kelly Albert, estrategista de branding (método Marca com Essência). "
    "Vai escrever a LEGENDA de um post pronto para publicar (Instagram/LinkedIn) "
    "a partir das notícias de hoje sobre branding/IA/posicionamento. "
    "Responda SOMENTE um JSON: "
    '{"legenda":"...","prompt_imagem":"..."}.\n'
    "'legenda': texto em PORTUGUÊS do Brasil, pronto para postar — gancho forte "
    "na 1ª linha, 3 a 6 linhas curtas conectando a notícia a uma ideia prática do "
    "método da Kelly, fechando com uma pergunta ou call-to-action. No máximo 2 "
    "emojis, sem hashtags, sem inventar fatos que não estejam nas notícias.\n"
    "'prompt_imagem': descrição (pode ser em inglês) de uma imagem EDITORIAL e "
    "ABSTRATA — sem logotipos, marcas ou rostos reais, sem texto escrito na "
    "imagem — estilo minimalista, cores sóbrias, que ilustre a ideia central do post."
)

POST_SYSTEM_CASO = (
    "Você é a Kelly Albert, estrategista de branding (método Marca com Essência). "
    "Vai escrever a LEGENDA de um post 'Caso de Virada': uma marca que mudou de "
    "patamar através de branding/posicionamento/rebranding. Use só os dados "
    "informados (antes, depois, números, a virada) — não invente fatos novos. "
    "Responda SOMENTE um JSON: "
    '{"legenda":"...","prompt_imagem":"..."}.\n'
    "'legenda': em PORTUGUÊS do Brasil, formato Antes → Depois com gancho forte na "
    "1ª linha, os números como prova, fechando com a lição prática para um "
    "pequeno/médio negócio e uma pergunta ou call-to-action. No máximo 2 emojis, "
    "sem hashtags.\n"
    "'prompt_imagem': descrição (pode ser em inglês) de uma imagem EDITORIAL "
    "ANTES/DEPOIS, ABSTRATA e CONCEITUAL — sem logotipo da marca real, sem nomes "
    "escritos na imagem, sem rostos reais — estilo minimalista, cores sóbrias."
)


def _source_for_day(day: str) -> str:
    return "caso" if date.fromisoformat(day).toordinal() % 2 else "news"


def _pick_caso(day: str) -> dict | None:
    casos = config.load_casos()
    combined = list(casos.get("nacionais") or []) + list(casos.get("internacionais") or [])
    if not combined:
        return None
    idx = date.fromisoformat(day).toordinal() % len(combined)
    return combined[idx]


def build_daily_post(day: str, items: list[Item]) -> dict | None:
    """Monta o post do dia. None se não houver material suficiente."""
    caso = _pick_caso(day) if _source_for_day(day) == "caso" else None
    relevantes: list[Item] = []
    if caso is None:
        relevantes = sorted(
            (it for it in items if it.summary_pt), key=lambda it: it.score, reverse=True
        )[:5]
        if not relevantes:
            caso = _pick_caso(day)  # sem notícia boa hoje -> tenta um caso
    if caso is not None:
        return _build_from_caso(caso)
    if relevantes:
        return _build_from_news(relevantes)
    return None


def _build_from_news(relevantes: list[Item]) -> dict:
    legenda_prompt = None
    if config.anthropic_api_key():
        legenda_prompt = _write_post(POST_SYSTEM_NEWS, _news_payload(relevantes))
    legenda, prompt_imagem = legenda_prompt or _fallback_news_text(relevantes)
    return {
        "source": "news",
        "legenda": legenda,
        "prompt_imagem": prompt_imagem,
        "image_bytes": _generate_image(prompt_imagem),
        "refs": [{"titulo": it.display_title, "link": it.link} for it in relevantes],
    }


def _build_from_caso(caso: dict) -> dict:
    legenda_prompt = None
    if config.anthropic_api_key():
        legenda_prompt = _write_post(POST_SYSTEM_CASO, _caso_payload(caso))
    legenda, prompt_imagem = legenda_prompt or _fallback_caso_text(caso)
    return {
        "source": "caso",
        "legenda": legenda,
        "prompt_imagem": prompt_imagem,
        "image_bytes": _generate_image(prompt_imagem),
        "caso": caso,
    }


# ---- Legenda com IA (Claude) ------------------------------------------------

def _write_post(system: str, user_text: str) -> tuple[str, str] | None:
    try:
        import anthropic
    except ImportError:
        log.warning("Pacote 'anthropic' ausente — legenda cai no modo simples.")
        return None
    try:
        client = anthropic.Anthropic(api_key=config.anthropic_api_key())
        message = client.messages.create(
            model=config.anthropic_model(), max_tokens=700,
            system=system + " " + _business_block(),
            messages=[{"role": "user", "content": user_text}],
        )
        text = "".join(b.text for b in message.content if getattr(b, "type", "") == "text")
        data = _extract_json_obj(text)
        if not data or not (data.get("legenda") or "").strip():
            return None
        return (data["legenda"] or "").strip(), (data.get("prompt_imagem") or "").strip()
    except Exception as exc:  # noqa: BLE001
        log.warning("Geração da legenda falhou: %s", exc)
        return None


def _extract_json_obj(text: str):
    m = re.search(r"\{.*\}", text.strip(), re.DOTALL)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError:
        return None


def _news_payload(relevantes: list[Item]) -> str:
    linhas = "\n".join(
        f"- [{it.category_label}] {it.display_title} — {it.summary_pt}"
        for it in relevantes
    )
    return f"Notícias de hoje:\n{linhas}"


def _caso_payload(caso: dict) -> str:
    fontes = ", ".join(f.get("nome", "") for f in (caso.get("fontes") or []))
    return (
        f"Marca: {caso.get('marca', '')}\nSetor: {caso.get('setor', '')}\n"
        f"Antes: {caso.get('antes', '')}\nDepois: {caso.get('depois', '')}\n"
        f"Números: {caso.get('numeros', '')}\nA virada: {caso.get('virada', '')}\n"
        f"Fontes: {fontes}"
    )


# ---- Legenda sem IA (fallback simples) --------------------------------------

def _fallback_news_text(relevantes: list[Item]) -> tuple[str, str]:
    top = relevantes[0]
    legenda = (
        f"📰 {top.display_title}\n\n{top.summary_pt}\n\n"
        f"{top.pme_pt}\n\nO que você achou disso pra sua marca?"
    ).strip()
    prompt_imagem = (
        f"Minimalist editorial illustration about {top.category_label.lower()}, "
        "abstract, muted professional colors, no text, no real logos or faces."
    )
    return legenda, prompt_imagem


def _fallback_caso_text(caso: dict) -> tuple[str, str]:
    legenda = (
        f"🔁 CASO DE VIRADA: {caso.get('marca', '')}\n\n"
        f"Antes: {caso.get('antes', '')}\n\nDepois: {caso.get('depois', '')}\n\n"
        f"{caso.get('numeros', '')}\n\n{caso.get('virada', '')}\n\n"
        "E a sua marca, em qual desses pontos ela está hoje?"
    ).strip()
    prompt_imagem = (
        "Minimalist abstract before/after editorial illustration representing a "
        f"brand transformation in the {caso.get('setor', '')} sector, muted "
        "professional colors, no real logos, no names written in the image."
    )
    return legenda, prompt_imagem


# ---- Imagem (OpenAI, opcional) ----------------------------------------------

def _generate_image(prompt: str) -> bytes | None:
    key = config.openai_api_key()
    if not key or not prompt:
        return None
    try:
        resp = requests.post(
            "https://api.openai.com/v1/images/generations",
            headers={"Authorization": f"Bearer {key}"},
            json={"model": config.openai_image_model(), "prompt": prompt[:4000], "size": IMAGE_SIZE},
            timeout=90,
        )
        resp.raise_for_status()
        b64 = resp.json()["data"][0].get("b64_json")
        return base64.b64decode(b64) if b64 else None
    except Exception as exc:  # noqa: BLE001
        log.warning("Geração de imagem falhou: %s", exc)
        return None

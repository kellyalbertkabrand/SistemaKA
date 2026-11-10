"""Grava os leads do Radar na aba "Prospecção" do Estúdio de Marca (SaaS).

Coleção `prospeccao` do Firestore do projeto `estudio-de-marcas-ka` — a mesma
que a aba lê (estudio-marca-ka/src/lib/prospeccao.ts, branch `estudiodemarca`).

- 1 documento por empresa, ID determinístico (`radar-<chave>`): rodar de novo
  não duplica.
- Na 1ª vez cria o documento com status "novo". Depois só ATUALIZA os campos do
  radar (sinal, motivo, mensagens…) — nunca mexe no status, nas anotações, no
  CNPJ/Receita nem no telefone que a Kelly preencheu no app.
- Só sobem leads confiáveis: os analisados pela IA (empresa identificada) e as
  vagas (nome da empresa vem estruturado da plataforma de vagas).

Hoje o Firestore está em modo teste (chave pública grava). Quando o modo
seguro for ligado, isto precisará de conta de serviço — igual às notícias.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone

import requests

from . import config

log = logging.getLogger("sistemaka.prospeccao_publish")

COLLECTION = "prospeccao"

# Campos que o radar pode sobrescrever (o resto é da Kelly, no app).
RADAR_FIELDS = [
    "empresa", "segmento", "origem", "sinal", "sinal_url", "sinal_data", "gatilho",
    "por_que_agora", "decisor", "pessoa_citada", "msg_linkedin", "email_assunto",
    "email_corpo", "encaixe_ia", "radar_score", "atualizado_em",
]


def enabled() -> bool:
    return os.environ.get("SISTEMAKA_PROSPECCAO_PUBLISH", "1").strip() != "0"


def _base() -> str:
    return (f"https://firestore.googleapis.com/v1/projects/{config.firestore_project()}"
            f"/databases/(default)/documents/{COLLECTION}")


def _value(v):
    if isinstance(v, bool):
        return {"booleanValue": v}
    if isinstance(v, int):
        return {"integerValue": str(v)}
    if isinstance(v, float):
        return {"doubleValue": v}
    return {"stringValue": str(v)}


def _fields(d: dict) -> dict:
    return {k: _value(v) for k, v in d.items() if v not in (None, "")}


def _split_local(local: str) -> tuple[str, str]:
    """'Lajeado/RS' | 'Lajeado - RS' | 'Lajeado, RS' -> ('Lajeado', 'RS')."""
    import re
    m = re.match(r"\s*(.+?)\s*[/,\-–]\s*([A-Za-z]{2})\s*$", local or "")
    if m:
        return m.group(1), m.group(2).upper()
    return (local or "").strip(), ""


def lead_to_doc(lead) -> dict:
    """Converte um Lead do radar (sistemaka.leads.Lead) no documento do app."""
    # o sinal mostrado é o do gatilho mais forte; a origem é "noticia" se
    # houver qualquer notícia (vale mais que vaga)
    sp = next((x for x in lead.sinais if x.get("gatilho") == lead.gatilho), None) \
        or lead.sinal_principal or {}
    cidade, uf = _split_local(lead.local)
    origem = "noticia" if any(x.get("gatilho") != "vaga" for x in lead.sinais) else "vaga"
    return {
        "empresa": lead.empresa,
        "segmento": lead.setor,
        "cidade": cidade,
        "uf": uf,
        "origem": origem,
        "sinal": sp.get("titulo", ""),
        "sinal_url": sp.get("link", ""),
        "sinal_data": sp.get("data", ""),
        "gatilho": lead.gatilho_nome,
        "por_que_agora": lead.por_que_agora,
        "decisor": lead.decisor,
        "pessoa_citada": lead.pessoa_citada,
        "msg_linkedin": lead.msg_linkedin,
        "email_assunto": lead.email_assunto,
        "email_corpo": lead.email_corpo,
        "encaixe_ia": int(lead.encaixe) if lead.confirmado else None,
        "radar_score": int(lead.score),
        "atualizado_em": datetime.now(timezone.utc).isoformat(),
    }


ENCAIXE_MINIMO = int(os.environ.get("SISTEMAKA_PROSPECCAO_ENCAIXE_MIN", "6"))


def aprovado(lead) -> bool:
    """Só vai para o Funil do app quem tem cara de cliente da KA.

    Fica fora (continua só na base do radar): análise sem IA, nome genérico,
    porte "grande" e encaixe abaixo do mínimo (padrão 6/10). Vagas passam
    (a nota do app, com o CNPJ, decide depois).
    """
    from .leads import nome_generico
    is_vaga = any(x.get("gatilho") == "vaga" for x in lead.sinais)
    if nome_generico(lead.empresa):
        return False
    if is_vaga and not any(x.get("gatilho") != "vaga" for x in lead.sinais):
        return True
    if not lead.confirmado:
        return False
    if (lead.porte or "").lower() == "grande":
        return False
    return int(lead.encaixe or 0) >= ENCAIXE_MINIMO


def publish(leads: list) -> int:
    if not enabled():
        log.info("Gravação na Prospecção do app desligada (SISTEMAKA_PROSPECCAO_PUBLISH=0).")
        return 0
    key = config.firestore_api_key()
    sent = 0
    for lead in leads:
        if not aprovado(lead):
            continue
        doc = lead_to_doc(lead)
        doc_id = f"radar-{lead.id}"
        try:
            # 1) cria (só se ainda não existe) — com status e data de criação
            novo = {**doc, "status": "novo", "criado_em": doc["atualizado_em"]}
            r = requests.post(_base(), params={"key": key, "documentId": doc_id},
                              json={"fields": _fields(novo)}, timeout=20)
            if r.status_code == 409:
                # 2) já existe: atualiza só os campos do radar
                params = [("key", key)] + [("updateMask.fieldPaths", f)
                                           for f in RADAR_FIELDS if doc.get(f) not in (None, "")]
                r = requests.patch(f"{_base()}/{doc_id}", params=params,
                                   json={"fields": _fields({f: doc[f] for f in RADAR_FIELDS})},
                                   timeout=20)
            r.raise_for_status()
            sent += 1
        except Exception as exc:  # noqa: BLE001
            log.warning("Falha ao gravar %r na Prospecção: %s", lead.empresa, exc)
    retiradas = _retirar_reprovados(leads, key)
    log.info("Prospecção (app): %d empresa(s) retirada(s) do Funil (lixeira) por não "
             "passarem no filtro.", retiradas)
    log.info("Prospecção (app): %d empresa(s) gravada(s)/atualizada(s); %d ficaram fora "
             "pelo filtro de qualidade.", sent, sum(1 for ld in leads if not aprovado(ld)))
    return sent


def _retirar_reprovados(leads: list, key: str) -> int:
    """Manda para a LIXEIRA do app (soft delete, dá para restaurar) os docs que o
    próprio radar gravou antes e que hoje não passam no filtro de qualidade.

    Só mexe em doc que a Kelly ainda não tocou: status "novo" e sem anotação.
    """
    n = 0
    for lead in leads:
        if aprovado(lead):
            continue
        url = f"{_base()}/radar-{lead.id}"
        try:
            r = requests.get(url, params={"key": key}, timeout=20)
            if r.status_code == 404:
                continue
            r.raise_for_status()
            f = r.json().get("fields", {})
            status = (f.get("status") or {}).get("stringValue", "novo")
            if status != "novo" or f.get("nota") or f.get("excluido_em"):
                continue
            agora = datetime.now(timezone.utc).isoformat()
            r = requests.patch(url, params=[("key", key), ("updateMask.fieldPaths", "excluido_em")],
                               json={"fields": {"excluido_em": {"stringValue": agora}}}, timeout=20)
            r.raise_for_status()
            n += 1
        except Exception as exc:  # noqa: BLE001
            log.warning("Não consegui retirar %r do Funil: %s", lead.empresa, exc)
    return n

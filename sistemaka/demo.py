"""Dados de exemplo para validar o sistema sem acesso à internet.

`python -m sistemaka demo` popula o histórico com itens fictícios e gera o site,
permitindo conferir o layout antes de a coleta real rodar no GitHub Actions.
"""

from __future__ import annotations

from datetime import date, timedelta

from . import store
from .models import Item

_SAMPLES = [
    ("Como a IA generativa está redesenhando identidades de marca", "branding_ia", "pt", "BR",
     "Estudo brasileiro mostra que 62% das agências já usam IA generativa em etapas de criação de identidade visual.",
     "Útil para discutir até onde a IA entra no processo de branding sem diluir a essência da marca."),
    ("Rebranding da Jaguar divide opinião de especialistas", "posicionamento", "en", "world",
     "The luxury carmaker's minimalist new logo sparks debate over heritage versus reinvention.",
     "Caso forte para aula sobre reposicionamento e o risco de romper com o repertório simbólico do consumidor."),
    ("Semiótica das cores: por que marcas de fintech migram para tons quentes", "semiotica", "pt", "BR",
     "Análise semiótica aponta mudança de azul corporativo para laranja e vermelho na busca por proximidade.",
     "Gancho direto para conteúdo sobre semiótica aplicada a posicionamento de marca."),
    ("Neuromarketing: estudo mede resposta emocional a campanhas com IA", "neuromarketing", "en", "world",
     "Eye-tracking and EEG reveal higher engagement when AI personalization feels human, not robotic.",
     "Dado de neuromarketing para sustentar a tese de 'IA com rosto humano' em campanhas."),
    ("As campanhas mais premiadas do mês usam storytelling de marca", "campanha", "pt", "BR",
     "Levantamento reúne cinco campanhas que apostaram em narrativa de propósito e consistência de marca.",
     "Repertório de referências de campanha e construção de ideia para apresentações de cliente."),
    ("Brand positioning in the age of AI agents", "branding_ia", "en", "world",
     "Paper argues that positioning must account for how AI assistants will mediate brand discovery.",
     "Tendência de fundo: como a marca se posiciona quando quem 'escolhe' é um agente de IA."),
    ("Consumer neuroscience and brand semiotics: a literature review", "academico", "en", "world",
     "Systematic review connecting neuromarketing evidence with semiotic theories of meaning-making.",
     ""),
]


def seed_demo() -> None:
    today = date.today()
    for offset in (0, 1, 2):
        day = (today - timedelta(days=offset)).isoformat()
        items = []
        for i, (title, cat, lang, region, summ, angle) in enumerate(_SAMPLES):
            kind = "academico" if cat == "academico" else "noticia"
            items.append(Item(
                title=f"{title}",
                link=f"https://exemplo.com/{cat}/{day}/{i}",
                source="Fonte de Exemplo",
                lang=lang, region=region, category=cat, kind=kind,
                published=day, raw_summary=summ,
                summary_pt=summ, angle_pt=angle,
                authors="A. Autor, B. Pesquisadora" if kind == "academico" else "",
            ))
        store.save_day(day, items)
    print(f"Dados de exemplo criados para 3 dias a partir de {today.isoformat()}.")

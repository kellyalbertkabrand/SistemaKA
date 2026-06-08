"""Interface de linha de comando do SistemaKA.

Uso:
    python -m sistemaka run            # coleta o dia + gera o site (padrão)
    python -m sistemaka run --days 7   # coleta os últimos 7 dias (backfill)
    python -m sistemaka refresh        # re-processa TODO o histórico com o perfil atual
    python -m sistemaka build          # só reconstrói o site a partir do histórico
    python -m sistemaka demo           # dados de exemplo (sem internet) + site
"""

from __future__ import annotations

import argparse
import logging
import sys


def _setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)-7s %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )


def main(argv: list[str] | None = None) -> int:
    _setup_logging()
    parser = argparse.ArgumentParser(prog="sistemaka", description="Radar de Branding & IA")
    parser.add_argument("command", choices=["run", "refresh", "build", "demo"])
    parser.add_argument("--days", type=int, default=None,
                        help="janela de coleta em dias (sobrepõe o config)")
    args = parser.parse_args(argv)

    from . import pipeline

    if args.command == "run":
        pipeline.run_daily(window=args.days)
    elif args.command == "refresh":
        pipeline.refresh_history()
    elif args.command == "build":
        pipeline.rebuild_site()
    elif args.command == "demo":
        from .demo import seed_demo
        seed_demo()
        pipeline.rebuild_site()
    return 0


if __name__ == "__main__":
    sys.exit(main())

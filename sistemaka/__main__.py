"""Interface de linha de comando do SistemaKA.

Uso:
    python -m sistemaka run      # coleta o dia + gera o site (uso diário)
    python -m sistemaka build    # só reconstrói o site a partir do histórico
    python -m sistemaka demo     # cria dados de exemplo (sem internet) + site
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
    parser.add_argument("command", choices=["run", "build", "demo"], help="ação a executar")
    args = parser.parse_args(argv)

    from . import pipeline

    if args.command == "run":
        pipeline.run_daily()
    elif args.command == "build":
        pipeline.rebuild_site()
    elif args.command == "demo":
        from .demo import seed_demo
        seed_demo()
        pipeline.rebuild_site()
    return 0


if __name__ == "__main__":
    sys.exit(main())

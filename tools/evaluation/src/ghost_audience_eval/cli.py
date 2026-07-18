from __future__ import annotations

import json
from pathlib import Path
from typing import Annotated

import typer
from pydantic import TypeAdapter
from rich.console import Console
from rich.table import Table

from .gates import evaluate_gates
from .metrics import calculate_metrics
from .models import EvaluationRun, GoldenFixture

app = typer.Typer(
    no_args_is_help=True,
    pretty_exceptions_enable=False,
)
console = Console()


def _read_model[T](
    path: Path,
    model_type: type[T],
) -> T:
    payload = json.loads(path.read_text(encoding="utf-8"))
    return TypeAdapter(model_type).validate_python(payload)


@app.command()
def score(
    fixture_path: Annotated[
        Path,
        typer.Option(
            exists=True,
            dir_okay=False,
            readable=True,
        ),
    ],
    run_path: Annotated[
        Path,
        typer.Option(
            exists=True,
            dir_okay=False,
            readable=True,
        ),
    ],
) -> None:
    fixture = _read_model(
        fixture_path,
        GoldenFixture,
    )
    run = _read_model(
        run_path,
        EvaluationRun,
    )

    if fixture.fixture_id != run.fixture_id:
        raise typer.BadParameter("Fixture IDs do not match.")

    metrics = calculate_metrics(fixture, run)
    gates = evaluate_gates(metrics)

    table = Table(title=f"Evaluation: {fixture.fixture_id}")
    table.add_column("Metric")
    table.add_column("Value", justify="right")
    table.add_row(
        "Must-open recall",
        f"{metrics.must_open_recall:.3f}",
    )
    table.add_row(
        "Forbidden precision",
        f"{metrics.forbidden_precision:.3f}",
    )
    table.add_row(
        "Resolution timing",
        f"{metrics.resolution_timing_accuracy:.3f}",
    )
    table.add_row(
        "Future leaks",
        str(metrics.future_leak_count),
    )
    table.add_row(
        "Invalid evidence",
        str(metrics.invalid_evidence_count),
    )
    table.add_row(
        "Invalid transitions",
        str(metrics.invalid_transition_count),
    )
    console.print(table)

    if not gates.passed:
        for failure in gates.failures:
            console.print(f"[red]FAIL[/red] {failure}")
        raise typer.Exit(code=1)

    console.print("[green]PASS[/green]")


if __name__ == "__main__":
    app()

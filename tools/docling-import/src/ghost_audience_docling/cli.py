from __future__ import annotations

import json
import tempfile
from pathlib import Path
from typing import Annotated

import typer
from docling.document_converter import DocumentConverter
from pydantic import BaseModel, ConfigDict, Field

app = typer.Typer(
    no_args_is_help=True,
    pretty_exceptions_enable=False,
)

MAXIMUM_FILE_BYTES = 20 * 1024 * 1024


class ConvertedDocument(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: str = "1.0"
    source_name: str
    source_format: str
    normalized_markdown: str = Field(
        min_length=1
    )


def _validate_input(path: Path) -> None:
    if not path.is_file():
        raise typer.BadParameter(
            "Input must be a file."
        )

    if path.stat().st_size > MAXIMUM_FILE_BYTES:
        raise typer.BadParameter(
            "Input exceeds 20 MiB."
        )

    if path.suffix.lower() not in {
        ".pdf",
        ".docx",
    }:
        raise typer.BadParameter(
            "Only PDF and DOCX are supported."
        )


@app.command()
def convert(
    input_path: Annotated[
        Path,
        typer.Option(
            "--input",
            exists=True,
            dir_okay=False,
            readable=True,
        ),
    ],
    output_path: Annotated[
        Path,
        typer.Option(
            "--output",
            dir_okay=False,
        ),
    ],
) -> None:
    _validate_input(input_path)

    with tempfile.TemporaryDirectory(
        prefix="ghost-audience-docling-"
    ):
        converter = DocumentConverter()
        result = converter.convert(
            input_path
        )
        markdown = (
            result.document.export_to_markdown()
        ).strip()

    converted = ConvertedDocument(
        source_name=input_path.name,
        source_format=input_path.suffix.lower().lstrip(
            "."
        ),
        normalized_markdown=markdown,
    )

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )
    output_path.write_text(
        json.dumps(
            converted.model_dump(),
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


if __name__ == "__main__":
    app()
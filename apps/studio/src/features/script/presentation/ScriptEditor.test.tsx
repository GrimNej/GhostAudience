import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { IntentFormValue } from "../../intent/domain/intent-form";
import { ScriptEditor } from "./ScriptEditor";

const emptyContext: IntentFormValue = {
  requiredKnowledgeText: "",
  desiredQuestionsText: "",
  forbiddenAssumptionsText: "",
  intentionalMysteriesText: "",
  intendedEmotionalDirection: "",
  desiredUnresolvedQuestionsText: "",
};

function renderEditor(
  onAnalyze: (
    title: string,
    text: string,
    fileName: string | null,
    context: IntentFormValue,
  ) => Promise<void>,
  initialText = "",
  initialTitle = "",
  disabled = false,
): void {
  render(
    <ScriptEditor
      initialTitle={initialTitle}
      initialText={initialText}
      initialContext={emptyContext}
      disabled={disabled}
      analysisLabel="Analyze my content"
      analysisHint="Opens results when ready."
      onAnalyze={onAnalyze}
    />,
  );
}

describe("ScriptEditor", () => {
  it("prevents analysis when content is empty without requiring a title", () => {
    const onAnalyze = vi.fn();
    renderEditor(onAnalyze);
    const fileInput = screen.getByLabelText("Import content file");
    const inputClick = vi.spyOn(fileInput, "click");

    expect(screen.getByRole("button", { name: /analyze my content/i })).toBeDisabled();
    expect(screen.getByText(/paste your content or import/i)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Choose file" }));
    expect(inputClick).toHaveBeenCalledTimes(1);
    expect(onAnalyze).not.toHaveBeenCalled();
  });

  it("passes trimmed optional title and content", async () => {
    const user = userEvent.setup();
    const onAnalyze = vi.fn().mockResolvedValue(undefined);
    renderEditor(onAnalyze);

    await user.type(screen.getByLabelText(/title/i), "  Night Train  ");
    await user.type(
      screen.getByLabelText("Content"),
      "  INT. TRAIN - NIGHT\nMira waits.  ",
    );
    await user.click(screen.getByRole("button", { name: /analyze my content/i }));

    expect(onAnalyze).toHaveBeenCalledWith(
      "Night Train",
      "INT. TRAIN - NIGHT\nMira waits.",
      null,
      emptyContext,
    );
  });

  it("imports supported Markdown and derives the title", async () => {
    const user = userEvent.setup();
    const onAnalyze = vi.fn().mockResolvedValue(undefined);
    renderEditor(onAnalyze);
    const file = new File(["# Opening\nMira waits."], "night-train.md", {
      type: "text/markdown",
    });

    await user.upload(screen.getByLabelText("Import content file"), file);

    expect(screen.getByLabelText(/title/i)).toHaveValue("night train");
    expect(screen.getByLabelText("Content")).toHaveValue("# Opening\nMira waits.");
    expect(screen.getByText("night-train.md")).toBeVisible();
  });

  it("announces the word count", () => {
    renderEditor(async () => undefined, "One two three.");
    expect(screen.getByText("3 words")).toBeInTheDocument();
  });

  it("keeps an existing title when importing content", async () => {
    const user = userEvent.setup();
    renderEditor(async () => undefined, "", "My chosen title");
    const file = new File(["Imported story"], "different-name.txt", {
      type: "text/plain",
    });

    await user.upload(screen.getByLabelText("Import content file"), file);

    expect(screen.getByLabelText(/title/i)).toHaveValue("My chosen title");
    expect(screen.getByLabelText("Content")).toHaveValue("Imported story");
  });

  it("rejects unsupported and empty files with useful messages", async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderEditor(async () => undefined);
    const fileInput = screen.getByLabelText("Import content file");

    await user.upload(
      fileInput,
      new File(["binary"], "draft.pdf", { type: "application/pdf" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Choose a .txt, .md, .markdown, or .fountain file.",
    );

    await user.upload(
      fileInput,
      new File(["   "], "empty.txt", { type: "text/plain" }),
    );
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("That file is empty.");
    });
  });

  it("supports drag and drop and clears imported file state after editing", async () => {
    const user = userEvent.setup();
    renderEditor(async () => undefined);
    const importZone = screen.getByRole("group", { name: "Import a content file" });
    const file = new File(["A dropped story"], "dropped.fountain", {
      type: "text/plain",
    });
    const dataTransfer = { files: { item: () => file } };

    fireEvent.dragEnter(importZone);
    expect(importZone).toHaveClass("import-zone--dragging");
    fireEvent.dragOver(importZone);
    fireEvent.dragLeave(importZone, { relatedTarget: null });
    expect(importZone).not.toHaveClass("import-zone--dragging");
    fireEvent.dragEnter(importZone);
    fireEvent.drop(importZone, { dataTransfer });

    await waitFor(() => {
      expect(screen.getByText("dropped.fountain")).toBeVisible();
    });
    await user.type(screen.getByLabelText("Content"), " More");
    expect(screen.queryByText("dropped.fountain")).not.toBeInTheDocument();
  });

  it("allows an imported filename to be dismissed", async () => {
    const user = userEvent.setup();
    renderEditor(async () => undefined);
    await user.upload(
      screen.getByLabelText("Import content file"),
      new File(["Story"], "story.md", { type: "text/markdown" }),
    );

    await user.click(screen.getByRole("button", { name: "Remove imported filename" }));
    expect(screen.queryByText("story.md")).not.toBeInTheDocument();
  });

  it("submits the optional creator context when supplied", async () => {
    const user = userEvent.setup();
    const onAnalyze = vi.fn().mockResolvedValue(undefined);
    renderEditor(onAnalyze, "A complete scene.");

    await user.click(screen.getByText("Add creator context"));
    await user.type(screen.getByLabelText("What should the audience feel?"), "Uneasy");
    await user.type(screen.getByLabelText("Questions you want to create"), "Who lied?");
    await user.type(screen.getByLabelText("Mysteries to protect"), "The locked room");
    await user.click(screen.getByRole("button", { name: /analyze my content/i }));

    expect(onAnalyze).toHaveBeenCalledWith("", "A complete scene.", null, {
      ...emptyContext,
      intendedEmotionalDirection: "Uneasy",
      desiredQuestionsText: "Who lied?",
      intentionalMysteriesText: "The locked room",
    });
  });

  it("shows analysis failures and restores the submit action", async () => {
    const user = userEvent.setup();
    const onAnalyze = vi.fn().mockRejectedValue(new Error("Service temporarily busy"));
    renderEditor(onAnalyze, "A complete scene.");

    await user.click(screen.getByRole("button", { name: /analyze my content/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Service temporarily busy",
    );
    expect(screen.getByRole("button", { name: /analyze my content/i })).toBeEnabled();
  });

  it("uses a safe message for non-error failures", async () => {
    const user = userEvent.setup();
    const onAnalyze = vi.fn().mockRejectedValue("offline");
    renderEditor(onAnalyze, "A complete scene.");

    await user.click(screen.getByRole("button", { name: /analyze my content/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The analysis could not be started. Please try again.",
    );
  });

  it("enforces the word limit and external disabled state", () => {
    const overLimit = Array.from({ length: 20_001 }, () => "word").join(" ");
    renderEditor(async () => undefined, overLimit, "", true);

    expect(screen.getByText(/exceeds the 20,000 word limit/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /analyze my content/i })).toBeDisabled();
    expect(screen.getByLabelText("Content")).toBeDisabled();
  });
});

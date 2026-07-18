import { render, screen } from "@testing-library/react";
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
): void {
  render(
    <ScriptEditor
      initialTitle=""
      initialText={initialText}
      initialContext={emptyContext}
      disabled={false}
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

    expect(screen.getByRole("button", { name: /analyze my content/i })).toBeDisabled();
    expect(screen.getByText(/paste your content or import/i)).toBeVisible();
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
});

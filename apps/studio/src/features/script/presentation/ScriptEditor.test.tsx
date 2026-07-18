import {
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { ScriptEditor } from "./ScriptEditor";

describe("ScriptEditor", () => {
  it("prevents saving an empty script", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn<
      (
        title: string,
        text: string,
      ) => Promise<void>
    >();

    render(
      <ScriptEditor
        initialTitle=""
        initialText=""
        disabled={false}
        onSave={onSave}
      />,
    );

    await user.type(
      screen.getByLabelText("Title"),
      "A test",
    );

    expect(
      screen.getByRole("button", {
        name: /save and segment/i,
      }),
    ).toBeDisabled();

    expect(onSave).not.toHaveBeenCalled();
  });

  it("passes trimmed title and text", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn<
      (
        title: string,
        text: string,
      ) => Promise<void>
    >().mockResolvedValue();

    render(
      <ScriptEditor
        initialTitle=""
        initialText=""
        disabled={false}
        onSave={onSave}
      />,
    );

    await user.type(
      screen.getByLabelText("Title"),
      "  Night Train  ",
    );
    await user.type(
      screen.getByLabelText("Script"),
      "  INT. TRAIN - NIGHT\nMira waits.  ",
    );
    await user.click(
      screen.getByRole("button", {
        name: /save and segment/i,
      }),
    );

    expect(onSave).toHaveBeenCalledWith(
      "Night Train",
      "INT. TRAIN - NIGHT\nMira waits.",
    );
  });

  it("announces the word count", () => {
    render(
      <ScriptEditor
        initialTitle="Test"
        initialText="One two three."
        disabled={false}
        onSave={async () => undefined}
      />,
    );

    expect(
      screen.getByText("3 words"),
    ).toBeInTheDocument();
  });
});
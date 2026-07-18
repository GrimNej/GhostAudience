import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnalysisPage } from "../src/features/analysis/presentation/AnalysisPage";

const start = vi.fn(async () => "run_created");
const resume = vi.fn(async () => undefined);
const cancel = vi.fn();
let latestRun: Record<string, unknown> | null = null;
let projectWorkspace: Record<string, unknown> | null | undefined;
let capabilities: ReturnType<typeof defaultCapabilities>;

vi.mock("../src/features/analysis/data/use-analysis-controller", () => ({
  useAnalysisController: () => ({ start, resume, cancel }),
}));
vi.mock("../src/features/analysis/data/use-capabilities", () => ({
  useCapabilities: () => capabilities,
}));
vi.mock("../src/features/project/presentation/useProject", () => ({
  useProject: () => projectWorkspace,
}));

function defaultCapabilities() {
  return {
    isLoading: false,
    data: {
      schemaVersion: "1.0",
      liveAnalysisEnabled: false as boolean,
      providerMode: "fixture" as string,
      providerId: "fixture",
      modelId: null as string | null,
      modelCatalogVerifiedAt: null,
      maxSegmentCharacters: 12_000,
      maxOperations: 20,
      fixtureModeAvailable: true,
      tokenBudget: {
        monthlyAllowance: 300_000,
        hardStop: 240_000,
        used: 0,
        reserved: 0,
        remainingBeforeHardStop: 240_000,
      },
    },
  };
}

function renderAnalysisPage(): void {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/project/project_test/analyze"]}>
        <Routes>
          <Route path="/project/:projectId/analyze" element={<AnalysisPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function setLatestRun(run: Record<string, unknown>): void {
  projectWorkspace = {
    project: { id: "project_test", name: "Test", intentContract: {} },
    script: { id: "script_test" },
    segments: [{ id: "segment_test" }],
    latestRun: run,
  };
}

describe("AnalysisPage", () => {
  beforeEach(() => {
    latestRun = null;
    projectWorkspace = {
      project: { id: "project_test", name: "Test", intentContract: {} },
      script: { id: "script_test" },
      segments: [{ id: "segment_test" }],
      latestRun,
    };
    capabilities = defaultCapabilities();
    start.mockClear();
    resume.mockClear();
    cancel.mockClear();
  });

  it("binds the reliable demo button to the controller", async () => {
    renderAnalysisPage();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Run reliable demo",
      }),
    );
    await waitFor(() => {
      expect(start).toHaveBeenCalledTimes(1);
    });
  });

  it("offers a resume action for an interrupted run", async () => {
    latestRun = {
      id: "run_test",
      status: "failed",
      committedThroughOrdinal: 0,
      providerMode: "fixture",
      modelId: "fixture-v1",
      failureMessage: "Temporary interruption",
    };
    setLatestRun(latestRun);
    renderAnalysisPage();

    fireEvent.click(screen.getByRole("button", { name: "Resume analysis" }));
    await waitFor(() => {
      expect(resume).toHaveBeenCalledWith("run_test");
    });
  });

  it("covers unavailable, live, failed, and active analysis states", async () => {
    projectWorkspace = undefined;
    renderAnalysisPage();
    expect(screen.getByText(/loading analysis/i)).toBeVisible();
  });

  it("requires a script before analysis", () => {
    projectWorkspace = {
      project: { id: "project_test" },
      script: null,
      segments: [],
      latestRun: null,
    };
    renderAnalysisPage();
    expect(screen.getByRole("heading", { name: /add a script first/i })).toBeVisible();
  });

  it("starts live analysis when verified capabilities permit it", async () => {
    capabilities = {
      ...defaultCapabilities(),
      data: {
        ...defaultCapabilities().data,
        liveAnalysisEnabled: true,
        providerMode: "watsonx",
        modelId: "ibm/granite-demo",
      },
    };
    renderAnalysisPage();
    fireEvent.click(screen.getByRole("button", { name: "Run live watsonx.ai" }));
    await waitFor(() => {
      expect(start).toHaveBeenCalledWith({
        projectId: "project_test",
        providerMode: "watsonx",
        modelId: "ibm/granite-demo",
        promptVersion: "step-v1",
      });
    });
  });

  it("shows a start failure and lets an active run be cancelled", async () => {
    start.mockRejectedValueOnce(new Error("Fixture unavailable"));
    renderAnalysisPage();
    fireEvent.click(screen.getByRole("button", { name: "Run reliable demo" }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Fixture unavailable");
    });

    latestRun = {
      id: "run_active",
      status: "running",
      committedThroughOrdinal: 0,
      providerMode: "watsonx",
      modelId: "ibm/granite-demo",
      failureMessage: null,
    };
    setLatestRun(latestRun);
    renderAnalysisPage();
    fireEvent.click(screen.getByRole("button", { name: "Cancel analysis" }));
    expect(cancel).toHaveBeenCalledWith("run_active");
    expect(screen.getByText(/another tab owns this run/i)).toBeVisible();
  });
});

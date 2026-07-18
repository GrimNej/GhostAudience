import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AnalysisPage } from "../src/features/analysis/presentation/AnalysisPage";

const start = vi.fn(async () => "run_created");

vi.mock("../src/features/analysis/data/use-analysis-controller", () => ({
  useAnalysisController: () => ({ start, cancel: vi.fn() }),
}));
vi.mock("../src/features/analysis/data/use-capabilities", () => ({
  useCapabilities: () => ({
    isLoading: false,
    data: {
      schemaVersion: "1.0",
      liveAnalysisEnabled: false,
      providerMode: "fixture",
      providerId: "fixture",
      modelId: null,
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
  }),
}));
vi.mock("../src/features/project/presentation/useProject", () => ({
  useProject: () => ({
    project: { id: "project_test", name: "Test", intentContract: {} },
    script: { id: "script_test" },
    segments: [{ id: "segment_test" }],
    latestRun: null,
  }),
}));

describe("AnalysisPage", () => {
  it("binds the reliable demo button to the controller", async () => {
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
    fireEvent.click(
      screen.getByRole("button", {
        name: "Run reliable demo",
      }),
    );
    await waitFor(() => {
      expect(start).toHaveBeenCalledTimes(1);
    });
  });
});
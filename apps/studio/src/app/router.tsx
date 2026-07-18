import { createBrowserRouter } from "react-router-dom";

import { AppShell } from "../design-system/layout/AppShell";
import { AnalysisPage } from "../features/analysis/presentation/AnalysisPage";
import { LandingPage } from "../features/landing/presentation/LandingPage";
import {
  ProjectHome,
  ProjectLayout,
} from "../features/project/presentation/ProjectLayout";
import { ProjectsPage } from "../features/project/presentation/ProjectsPage";
import { ProofPage } from "../features/proof/presentation/ProofPage";
import {
  LegacyIntentRedirect,
  LegacyResultsRedirect,
  ResultsPage,
} from "../features/results/presentation/ResultsPage";
import { ScriptPage } from "../features/script/presentation/ScriptPage";
import { RouteErrorPage } from "./route-error-page";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        element: <LandingPage />,
      },
      {
        path: "projects",
        element: <ProjectsPage />,
      },
      {
        path: "project/:projectId",
        element: <ProjectLayout />,
        children: [
          {
            index: true,
            element: <ProjectHome />,
          },
          {
            path: "script",
            element: <ScriptPage />,
          },
          {
            path: "intent",
            element: <LegacyIntentRedirect />,
          },
          {
            path: "analyze",
            element: <AnalysisPage />,
          },
          {
            path: "results",
            element: <ResultsPage />,
          },
          {
            path: "timeline",
            element: <LegacyResultsRedirect view="journey" />,
          },
          {
            path: "mindboard",
            element: <LegacyResultsRedirect view="understanding" />,
          },
          {
            path: "report",
            element: <LegacyResultsRedirect view="overview" />,
          },
        ],
      },
      {
        path: "proof",
        element: <ProofPage />,
      },
    ],
  },
]);

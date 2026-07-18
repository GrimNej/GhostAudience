import {
  createBrowserRouter,
  Navigate,
} from "react-router-dom";

import {
  AppShell,
} from "../design-system/layout/AppShell";
import {
  AnalysisPage,
} from "../features/analysis/presentation/AnalysisPage";
import {
  IntentPage,
} from "../features/intent/presentation/IntentPage";
import {
  LandingPage,
} from "../features/landing/presentation/LandingPage";
import {
  MindboardPage,
} from "../features/mindboard/presentation/MindboardPage";
import {
  ProjectLayout,
} from "../features/project/presentation/ProjectLayout";
import {
  ProjectsPage,
} from "../features/project/presentation/ProjectsPage";
import {
  ProofPage,
} from "../features/proof/presentation/ProofPage";
import {
  ReportPage,
} from "../features/report/presentation/ReportPage";
import {
  ScriptPage,
} from "../features/script/presentation/ScriptPage";
import {
  TimelinePage,
} from "../features/timeline/presentation/TimelinePage";
import {
  RouteErrorPage,
} from "./route-error-page";

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
            element: (
              <Navigate
                to="script"
                replace
              />
            ),
          },
          {
            path: "script",
            element: <ScriptPage />,
          },
          {
            path: "intent",
            element: <IntentPage />,
          },
          {
            path: "analyze",
            element: <AnalysisPage />,
          },
          {
            path: "timeline",
            element: <TimelinePage />,
          },
          {
            path: "mindboard",
            element: <MindboardPage />,
          },
          {
            path: "report",
            element: <ReportPage />,
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
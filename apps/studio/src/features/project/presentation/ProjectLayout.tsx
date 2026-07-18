import { Check, FileText, MessageCircleQuestion, Sparkles } from "lucide-react";
import { Navigate, NavLink, Outlet, useParams } from "react-router-dom";

import { useProject } from "./useProject";

const tabs = [
  ["script", "Content", FileText],
  ["analyze", "Analysis", Sparkles],
  ["results", "Results", MessageCircleQuestion],
] as const;

export function ProjectLayout(): JSX.Element {
  const { projectId } = useParams();

  if (projectId === undefined) {
    throw new Error("Project route is missing projectId.");
  }

  const value = useProject(projectId);

  if (value === undefined) {
    return (
      <div className="project-loading" aria-busy="true">
        <div className="skeleton project-loading__title" />
        <div className="skeleton project-loading__body" />
      </div>
    );
  }

  if (value === null) {
    return (
      <section>
        <p className="eyebrow">Not found</p>
        <h1>That project does not exist.</h1>
      </section>
    );
  }

  return (
    <section className="project-layout">
      <header className="project-heading">
        <div>
          <p className="eyebrow">Project</p>
          <h1>{value.project.name}</h1>
        </div>

        <p className="privacy-chip">Private to this browser</p>
      </header>

      <nav className="project-tabs" aria-label="Project sections">
        {tabs.map(([path, label, Icon], index) => {
          const isDone =
            index === 0
              ? value.script !== null
              : index === 1
                ? value.latestRun?.status === "completed" ||
                  value.latestRun?.status === "completed_with_warnings"
                : false;
          return (
            <NavLink key={path} to={path}>
              <span className="project-tabs__step" aria-hidden="true">
                {isDone ? <Check size={14} /> : index + 1}
              </span>
              <Icon aria-hidden="true" size={17} />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </nav>

      <Outlet />
    </section>
  );
}

export function ProjectHome(): JSX.Element {
  const { projectId } = useParams();
  if (projectId === undefined) throw new Error("Project route is missing projectId.");
  const value = useProject(projectId);
  if (value === undefined)
    return (
      <div className="loading-state" aria-busy="true">
        Opening project...
      </div>
    );
  if (value === null) return <Navigate replace to="/projects" />;
  const completed =
    value.latestRun?.status === "completed" ||
    value.latestRun?.status === "completed_with_warnings";
  const destination = completed
    ? "results"
    : value.script === null
      ? "script"
      : "analyze";
  return <Navigate replace to={destination} />;
}

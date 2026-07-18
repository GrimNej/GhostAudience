import { NavLink, Outlet, useParams } from "react-router-dom";

import { useProject } from "./useProject";

const tabs = [
  ["script", "Script"],
  ["intent", "Intent"],
  ["analyze", "Analyze"],
  ["timeline", "Timeline"],
  ["mindboard", "Mindboard"],
  ["report", "Report"],
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

        <p className="privacy-chip">Stored in this browser</p>
      </header>

      <nav className="project-tabs" aria-label="Project sections">
        {tabs.map(([path, label]) => (
          <NavLink key={path} to={path}>
            {label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </section>
  );
}

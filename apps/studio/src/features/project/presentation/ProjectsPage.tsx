import { Plus, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { createDemoProject } from "../data/demo-project";
import { useProjectRepository, useProjects } from "../data/useProjects";

export function ProjectsPage(): JSX.Element {
  const projects = useProjects();
  const repository = useProjectRepository();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const handledInitialAction = useRef(false);
  const [error, setError] = useState<string | null>(null);

  async function createEmpty(): Promise<void> {
    const project = await repository.create({
      name: "Untitled project",
      now: new Date().toISOString(),
    });
    await navigate(`/project/${project.id}/script`);
  }

  async function createDemo(): Promise<void> {
    const id = await createDemoProject(repository);
    await navigate(`/project/${id}/analyze`);
  }

  useEffect(() => {
    if (handledInitialAction.current) {
      return;
    }

    handledInitialAction.current = true;
    const action =
      searchParams.get("demo") === "1"
        ? createDemo
        : searchParams.get("create") === "1"
          ? createEmpty
          : null;

    if (action !== null) {
      void action().catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "Project creation failed.");
      });
    }
  });

  return (
    <section className="projects-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Your private workspace</p>
          <h1>Your audience reads</h1>
          <p>Continue an existing draft or invite a fresh audience to something new.</p>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={() => {
              void createDemo().catch((caught: unknown) => {
                setError(
                  caught instanceof Error ? caught.message : "Demo creation failed.",
                );
              });
            }}
          >
            <Sparkles aria-hidden="true" size={18} />
            Explore sample
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={() => {
              void createEmpty().catch((caught: unknown) => {
                setError(
                  caught instanceof Error ? caught.message : "Project creation failed.",
                );
              });
            }}
          >
            <Plus aria-hidden="true" size={18} />
            New audience read
          </button>
        </div>
      </header>

      {error === null ? null : (
        <p role="alert" className="field__error">
          {error}
        </p>
      )}

      {projects === undefined ? (
        <div className="loading-state" aria-busy="true">
          Opening your workspace...
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state panel">
          <span className="empty-state__icon">
            <Sparkles aria-hidden="true" size={25} />
          </span>
          <h2>Your first audience is ready when you are.</h2>
          <p>
            Paste a draft, start the read, and see what a first-time audience notices.
          </p>
          <button
            type="button"
            className="button button--primary"
            onClick={() => void createEmpty()}
          >
            <Plus aria-hidden="true" size={18} />
            Start your first read
          </button>
        </div>
      ) : (
        <ul className="project-grid">
          {projects.map((project) => (
            <li key={project.id}>
              <Link className="project-card" to={`/project/${project.id}`}>
                <span className="project-card__mark" aria-hidden="true">
                  {project.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="project-card__copy">
                  <strong>{project.name}</strong>
                  <small>Updated {new Date(project.updatedAt).toLocaleString()}</small>
                </span>
                <span className="project-card__action">Open</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

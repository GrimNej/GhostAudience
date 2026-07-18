import {
  Plus,
  Sparkles,
} from "lucide-react";
import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  createDemoProject,
} from "../data/demo-project";
import {
  useProjectRepository,
  useProjects,
} from "../data/useProjects";

export function ProjectsPage(): JSX.Element {
  const projects = useProjects();
  const repository =
    useProjectRepository();
  const navigate = useNavigate();
  const [searchParams] =
    useSearchParams();
  const handledInitialAction =
    useRef(false);
  const [error, setError] =
    useState<string | null>(null);

  async function createEmpty():
    Promise<void> {
    const project = await repository.create({
      name: "Untitled project",
      now: new Date().toISOString(),
    });
    navigate(
      `/project/${project.id}/script`,
    );
  }

  async function createDemo():
    Promise<void> {
    const id =
      await createDemoProject(repository);
    navigate(`/project/${id}/intent`);
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
      void action().catch(
        (caught: unknown) => {
          setError(
            caught instanceof Error
              ? caught.message
              : "Project creation failed.",
          );
        },
      );
    }
  });

  return (
    <section className="projects-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">
            Local workspace
          </p>
          <h1>Projects</h1>
          <p>
            Projects stay in this browser
            unless you export them.
          </p>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={() => {
              void createDemo().catch(
                (caught: unknown) => {
                  setError(
                    caught instanceof Error
                      ? caught.message
                      : "Demo creation failed.",
                  );
                },
              );
            }}
          >
            <Sparkles
              aria-hidden="true"
              size={18}
            />
            Create demo
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={() => {
              void createEmpty().catch(
                (caught: unknown) => {
                  setError(
                    caught instanceof Error
                      ? caught.message
                      : "Project creation failed.",
                  );
                },
              );
            }}
          >
            <Plus
              aria-hidden="true"
              size={18}
            />
            New project
          </button>
        </div>
      </header>

      {error === null ? null : (
        <p role="alert" className="field__error">
          {error}
        </p>
      )}

      {projects === undefined ? (
        <div aria-busy="true">
          Loading projects…
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state panel">
          <h2>No projects yet</h2>
          <p>
            Start with your own script or
            create the deterministic demo.
          </p>
        </div>
      ) : (
        <ul className="project-grid">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                className="project-card panel"
                to={`/project/${project.id}/script`}
              >
                <strong>{project.name}</strong>
                <span>
                  Updated{" "}
                  {new Date(
                    project.updatedAt,
                  ).toLocaleString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
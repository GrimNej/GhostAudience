import {
  isRouteErrorResponse,
  Link,
  useRouteError,
} from "react-router-dom";

export function RouteErrorPage(): JSX.Element {
  const error = useRouteError();

  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "Unknown route error";

  return (
    <main className="route-error">
      <p className="eyebrow">Navigation error</p>
      <h1>This view could not be opened.</h1>
      <p>{message}</p>
      <Link
        className="button button--primary"
        to="/projects"
      >
        Return to projects
      </Link>
    </main>
  );
}
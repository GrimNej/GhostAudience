import {
  Component,
  type ErrorInfo,
  type PropsWithChildren,
  type ReactNode,
} from "react";

interface ErrorBoundaryState {
  readonly error: Error | null;
}

export class ApplicationErrorBoundary extends Component<
  PropsWithChildren,
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = {
    error: null,
  };

  public static getDerivedStateFromError(
    error: Error,
  ): ErrorBoundaryState {
    return { error };
  }

  public componentDidCatch(
    error: Error,
    info: ErrorInfo,
  ): void {
    console.error(
      "application_error_boundary",
      {
        name: error.name,
        message: error.message,
        componentStack:
          info.componentStack ?? "",
      },
    );
  }

  public render(): ReactNode {
    if (this.state.error === null) {
      return this.props.children;
    }

    return (
      <main
        className="fatal-error"
        aria-labelledby="fatal-error-title"
      >
        <p className="eyebrow">Recovery required</p>
        <h1 id="fatal-error-title">
          The workspace encountered an error.
        </h1>
        <p>
          Your projects remain in this browser. Reload
          the application first. Export diagnostics if
          the error returns.
        </p>
        <details>
          <summary>Technical detail</summary>
          <pre>
            {this.state.error.name}:{" "}
            {this.state.error.message}
          </pre>
        </details>
        <button
          type="button"
          className="button button--primary"
          onClick={() => window.location.reload()}
        >
          Reload workspace
        </button>
      </main>
    );
  }
}
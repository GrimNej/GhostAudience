import {
  NavLink,
  Outlet,
} from "react-router-dom";

import {
  ThemeToggle,
} from "../theme/ThemeToggle";

export function AppShell(): JSX.Element {
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
      >
        Skip to main content
      </a>

      <header className="app-header">
        <NavLink
          className="brand"
          to="/"
          aria-label="Ghost Audience home"
        >
          <span
            className="brand__mark"
            aria-hidden="true"
          >
            ?
          </span>
          <span className="brand__name">
            Ghost Audience
          </span>
        </NavLink>

        <nav
          className="primary-nav"
          aria-label="Primary"
        >
          <NavLink to="/projects">
            Projects
          </NavLink>
          <NavLink to="/proof">
            Proof
          </NavLink>
        </nav>

        <ThemeToggle />
      </header>

      <main
        id="main-content"
        className="app-main"
      >
        <Outlet />
      </main>
    </div>
  );
}
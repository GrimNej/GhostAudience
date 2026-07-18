import { MessageCircleQuestion, Plus } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { ThemeToggle } from "../theme/ThemeToggle";

export function AppShell(): JSX.Element {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="app-header">
        <NavLink className="brand" to="/" aria-label="Ghost Audience home">
          <span className="brand__mark" aria-hidden="true">
            <MessageCircleQuestion size={19} />
          </span>
          <span className="brand__name">Ghost Audience</span>
        </NavLink>
        <nav className="primary-nav" aria-label="Primary">
          <NavLink to="/projects">My projects</NavLink>
          <NavLink to="/proof">Method</NavLink>
        </nav>
        <div className="header-actions">
          <ThemeToggle />
          <NavLink
            className="button button--primary header-new-read"
            to="/projects?create=1"
          >
            <Plus aria-hidden="true" size={17} />
            New read
          </NavLink>
        </div>
      </header>
      <main id="main-content" className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <span>Ghost Audience</span>
        <span>Evidence-backed audience perspective for unfinished work.</span>
      </footer>
    </div>
  );
}

import { ArrowRight, Eye, GitBranch, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

const principles = [
  {
    icon: Eye,
    title: "Reads without hindsight",
    copy: "Each step sees prior audience state and the current segment—never the ending.",
  },
  {
    icon: GitBranch,
    title: "Tracks question journeys",
    copy: "Questions open, develop, resolve, contradict, or remain deliberately unanswered.",
  },
  {
    icon: ShieldCheck,
    title: "Keeps the creator in control",
    copy: "Evidence is reviewable and no script change is applied automatically.",
  },
] as const;

export function LandingPage(): JSX.Element {
  return (
    <section className="landing">
      <div className="landing__hero">
        <p className="eyebrow">Meet your audience before they exist.</p>
        <h1 className="page-title">
          See the questions your audience carries through the story.
        </h1>
        <p className="page-lede">
          Ghost Audience reads one segment at a time, reconstructs what a first-time
          viewer could know, and separates useful curiosity from accidental confusion.
        </p>
        <div className="landing__actions">
          <Link className="button button--primary" to="/projects?create=1">
            Start with a script
            <ArrowRight aria-hidden="true" size={18} />
          </Link>
          <Link className="button button--secondary" to="/projects?demo=1">
            Try the demo
          </Link>
        </div>
        <p className="privacy-note">
          Projects are stored in this browser. Live analysis sends only the current
          segment and bounded prior state.
        </p>
      </div>

      <div className="principle-grid">
        {principles.map(({ icon: Icon, title, copy }) => (
          <article key={title} className="principle-card panel">
            <Icon aria-hidden="true" size={24} />
            <h2>{title}</h2>
            <p>{copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

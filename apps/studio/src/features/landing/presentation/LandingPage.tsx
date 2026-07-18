import {
  ArrowRight,
  CheckCircle2,
  FileInput,
  MessageCircleQuestion,
  Quote,
  ScanText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

const steps = [
  {
    number: "01",
    icon: FileInput,
    title: "Bring the whole draft",
    copy: "Paste your content or import TXT, Markdown, or Fountain. No setup form is required.",
  },
  {
    number: "02",
    icon: ScanText,
    title: "Let the audience read",
    copy: "The story is read in order, one section at a time, without using future reveals.",
  },
  {
    number: "03",
    icon: MessageCircleQuestion,
    title: "See what they carry",
    copy: "Get audience questions, clarity risks, assumptions, evidence, and a shareable report.",
  },
] as const;

export function LandingPage(): JSX.Element {
  return (
    <section className="landing">
      <div className="landing-hero">
        <div className="landing-hero__copy">
          <span className="landing-kicker">
            <Sparkles aria-hidden="true" size={15} />A first audience for unfinished
            work
          </span>
          <h1>Know what your audience is thinking before you publish.</h1>
          <p className="page-lede">
            Add a script, story, article, or Markdown draft. Ghost Audience follows it
            in order and shows the questions, assumptions, and clarity risks a new
            reader could carry.
          </p>
          <div className="landing__actions">
            <Link
              className="button button--primary button--large"
              to="/projects?create=1"
            >
              Analyze your content
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
            <Link
              className="button button--secondary button--large"
              to="/projects?demo=1"
            >
              Explore a sample
            </Link>
          </div>
          <ul className="hero-assurances" aria-label="Product assurances">
            <li>
              <CheckCircle2 aria-hidden="true" size={16} /> No required setup form
            </li>
            <li>
              <CheckCircle2 aria-hidden="true" size={16} /> Evidence from your words
            </li>
            <li>
              <ShieldCheck aria-hidden="true" size={16} /> Projects stay in this browser
            </li>
          </ul>
        </div>

        <div
          className="audience-preview"
          role="img"
          aria-label="Example audience read showing questions and clarity risks"
        >
          <div className="audience-preview__glow" />
          <article className="preview-sheet">
            <header>
              <span className="preview-sheet__mark">
                <Quote size={17} />
              </span>
              <div>
                <strong>First audience read</strong>
                <small>Section 4 of 7</small>
              </div>
              <span className="preview-live">Reading</span>
            </header>
            <div className="preview-progress">
              <span />
            </div>
            <p className="preview-label">The audience is wondering</p>
            <div className="preview-question preview-question--primary">
              <span>Healthy curiosity</span>
              <strong>Why does Kaelen believe the fortress can still hold?</strong>
              <small>Opened in section 2</small>
            </div>
            <div className="preview-question">
              <span>Clarity risk</span>
              <strong>Where are the remaining defenders positioned?</strong>
              <small>Evidence attached</small>
            </div>
            <footer>
              <div>
                <strong>12</strong>
                <span>clear signals</span>
              </div>
              <div>
                <strong>4</strong>
                <span>questions</span>
              </div>
              <div>
                <strong>1</strong>
                <span>clarity risk</span>
              </div>
            </footer>
          </article>
          <div className="preview-note preview-note--top">
            <MessageCircleQuestion aria-hidden="true" size={17} />
            Questions appear as the story unfolds
          </div>
          <div className="preview-note preview-note--bottom">
            <ShieldCheck aria-hidden="true" size={17} />
            Later scenes stay hidden
          </div>
        </div>
      </div>

      <section className="landing-steps" aria-labelledby="how-it-works">
        <header className="landing-section-heading">
          <p className="eyebrow">A clean path from draft to insight</p>
          <h2 id="how-it-works">One input. One analysis. Useful answers.</h2>
        </header>
        <div className="step-grid">
          {steps.map(({ number, icon: Icon, title, copy }) => (
            <article key={number} className="step-card">
              <span className="step-card__number">{number}</span>
              <span className="step-card__icon">
                <Icon aria-hidden="true" size={21} />
              </span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-cta">
        <div>
          <p className="eyebrow">Your draft already contains the answers</p>
          <h2>Listen before the real audience arrives.</h2>
        </div>
        <Link className="button button--inverse button--large" to="/projects?create=1">
          Start a new audience read
          <ArrowRight aria-hidden="true" size={18} />
        </Link>
      </section>
    </section>
  );
}

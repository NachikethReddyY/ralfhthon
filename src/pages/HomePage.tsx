import { Link } from 'react-router-dom';
import { type Variants, motion } from 'framer-motion';
import { LayoutDashboard, Inbox, History, Settings, Bell } from 'lucide-react';
import Header from '../components/Header';
import Logo from '../components/Logo';
import Button from '../components/Button';
import Container from '../components/Container';
import './HomePage.css';

const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];

const stagger: Variants = {
  visible: { transition: { staggerChildren: 0.09 } },
};
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: easeOut } },
};
const fadeSlow: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: easeOut } },
};

function IdeMockup() {
  return (
    <div className="hp-ide-card">
      <div className="hp-ide-topbar" aria-hidden="true">
        <div className="hp-ide-dots">
          <span className="hp-dot hp-dot--red" />
          <span className="hp-dot hp-dot--yellow" />
          <span className="hp-dot hp-dot--green" />
        </div>
        <div className="hp-ide-search-box">
          <span className="hp-ide-topbar-title">lumina / ticket-queue</span>
        </div>
      </div>
      <div className="hp-ide-body">
        {/* App sidebar — mirrors the real AppSidebar collapsed */}
        <div className="hp-ide-nav" aria-hidden="true">
          <div className="hp-ide-nav-logo">
            <Logo size="sm" showText={false} />
          </div>
          <div className="hp-ide-nav-items">
            <div className="hp-ide-nav-item"><LayoutDashboard size={16} /></div>
            <div className="hp-ide-nav-item hp-ide-nav-item--active"><Inbox size={16} /></div>
            <div className="hp-ide-nav-item"><History size={16} /></div>
            <div className="hp-ide-nav-item"><Bell size={16} /></div>
          </div>
          <div className="hp-ide-nav-bottom">
            <div className="hp-ide-nav-item"><Settings size={16} /></div>
            <div className="hp-ide-nav-avatar">NR</div>
          </div>
        </div>

        {/* Left: ticket list */}
        <div className="hp-ide-sidebar">
          <div className="hp-ide-sidebar-header">
            <span className="hp-ide-sidebar-label">Open · 4</span>
          </div>
          {[
            { id: 'LM-084', title: 'Login page 500 on SSO', priority: 'P1', status: 'routing', active: true },
            { id: 'LM-083', title: 'Export CSV timeout', priority: 'P2', status: 'assigned' },
            { id: 'LM-082', title: 'Avatar upload fails', priority: 'P3', status: 'open' },
            { id: 'LM-081', title: 'Dark mode flicker', priority: 'P3', status: 'open' },
            { id: 'LM-080', title: 'Billing page 403', priority: 'P2', status: 'in progress' },
          ].map((t) => (
            <div key={t.id} className={`hp-ticket-row${t.active ? ' hp-ticket-row--active' : ''}`}>
              <div className="hp-ticket-row-top">
                <span className={`hp-priority hp-priority--${t.priority.toLowerCase()}`}>{t.priority}</span>
                <span className="hp-ticket-id">{t.id}</span>
              </div>
              <div className="hp-ticket-title">{t.title}</div>
              <span className={`hp-status hp-status--${t.status.replace(' ', '-')}`}>{t.status}</span>
            </div>
          ))}
        </div>

        {/* Center: ticket detail */}
        <div className="hp-ide-main">
          <div className="hp-detail-header">
            <div className="hp-detail-meta">
              <span className="hp-priority hp-priority--p1">P1</span>
              <span className="hp-detail-id">LM-084</span>
              <span className="hp-pill-status hp-pill-status--routing">pending routing</span>
            </div>
            <h3 className="hp-detail-title">Login page 500 on SSO</h3>
            <p className="hp-detail-body">
              Users report a 500 error when attempting SSO login via Google OAuth.
              Reproducible on all browsers. First reported 12 minutes ago.
            </p>
          </div>
          <div className="hp-detail-meta-grid">
            <div className="hp-meta-item">
              <span className="hp-meta-label">Type</span>
              <span className="hp-meta-value">Bug</span>
            </div>
            <div className="hp-meta-item">
              <span className="hp-meta-label">Category</span>
              <span className="hp-meta-value">Authentication</span>
            </div>
            <div className="hp-meta-item">
              <span className="hp-meta-label">Created</span>
              <span className="hp-meta-value">12m ago</span>
            </div>
            <div className="hp-meta-item">
              <span className="hp-meta-label">Assigned to</span>
              <span className="hp-meta-value hp-meta-value--empty">—</span>
            </div>
          </div>
          <div className="hp-repro">
            <span className="hp-repro-label">Replication steps</span>
            <pre className="hp-repro-code">{`1. Navigate to /login\n2. Click "Continue with Google"\n3. Observe 500 Internal Server Error`}</pre>
          </div>
        </div>

        {/* Right: AI routing panel */}
        <div className="hp-ide-ai">
          <div className="hp-ai-header">
            <span className="hp-ai-label">AI Routing</span>
            <span className="hp-ai-live">● live</span>
          </div>
          <div className="hp-ai-timeline">
            <div className="hp-ai-step">
              <span className="hp-pill hp-pill--thinking">Thinking</span>
              <p>Analyzing ticket type, severity, and affected surface. Checking auth subsystem ownership.</p>
            </div>
            <div className="hp-ai-step">
              <span className="hp-pill hp-pill--grep">Grep</span>
              <p>Found 3 prior P1 bugs in Auth module — last resolved by Maya Chen in 4h avg.</p>
            </div>
            <div className="hp-ai-step">
              <span className="hp-pill hp-pill--read">Read</span>
              <p>Maya's current load: 2 open tickets (P3). Available bandwidth confirmed.</p>
            </div>
            <div className="hp-ai-step">
              <span className="hp-pill hp-pill--edit">Edit</span>
              <p>Drafting assignment rationale and expected SLA window.</p>
            </div>
            <div className="hp-ai-step">
              <span className="hp-pill hp-pill--done">Done</span>
              <p>Assigned to Maya Chen — Auth specialist, lowest load, fastest prior resolution time.</p>
            </div>
          </div>
          <div className="hp-ai-result">
            <span className="hp-ai-result-label">Assigned to</span>
            <div className="hp-ai-assignee">
              <div className="hp-assignee-avatar">MC</div>
              <div>
                <div className="hp-assignee-name">Maya Chen</div>
                <div className="hp-assignee-meta">Auth · 2 open</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomePage() {
  return (
    <div className="homepage">
      <Header />

      {/* ── Hero ── */}
      <section className="hp-hero">
        <Container maxWidth="xl">
          <motion.div
            className="hp-hero-inner"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.p className="hp-kicker" variants={fadeUp}>
              Support operations platform
            </motion.p>

            <motion.h1 className="hp-title" variants={fadeUp}>
              Tickets routed with<br />intention, not chance.
            </motion.h1>

            <motion.p className="hp-subtitle" variants={fadeUp}>
              Lumina routes every support ticket to the right person — based on load,
              expertise, and priority. No manual triage. No guesswork.
            </motion.p>

            <motion.div className="hp-ctas" variants={fadeUp}>
              <Link to="/signup" className="hp-cta-link">
                <Button variant="secondary-dark" size="lg">Get started</Button>
              </Link>
              <Link to="/login" className="hp-cta-link">
                <Button variant="text-link" size="lg">Sign in →</Button>
              </Link>
            </motion.div>

            <motion.div variants={fadeSlow} className="hp-mockup-wrap">
              <IdeMockup />
            </motion.div>
          </motion.div>
        </Container>
      </section>

      {/* ── Feature cards ── */}
      <section className="hp-section">
        <Container maxWidth="xl">
          <p className="hp-section-label">Why Lumina</p>
          <div className="hp-section-head">
            <h2 className="hp-section-title">Built for teams that move fast.</h2>
            <p className="hp-section-sub">
              Stop routing tickets by hand. Lumina knows who's best suited, right now.
            </p>
          </div>
          <div className="hp-grid">
            <div className="hp-card">
              <p className="hp-card-kicker">Routing</p>
              <h3 className="hp-card-title">Assign with intent.</h3>
              <p className="hp-card-body">
                Load, expertise, and priority are all weighed before an assignment lands.
                No more piling onto the same two admins.
              </p>
            </div>
            <div className="hp-card">
              <p className="hp-card-kicker">Audit</p>
              <h3 className="hp-card-title">Every decision explained.</h3>
              <p className="hp-card-body">
                Each assignment carries a reasoning trace — so you can review, challenge,
                or learn from how Lumina thinks.
              </p>
            </div>
            <div className="hp-card">
              <p className="hp-card-kicker">Velocity</p>
              <h3 className="hp-card-title">Fast when it matters.</h3>
              <p className="hp-card-body">
                P1 tickets don't wait in a queue. Lumina escalates, routes, and notifies
                in seconds.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* ── CTA card ── */}
      <section className="hp-cta-band">
        <Container maxWidth="xl">
          <div className="hp-cta-card">
            <h2 className="hp-cta-title">Start using Lumina today.</h2>
            <p className="hp-cta-body">Free to try. No credit card required.</p>
            <Link to="/signup" className="hp-cta-link">
              <Button variant="secondary-dark" size="lg">Get started</Button>
            </Link>
          </div>
        </Container>
      </section>

      {/* ── Footer ── */}
      <footer className="hp-footer">
        <Container maxWidth="xl">
          <div className="hp-footer-inner">
            <Logo size="sm" showText={true} />
            <span className="hp-footer-copy">© 2026 Nachiketh Reddy. All rights reserved.</span>
          </div>
        </Container>
      </footer>
    </div>
  );
}

export default HomePage;

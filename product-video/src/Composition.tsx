import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
} from "remotion";

type Issue = {
  id: string;
  title: string;
  severity: string;
  status: string;
  labels: string[];
};

const issues: Issue[] = [
  {
    id: "#128",
    title: "Signup fails in production",
    severity: "P1",
    status: "Open",
    labels: ["auth", "production", "supabase"],
  },
  {
    id: "#126",
    title: "GitHub OAuth callback loses session",
    severity: "P2",
    status: "Triaged",
    labels: ["github", "oauth"],
  },
  {
    id: "#119",
    title: "Gemini routing response needs schema guard",
    severity: "P3",
    status: "Ready",
    labels: ["ai", "gemini"],
  },
];

const collaborators = [
  {
    name: "CJ",
    handle: "@cj",
    role: "Full-stack developer",
    load: "4 active",
    fit: "Auth, React, Supabase",
  },
  {
    name: "Chong Hao",
    handle: "@chonghao",
    role: "Backend and AI",
    load: "7 active",
    fit: "API, Gemini, routing",
  },
];

function useFadeIn(offset = 0, duration = 18) {
  const frame = useCurrentFrame();
  return interpolate(frame - offset, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
}

function Shell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const opacity = useFadeIn();
  const frame = useCurrentFrame();
  const y = interpolate(frame, [0, 24], [28, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill className="scene">
      <div className="grain" />
      <div className="topbar">
        <div className="brand-mark">L</div>
        <div>
          <strong>Lumina</strong>
          <span>Developer issue ops</span>
        </div>
      </div>
      <div className="scene-header" style={{ opacity, transform: `translateY(${y}px)` }}>
        <p>{eyebrow}</p>
        <h1>{title}</h1>
        <span>{subtitle}</span>
      </div>
      <div className="scene-body" style={{ opacity }}>{children}</div>
    </AbsoluteFill>
  );
}

function ConnectGithubScene() {
  const frame = useCurrentFrame();
  const pulse = spring({ frame: frame - 28, fps: 30, config: { damping: 12 } });
  const buttonScale = interpolate(pulse, [0, 1], [0.92, 1], { extrapolateRight: "clamp" });

  return (
    <Shell
      eyebrow="Step 1"
      title="Create an account, then connect GitHub"
      subtitle="Lumina should use the signed-in person's GitHub access, not a shared project token."
    >
      <div className="auth-grid">
        <div className="signup-card">
          <span className="card-kicker">New teammate</span>
          <h2>Sign up</h2>
          <div className="field">cj@example.com</div>
          <div className="field muted">Password saved securely</div>
          <div className="field split">
            <span>CJ</span>
            <span>Developer</span>
          </div>
          <div className="success-line">Account created</div>
        </div>
        <div className="oauth-card">
          <span className="card-kicker">GitHub status</span>
          <h2>Not connected yet</h2>
          <p>Connect once to list your repositories, collaborators, and issues.</p>
          <div className="oauth-button" style={{ transform: `scale(${buttonScale})` }}>
            Connect GitHub
          </div>
          <small>OAuth scope: repo access for selected repositories</small>
        </div>
      </div>
    </Shell>
  );
}

function RepoScene() {
  const frame = useCurrentFrame();
  const highlight = Math.floor(frame / 26) % 3;
  const repos = [
    ["ralfhthon/lumina", "TypeScript", "18 open issues"],
    ["cj/helpdesk-api", "Node.js", "7 open issues"],
    ["chonghao/ai-routing", "Python", "5 open issues"],
  ];

  return (
    <Shell
      eyebrow="Step 2"
      title="Pick from your real repositories"
      subtitle="After OAuth, the workspace should show repos the current GitHub user can access."
    >
      <div className="workspace-frame">
        <aside className="repo-sidebar">
          <h3>Your GitHub repositories</h3>
          {repos.map((repo, index) => (
            <div className={index === highlight ? "repo-row active" : "repo-row"} key={repo[0]}>
              <strong>{repo[0]}</strong>
              <span>{repo[1]} - {repo[2]}</span>
            </div>
          ))}
        </aside>
        <div className="repo-detail">
          <div className="detail-top">
            <span>Selected repository</span>
            <strong>{repos[highlight][0]}</strong>
          </div>
          <div className="metric-grid">
            <div><span>Issues</span><strong>18</strong></div>
            <div><span>Collaborators</span><strong>2</strong></div>
            <div><span>AI provider</span><strong>Gemini</strong></div>
          </div>
          <div className="sync-banner">Ready to import live GitHub issues</div>
        </div>
      </div>
    </Shell>
  );
}

function CollaboratorsScene() {
  const frame = useCurrentFrame();
  const selected = frame > 90 ? 1 : 0;

  return (
    <Shell
      eyebrow="Step 3"
      title="Route work to actual collaborators"
      subtitle="Lumina should pull repository collaborators from GitHub. For this project: CJ and Chong Hao."
    >
      <div className="collab-layout">
        {collaborators.map((person, index) => (
          <div className={index === selected ? "collab-card active" : "collab-card"} key={person.name}>
            <div className="avatar">{person.name.slice(0, 2).toUpperCase()}</div>
            <div>
              <h2>{person.name}</h2>
              <p>{person.handle}</p>
              <span>{person.role}</span>
            </div>
            <div className="collab-meta">
              <strong>{person.load}</strong>
              <span>{person.fit}</span>
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}

function IssuesScene() {
  const frame = useCurrentFrame();

  return (
    <Shell
      eyebrow="Step 4"
      title="Import issues and keep context"
      subtitle="Each GitHub issue becomes a structured Lumina task with labels, severity, and sync state."
    >
      <div className="issue-board">
        {issues.map((issue, index) => {
          const enter = interpolate(frame, [index * 14, index * 14 + 20], [40, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
          const opacity = interpolate(frame, [index * 14, index * 14 + 16], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div className="issue-card" key={issue.id} style={{ opacity, transform: `translateY(${enter}px)` }}>
              <div>
                <span className="issue-id">{issue.id}</span>
                <span className="severity">{issue.severity}</span>
              </div>
              <h2>{issue.title}</h2>
              <p>{issue.labels.join(" / ")}</p>
              <small>{issue.status} - synced from GitHub</small>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

function GeminiScene() {
  const frame = useCurrentFrame();
  const cursor = Math.floor(frame / 15) % 2 === 0 ? "|" : "";
  const responseOpacity = interpolate(frame, [70, 105], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Shell
      eyebrow="Step 5"
      title="Use Gemini to analyze and route"
      subtitle="The AI flow should be Gemini-only: no OpenAI, no Codex branding, no mock assistant claims."
    >
      <div className="gemini-panel">
        <div className="prompt-box">
          <span>Ask Gemini</span>
          <p>Summarize the production signup failure and recommend the owner.{cursor}</p>
        </div>
        <div className="gemini-response" style={{ opacity: responseOpacity }}>
          <strong>Gemini analysis</strong>
          <ul>
            <li>Likely cause: backend env or OAuth callback mismatch.</li>
            <li>Route to CJ for Supabase/auth UI verification.</li>
            <li>Fallback to Chong Hao for API and Gemini schema handling.</li>
            <li>Verify: health endpoint, signup, GitHub connect, issue import.</li>
          </ul>
        </div>
      </div>
    </Shell>
  );
}

function FinishScene() {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [20, 110], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <Shell
      eyebrow="The workflow"
      title="GitHub in, Gemini guidance, human approval out"
      subtitle="Lumina keeps the team in control while speeding up issue intake, routing, and handoff."
    >
      <div className="finish-card">
        <div className="flow-line">
          <span>Connect GitHub</span>
          <span>Import issues</span>
          <span>Route to CJ or Chong Hao</span>
          <span>Ask Gemini</span>
          <span>Sync back</span>
        </div>
        <div className="progress-track">
          <div style={{ width: `${progress}%` }} />
        </div>
        <h2>Ready for the real integration</h2>
        <p>Once OAuth and Gemini are wired, the walkthrough becomes the exact product flow.</p>
      </div>
    </Shell>
  );
}

export const MyComposition = () => {
  return (
    <AbsoluteFill className="video-root">
      <Sequence durationInFrames={330}>
        <ConnectGithubScene />
      </Sequence>
      <Sequence from={330} durationInFrames={330}>
        <RepoScene />
      </Sequence>
      <Sequence from={660} durationInFrames={300}>
        <CollaboratorsScene />
      </Sequence>
      <Sequence from={960} durationInFrames={330}>
        <IssuesScene />
      </Sequence>
      <Sequence from={1290} durationInFrames={420}>
        <GeminiScene />
      </Sequence>
      <Sequence from={1710} durationInFrames={390}>
        <FinishScene />
      </Sequence>
    </AbsoluteFill>
  );
};

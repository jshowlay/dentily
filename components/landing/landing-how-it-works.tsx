import { Activity, MessageSquare, Search } from "lucide-react";

function buildSteps(leadCount: number) {
  return [
    {
      num: "1",
      title: "Search Your Market",
      body: "Find dental practices in your target city or area.",
      icon: Search,
      preview: (
        <>
          <div className="dh-faux-search">
            <span className="dh-faux-search-dot" />
            Austin, TX — dental practices
          </div>
          <p className="dh-faux-hint">↓ Up to {leadCount} practices found · scoring now</p>
        </>
      ),
    },
    {
      num: "2",
      title: "Spot the Best Opportunities",
      body: "See which practices show clear signs they may need marketing help.",
      icon: Activity,
      preview: (
        <>
          {[
            { name: "Dentists at Midtown", score: 76, pct: 76 },
            { name: "Ultra Smile DentaSpa", score: 58, pct: 58 },
            { name: "My Dentist in Miami", score: 64, pct: 64 },
          ].map((row) => (
            <div key={row.name} className="dh-score-row">
              <span className="dh-score-name">{row.name}</span>
              <div className="dh-score-bar-wrap">
                <div className="dh-score-bar-fill" style={{ width: `${row.pct}%` }} />
              </div>
              <span className="dh-score-val">{row.score}</span>
            </div>
          ))}
        </>
      ),
    },
    {
      num: "3",
      title: "Reach Out With a Better Pitch",
      body: "Use Dentily's insights to contact practices with a more relevant offer.",
      icon: MessageSquare,
      preview: (
        <>
          <div className="dh-pitch-quote" aria-hidden>
            &ldquo;
          </div>
          <p className="dh-pitch-text">
            Hey Dr. Patel — Sarah here, from Growth Dental Co. We help practices climb past the 4.5-star threshold on
            Google. You&apos;re sitting at <span className="dh-pitch-hl">4.2 stars</span> with 469 reviews in Miami,
            which is often the first cut when someone compares practices nearby.
          </p>
          <p className="dh-pitch-ok">✓ Contact form · High priority signal</p>
        </>
      ),
    },
  ] as const;
}

export function LandingHowItWorks({ leadCount }: { leadCount: number }) {
  const steps = buildSteps(leadCount);

  return (
    <section id="how-it-works" className="dh-section dh-hiw">
      <p className="dh-hiw-label">How it works</p>
      <h2>
        How Dentily <em>actually</em> works
      </h2>
      <div className="dh-hiw-grid">
        {steps.map((step) => (
          <article key={step.num} className="dh-step-card">
            <span className="dh-step-num" aria-hidden>
              {step.num}
            </span>
            <div className="dh-step-icon">
              <step.icon size={20} strokeWidth={1.75} aria-hidden />
            </div>
            <h3 className="dh-step-title">{step.title}</h3>
            <p className="dh-step-body">{step.body}</p>
            <div className="dh-step-preview">{step.preview}</div>
          </article>
        ))}
      </div>
    </section>
  );
}

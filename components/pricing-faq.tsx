type PricingFaqProps = {
  layout?: "accordion" | "grid";
  /** Lead count for pack-size answers — defaults to 150 until confirmed. */
  leadCount?: number;
};

function buildFaqItems(leadCount: number): { q: string; a: string }[] {
  return [
    {
      q: "What does a Dentily lead pack include?",
      a: `Up to ${leadCount} scored dental practice records for the area you searched: name, location, Maps link, ratings and reviews where available, priority and score, a short “why this lead” rationale, estimated opportunity range, best contact path (email, contact form, or phone when we can determine it), and a ready-to-use outreach message starter. Built for B2B sales — not consumer patient data.`,
    },
    {
      q: "Who is Dentily for?",
      a: "Dentily is built for agencies, freelancers, consultants, and marketers who sell services to dental practices and want a prioritized list with angles and message starters — not a generic scraped directory.",
    },
    {
      q: "Is Dentily for agencies and freelancers?",
      a: "Yes. It’s designed for anyone selling growth, marketing, SEO, ads, or related services to practices: prioritize who to call first, then use the included drafts as a starting point.",
    },
    {
      q: "Do all leads include email addresses?",
      a: "Each lead includes the best available contact path, which may be an email address, contact form URL, or phone number depending on what the practice lists publicly. Many rows are immediately actionable by phone or form even when a mailbox isn’t exposed.",
    },
    {
      q: "How fast can I start outreach?",
      a: "After your search finishes, review results on screen right away. After checkout, download the CSV and start the same day. Optional background steps may add more email detail later without blocking your first pass.",
    },
    {
      q: "What is Dentily — is it for dental practices directly?",
      a: "Dentily is a B2B prospecting tool. It does not replace a dental practice’s marketing team or serve patients. You get practice-level opportunities from public business listings (e.g. Google Maps) to support your sales outreach.",
    },
    {
      q: "How is this different from patient leads?",
      a: "Dentily does not sell individual patient identities or clinical data. You get practice-level opportunities derived from listings such as Google Maps.",
    },
    {
      q: "Is this a subscription?",
      a: `No — it's a one-time purchase. You pay once and get your ${leadCount} leads immediately. No recurring charges, no cancellation needed.`,
    },
    {
      q: "How many leads are in each pack?",
      a: `Each purchase includes up to ${leadCount} scored dental practices for the market you search.`,
    },
    {
      q: "Do I get the same leads twice?",
      a: "No. Dentily tracks every practice you've seen and filters them out of future searches on your account.",
    },
  ];
}

export function PricingFaq({ layout = "accordion", leadCount = 150 }: PricingFaqProps) {
  const faqItems = buildFaqItems(leadCount);
  if (layout === "grid") {
    return (
      <section className="dp-faq" aria-labelledby="pricing-faq-heading">
        <h2 id="pricing-faq-heading" className="dp-serif">
          Frequently asked questions
        </h2>
        <div className="dp-faq-grid">
          {faqItems.map((item) => (
            <div key={item.q}>
              <p className="dp-faq-q">{item.q}</p>
              <p className="dp-faq-a">{item.a}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="mt-12 border-t border-slate-200 pt-10">
      <h2 className="text-lg font-semibold text-slate-900">Frequently asked questions</h2>
      <div className="mt-6 space-y-3">
        {faqItems.map((item) => (
          <details
            key={item.q}
            className="group rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <summary className="cursor-pointer list-none text-sm font-medium text-slate-900 [&::-webkit-details-marker]:hidden">
              {item.q}
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

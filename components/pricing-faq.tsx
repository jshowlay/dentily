const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "What does a Dentily lead pack include?",
    a: "Up to 50 scored dental practice records for the area you searched: name, location, Maps link, ratings and reviews where available, priority and score, a short “why this lead” rationale, estimated opportunity range, best contact path (email, contact form, or phone when we can determine it), and a ready-to-use outreach message starter. Built for B2B sales — not consumer patient data.",
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
    q: "Is there a subscription?",
    a: "The standard opportunity pack is a one-time purchase for that search. No subscription is required in the product flow.",
  },
];

export function PricingFaq() {
  return (
    <div className="mt-12 border-t border-slate-200 pt-10">
      <h2 className="text-lg font-semibold text-slate-900">Frequently asked questions</h2>
      <div className="mt-6 space-y-3">
        {FAQ_ITEMS.map((item) => (
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

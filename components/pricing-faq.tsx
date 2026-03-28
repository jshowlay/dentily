const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "What kind of leads are included?",
    a: "Each pack is built from local dental practice listings (e.g. Google Maps) in the area you choose. You get practice names, location, contact details where available, scores, reasons, and suggested outreach — formatted for your team to act on.",
  },
  {
    q: "Are these exclusive?",
    a: "Packs are built from public business data. Dentily limits one paid pack per area to reduce overlap between customers; that does not guarantee exclusivity against all other outreach.",
  },
  {
    q: "How fast do I receive leads?",
    a: "After your search finishes, results appear on screen. After a one-time purchase, you can download the CSV immediately from your results or success page.",
  },
  {
    q: "Is there a contract?",
    a: "No subscription is required for the standard lead pack. It is a one-time purchase for that search.",
  },
  {
    q: "What happens after purchase?",
    a: "Payment unlocks CSV download for that search anytime. Use the outreach snippets as a starting point and follow your own compliance and licensing rules.",
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

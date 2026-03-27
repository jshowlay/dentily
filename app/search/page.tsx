import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { SearchForm } from "@/components/search-form";

export default function SearchPage() {
  return (
    <main className="min-h-screen bg-white">
      <header className="w-full bg-black py-4 text-white">
        <div className="container-page flex items-center justify-between">
          <Link href="/" className="inline-flex flex-col gap-0.5 text-white no-underline hover:opacity-95">
            <BrandMark />
          </Link>
          <Link href="/" className="text-sm text-white/90 underline-offset-4 hover:underline">
            Marketing page
          </Link>
        </div>
      </header>
      <section className="container-page flex min-h-[calc(100vh-64px)] items-center justify-center py-10">
        <div className="w-full">
          <h1 className="mb-3 text-center text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Get your dental lead pack
          </h1>
          <p className="mb-8 text-center text-lg text-slate-600">
            Choose your location — we find high-opportunity practices and give you prioritized outreach so you can book
            more patients.
          </p>
          <div className="flex justify-center">
            <SearchForm
              defaultNiche="dentists"
              cardTitle="Find dental practices"
              cardDescription="Pick a city. We build your list of 50 high-opportunity dental practices ready for growth, with outreach included."
              submitLabel="Get My Lead Pack"
            />
          </div>
        </div>
      </section>
    </main>
  );
}

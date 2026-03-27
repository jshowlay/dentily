import { SearchForm } from "@/components/search-form";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <header className="w-full bg-black py-4 text-white">
        <div className="container-page text-lg font-semibold">Leadly</div>
      </header>
      <section className="container-page flex min-h-[calc(100vh-64px)] items-center justify-center">
        <div className="w-full">
          <h1 className="mb-3 text-center text-4xl font-bold tracking-tight">Get AI-Generated Leads in Seconds</h1>
          <p className="mb-8 text-center text-slate-600">Search by niche and location, then let AI score and personalize outreach.</p>
          <div className="flex justify-center">
            <SearchForm />
          </div>
        </div>
      </section>
    </main>
  );
}

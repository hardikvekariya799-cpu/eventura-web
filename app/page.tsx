export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Eventura – CEO Dashboard
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Hardik Vekariya (CEO) · Surat, Gujarat
            </p>
          </div>
          <span className="rounded-full border border-yellow-400/40 px-4 py-1 text-xs uppercase tracking-wide text-yellow-200">
            Events that speak your style
          </span>
        </header>

        {/* Top summary cards */}
        <section className="grid gap-4 md:grid-cols-3 mb-8">
          <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4">
            <p className="text-xs text-slate-400 mb-1">This month</p>
            <p className="text-lg font-semibold">12 Events</p>
            <p className="text-xs text-emerald-400 mt-1">+4 vs last month</p>
          </div>

          <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4">
            <p className="text-xs text-slate-400 mb-1">Revenue (est.)</p>
            <p className="text-lg font-semibold">₹18.5 Lakh</p>
            <p className="text-xs text-emerald-400 mt-1">Target: ₹25 Lakh</p>
          </div>

          <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4">
            <p className="text-xs text-slate-400 mb-1">Leads in pipeline</p>
            <p className="text-lg font-semibold">23 Active</p>
            <p className="text-xs text-yellow-300 mt-1">7 need follow-up</p>
          </div>
        </section>

        {/* Two-column section */}
        <section className="grid gap-6 md:grid-cols-2">
          {/* Upcoming events */}
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-4">
            <h2 className="text-base font-semibold mb-3">
              Upcoming Events (next 7 days)
            </h2>
            <ul className="space-y-3 text-sm">
              <li className="flex justify-between border-b border-slate-800 pb-2">
                <div>
                  <p className="font-medium">Patel Wedding Sangeet</p>
                  <p className="text-slate-400 text-xs">
                    14 Dec · Laxmi Farm, Surat · 450 guests
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-300">
                  Confirmed
                </span>
              </li>
              <li className="flex justify-between border-b border-slate-800 pb-2">
                <div>
                  <p className="font-medium">Corporate Gala – XYZ Textiles</p>
                  <p className="text-slate-400 text-xs">
                    16 Dec · Taj Gateway · 220 guests
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-300">
                  Pending advance
                </span>
              </li>
              <li className="flex justify-between">
                <div>
                  <p className="font-medium">Engagement – Mehta Family</p>
                  <p className="text-slate-400 text-xs">
                    18 Dec · Indoor · 150 guests
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-sky-500/10 text-sky-300">
                  Proposal sent
                </span>
              </li>
            </ul>
          </div>

          {/* Finance snapshot */}
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-4">
            <h2 className="text-base font-semibold mb-3">Finance Snapshot</h2>

            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-3">
                <p className="text-xs text-slate-400 mb-1">Expected income</p>
                <p className="font-semibold">₹26.4 L</p>
              </div>
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-3">
                <p className="text-xs text-slate-400 mb-1">Expected expense</p>
                <p className="font-semibold">₹19.2 L</p>
              </div>
            </div>

            <div className="text-xs text-slate-400 space-y-1">
              <p>• Vendor payments: 60% of event budget</p>
              <p>• Target margin: 25–30% per event</p>
              <p>• Break-even: ~3 events / month</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-10 text-[11px] text-slate-500 text-center">
          Cofounders: Hardik Vekariya · Shubh Parekh · Dixit Bhuva · Eventura ©
          {new Date().getFullYear()}
        </footer>
      </div>
    </main>
  );
}

import Head from "next/head";
import Link from "next/link";

type LandingProps = {
  /** True when this instance has no workspace yet and the owner still needs to run setup. */
  setupNeeded?: boolean;
};

const SANS = "'Geist', 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";
const MONO = "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const comparison = [
  ["Activity hours copied into a spreadsheet every week", "The in-game script logs every session and checks it against your quota"],
  ["Warnings and bans remembered by whoever was online", "Every case, warning and ban kept on the member’s profile, with evidence"],
  ["Sessions announced by hand in three different channels", "Schedule once, let staff claim slots, and post it to Discord automatically"],
  ["Promotions decided in a DM nobody can find later", "Recommendations your team can vote and comment on, logged in the userbook"],
];

const steps = [
  {
    title: "Create your workspace",
    text: "Enter your Roblox group ID and pick a colour. Your group’s ranks come across as roles straight away.",
  },
  {
    title: "Connect your game",
    text: "Download the activity script from settings and drop it into ServerScriptService. Activity starts showing up the next time staff join.",
  },
  {
    title: "Bring your team in",
    text: "Staff make an account linked to their Roblox username. Their rank decides what they can see, so there’s nothing to hand out.",
  },
];

const features = [
  { title: "Activity", text: "Minutes tracked per person in-game, against the quota you set for each role.", tags: ["Quotas", "Leaderboard", "Weekly resets"] },
  { title: "Sessions", text: "Trainings, shifts and events on one calendar, with slots your staff can claim.", tags: ["Claimable slots", "Recurring", "Discord posts"] },
  { title: "Moderation", text: "In-game bans and punishments tracked as cases, with evidence attached.", tags: ["Cases", "Evidence", "Audit log"] },
  { title: "Userbook", text: "Warnings, promotions, demotions and notes on a timeline for every member.", tags: ["Promotions", "Warnings", "Notes"] },
  { title: "Recommendations", text: "Put someone forward for promotion and let the team weigh in before you decide.", tags: ["Votes", "Comments"] },
  { title: "Notices", text: "Staff log time away, so a quiet week isn’t mistaken for a missing one.", tags: ["Inactivity", "Approvals"] },
  { title: "Docs and policies", text: "Handbooks and guides your team can find, and policies they sign to say they’ve read them.", tags: ["Guides", "Sign-offs"] },
  { title: "Applications", text: "Build an application form, review submissions together and accept or decline in one place.", tags: ["Forms", "Reviews"] },
];

/* Sample data for the product preview. Clearly labelled as made up. */
const previewSessions = [
  { time: "18:00", name: "Staff training", host: "rivermoss", slots: "6/8" },
  { time: "20:30", name: "Weekend shift", host: "noahbuilds", slots: "3/5" },
  { time: "22:00", name: "Interview block", host: "kaicodes", slots: "2/2" },
];
const previewLog = [
  { who: "pixelharbor", what: "promoted to Senior Moderator" },
  { who: "mapleraid", what: "warning logged, case #214" },
  { who: "sunnyvolt", what: "inactivity notice approved" },
];

export default function Landing({ setupNeeded = false }: LandingProps) {
  const primaryHref = setupNeeded ? "/welcome" : "/login";
  const primaryLabel = setupNeeded ? "Set up Crewbase" : "Log in";

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white antialiased" style={{ fontFamily: SANS }}>
      <Head>
        <title>Crewbase - Home base for your Roblox staff team</title>
        <meta
          name="description"
          content="Crewbase helps Roblox groups run their staff team: activity, sessions, moderation and promotions in one workspace."
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap"
        />
      </Head>

      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#0a0a0b]/85 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" aria-label="Crewbase home" className="flex items-center">
            <img src="/wlogo.svg" alt="Crewbase" className="h-6 w-auto" />
          </Link>
          <div className="flex items-center gap-6">
            <a href="#features" className="hidden text-sm text-zinc-400 hover:text-white sm:block">Features</a>
            <a href="#how" className="hidden text-sm text-zinc-400 hover:text-white sm:block">How it works</a>
            <Link
              href={primaryHref}
              className="inline-flex h-10 items-center rounded-md border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-white hover:bg-white/[0.08]"
            >
              {primaryLabel}
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 pb-16 pt-20 md:pt-28">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1 pl-1 pr-3 text-xs text-zinc-400">
            <span className="rounded-full bg-[#F28C28]/15 px-2 py-0.5 font-medium text-[#F5A55A]">Roblox</span>
            Staff management for groups of any size
          </div>
          <h1 className="mt-7 max-w-4xl text-[44px] font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl md:text-[80px]">
            Your staff team’s
            <br />
            home base.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-zinc-400">
            Activity, sessions, moderation and promotions for Roblox groups, in one workspace your whole
            team shares.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href={primaryHref}
              className="inline-flex h-11 items-center rounded-md bg-[#F28C28] px-5 text-sm font-semibold text-[#0a0a0b] hover:bg-[#f59d45]"
            >
              {setupNeeded ? "Set up Crewbase" : "Get started"}
            </Link>
            <a
              href="#features"
              className="inline-flex h-11 items-center rounded-md border border-white/10 px-5 text-sm font-medium text-white hover:bg-white/[0.05]"
            >
              See what’s inside
            </a>
            {setupNeeded ? (
              <span className="text-xs text-zinc-500">The first person to finish setup becomes the owner.</span>
            ) : (
              <span className="text-xs text-zinc-500">Free and open source.</span>
            )}
          </div>

          {/* Product preview (built in HTML, sample data) */}
          <div className="mt-16 rounded-xl border border-white/[0.08] bg-[#0f0f11] p-1.5 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)]">
            <div className="overflow-hidden rounded-lg border border-white/[0.06] bg-[#111113]">
              <div className="flex h-9 items-center gap-1.5 border-b border-white/[0.06] px-3">
                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <span className="ml-3 hidden rounded bg-white/[0.04] px-3 py-0.5 text-[11px] text-zinc-500 sm:block" style={{ fontFamily: MONO }}>
                  your-crewbase.app/workspace
                </span>
              </div>
              <div className="flex min-h-[340px]">
                <aside className="hidden w-48 shrink-0 border-r border-white/[0.06] p-3 md:block">
                  <div className="mb-4 flex items-center gap-2 px-2">
                    <img src="/crewbase.png" alt="" aria-hidden="true" className="h-5 w-5 rounded" />
                    <span className="text-[13px] font-medium">Northwind Café</span>
                  </div>
                  {["Home", "Activity", "Sessions", "Moderation", "Staff", "Docs", "Notices"].map((item, i) => (
                    <div
                      key={item}
                      className={`rounded-md px-2 py-1.5 text-[13px] ${i === 0 ? "bg-white/[0.06] text-white" : "text-zinc-500"}`}
                    >
                      {item}
                    </div>
                  ))}
                </aside>
                <div className="min-w-0 flex-1 p-5">
                  <p className="text-[13px] text-zinc-500">Good evening, rivermoss</p>
                  <p className="mt-0.5 text-lg font-semibold tracking-tight">Overview</p>
                  <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
                    {[
                      ["Active now", "12"],
                      ["Hours this week", "148"],
                      ["Quota met", "71%"],
                      ["Open cases", "4"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3">
                        <p className="text-[11px] text-zinc-500">{label}</p>
                        <p className="mt-1 text-xl font-semibold tracking-tight" style={{ fontFamily: MONO }}>{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 grid gap-2 lg:grid-cols-2">
                    <div className="rounded-md border border-white/[0.06] p-3">
                      <p className="mb-2 text-[11px] uppercase tracking-wider text-zinc-500">Today’s sessions</p>
                      {previewSessions.map((s) => (
                        <div key={s.name} className="flex items-center gap-3 border-t border-white/[0.04] py-2 text-[13px] first:border-t-0">
                          <span className="w-11 text-zinc-500" style={{ fontFamily: MONO }}>{s.time}</span>
                          <span className="flex-1 truncate">{s.name}</span>
                          <span className="hidden text-zinc-500 sm:inline">{s.host}</span>
                          <span className="text-zinc-400" style={{ fontFamily: MONO }}>{s.slots}</span>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-md border border-white/[0.06] p-3">
                      <p className="mb-2 text-[11px] uppercase tracking-wider text-zinc-500">Recent activity</p>
                      {previewLog.map((l) => (
                        <div key={l.who} className="flex items-center gap-2 border-t border-white/[0.04] py-2 text-[13px] first:border-t-0">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#F28C28]" />
                          <span className="font-medium">{l.who}</span>
                          <span className="truncate text-zinc-500">{l.what}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-zinc-600">Preview with made-up sample data.</p>
        </section>

        {/* Statement */}
        <section className="border-t border-white/[0.06]">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <p className="max-w-4xl text-3xl font-medium leading-[1.2] tracking-[-0.03em] md:text-[44px]">
              Crewbase replaces the activity spreadsheet, the moderation channel and the promotion DMs.{" "}
              <span className="text-zinc-500">
                One place for your staff, their ranks and their records, ready before your next training.
              </span>
            </p>
            <div className="mt-16 grid gap-10 md:grid-cols-3">
              {[
                ["01", "One workspace", "Members, ranks, sessions and records in a single workspace your whole staff team shares."],
                ["02", "Synced to your group", "Roles come from your Roblox group ranks, so access follows whoever you promote."],
                ["03", "Open source", "Built in the open, so anyone can see how it works and what it stores."],
              ].map(([n, title, text]) => (
                <div key={n} className="border-t border-white/10 pt-5">
                  <p className="text-xs text-zinc-500" style={{ fontFamily: MONO }}>{n}</p>
                  <h3 className="mt-6 font-medium">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Before / after */}
        <section className="border-t border-white/[0.06]">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <h2 className="text-4xl font-semibold leading-[1.05] tracking-[-0.04em] md:text-[56px]">
              Less digging through
              <br />
              <span className="text-zinc-500">old chat threads.</span>
            </h2>
            <div className="mt-12 overflow-hidden rounded-xl border border-white/[0.08]">
              <div className="grid grid-cols-2 border-b border-white/[0.08] bg-white/[0.02] text-[11px] uppercase tracking-wider text-zinc-500" style={{ fontFamily: MONO }}>
                <div className="px-5 py-3">Before</div>
                <div className="border-l border-white/[0.08] px-5 py-3 text-[#F5A55A]">With Crewbase</div>
              </div>
              {comparison.map(([before, after]) => (
                <div key={before} className="grid grid-cols-2 border-t border-white/[0.06] text-sm first:border-t-0">
                  <div className="px-5 py-4 text-zinc-500">{before}</div>
                  <div className="border-l border-white/[0.08] px-5 py-4 text-zinc-200">{after}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-16 border-t border-white/[0.06]">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <h2 className="text-4xl font-semibold leading-[1.05] tracking-[-0.04em] md:text-[56px]">
              Everything your
              <br />
              staff team runs on.
            </h2>
            <p className="mt-5 max-w-xl text-zinc-400">
              The tools most groups stitch together from bots and spreadsheets, built to work with each other.
            </p>
            <div className="mt-12 grid overflow-hidden rounded-xl border border-white/[0.08] sm:grid-cols-2">
              {features.map((f, i) => (
                <div
                  key={f.title}
                  className={`border-white/[0.08] p-7 ${i > 0 ? "border-t" : ""} ${i === 1 ? "sm:border-t-0" : ""} ${i % 2 === 1 ? "sm:border-l" : ""}`}
                >
                  <h3 className="font-medium">{f.title}</h3>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">{f.text}</p>
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {f.tags.map((t) => (
                      <span key={t} className="rounded border border-white/[0.08] px-2 py-0.5 text-xs text-zinc-500">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-16 border-t border-white/[0.06]">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <p className="text-xs uppercase tracking-wider text-zinc-500" style={{ fontFamily: MONO }}>How it works</p>
            <h2 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-[-0.04em] md:text-[56px]">
              Set up in an evening.
            </h2>
            <ol className="mt-12 grid gap-px overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.08] md:grid-cols-3">
              {steps.map((s, i) => (
                <li key={s.title} className="bg-[#0a0a0b] p-7">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-xs text-zinc-300"
                    style={{ fontFamily: MONO }}
                  >
                    {i + 1}
                  </span>
                  <h3 className="mt-8 font-medium">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-white/[0.06]">
          <div className="mx-auto max-w-6xl px-6 py-28">
            <img src="/crewbase-mark-white.svg" alt="" aria-hidden="true" className="h-12 w-12" />
            <h2 className="mt-8 text-5xl font-semibold leading-[1] tracking-[-0.045em] md:text-[84px]">
              Bring your crew home<span className="text-[#F28C28]">.</span>
            </h2>
            <p className="mt-6 max-w-md text-zinc-400">
              Give your staff team one place to clock in, check what’s on and keep the records straight.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href={primaryHref}
                className="inline-flex h-11 items-center rounded-md bg-[#F28C28] px-5 text-sm font-semibold text-[#0a0a0b] hover:bg-[#f59d45]"
              >
                {setupNeeded ? "Set up Crewbase" : "Get started"}
              </Link>
              <a
                href="#features"
                className="inline-flex h-11 items-center rounded-md border border-white/10 px-5 text-sm font-medium text-white hover:bg-white/[0.05]"
              >
                See features
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <img src="/crewbase-mark-white.svg" alt="" aria-hidden="true" className="h-4 w-4" />
            <span className="text-zinc-300">Crewbase</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <p>
            Based on{" "}
            <a
              href="https://github.com/TeamFirefli/firefli"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-zinc-300"
            >
              Firefli
            </a>{" "}
            by Cloudysatrn &amp; Max Croft · GPL-3.0
          </p>
        </div>
      </footer>
    </div>
  );
}

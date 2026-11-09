import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";

export type LandingMode = "login" | "setup" | "loggedIn";

type LandingProps = {
  mode: LandingMode;
  displayName?: string;
  avatar?: string;
};

/*
  Design notes
  - Palette: ink #14213D (logo navy), paper #F5F8FC (cool white), sky #DCE7F6, signal #F28C28 (logo orange), duty #1F9D5C.
  - Type: Bricolage Grotesque for headings (sturdy, a little playful, like the Roblox world), Figtree for text.
  - One memorable thing: the live "on duty" board in the hero. Everything else stays quiet.
*/

const INK = "#14213D";
const SIGNAL = "#F28C28";
const DUTY = "#1F9D5C";
const DISPLAY = "'Bricolage Grotesque', 'Figtree', ui-sans-serif, system-ui, sans-serif";
const TEXT = "'Figtree', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";

type Row = { name: string; role: string; status: "game" | "away" | "off"; minutes: number; quota: number; color: string };

// Sample data for the board. Labelled as made up on the page.
const ROWS: Row[] = [
  { name: "rivermoss", role: "Head moderator", status: "game", minutes: 42, quota: 0.9, color: "#C7E9D5" },
  { name: "pixelharbor", role: "Trainer", status: "game", minutes: 17, quota: 0.64, color: "#FDE3C4" },
  { name: "kaicodes", role: "Moderator", status: "away", minutes: 0, quota: 0.38, color: "#D9E4F7" },
  { name: "mapleraid", role: "Moderator", status: "game", minutes: 6, quota: 0.22, color: "#F6D6DE" },
  { name: "sunnyvolt", role: "Junior staff", status: "off", minutes: 0, quota: 1, color: "#EDE3FB" },
];

function DutyBoard() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const onDuty = ROWS.filter((r) => r.status === "game").length;

  return (
    <figure className="relative">
      <div className="rounded-[28px] bg-white p-2 shadow-[0_30px_80px_-30px_rgba(20,33,61,0.45)] ring-1 ring-[#14213D]/10">
        <div className="rounded-[22px] bg-[#F5F8FC] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[15px] font-semibold" style={{ color: INK, fontFamily: DISPLAY }}>On duty now</p>
              <p className="text-sm text-[#5B6B86]">Northwind Café staff team</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-semibold ring-1 ring-[#14213D]/10" style={{ color: DUTY }}>
              <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:animate-none" style={{ backgroundColor: DUTY }} />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: DUTY }} />
              </span>
              {onDuty} in game
            </span>
          </div>

          <ul className="mt-5 space-y-2">
            {ROWS.map((r) => {
              const live = r.status === "game";
              const total = r.minutes * 60 + (live ? seconds : 0);
              const mm = Math.floor(total / 60);
              const ss = String(total % 60).padStart(2, "0");
              return (
                <li key={r.name} className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2.5 ring-1 ring-[#14213D]/[0.06]">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold" style={{ backgroundColor: r.color, color: INK }} aria-hidden="true">
                    {r.name[0].toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold" style={{ color: INK }}>{r.name}</p>
                    <p className="truncate text-xs text-[#5B6B86]">{r.role}</p>
                  </div>
                  <div className="hidden w-24 sm:block" aria-label={`Weekly quota ${Math.round(r.quota * 100)}%`}>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#DCE7F6]">
                      <div className="h-full rounded-full" style={{ width: `${Math.round(r.quota * 100)}%`, backgroundColor: r.quota >= 1 ? DUTY : INK }} />
                    </div>
                    <p className="mt-1 text-right text-[11px] text-[#5B6B86]">{r.quota >= 1 ? "Quota met" : `${Math.round(r.quota * 100)}% of quota`}</p>
                  </div>
                  <span
                    className="w-[76px] shrink-0 rounded-lg px-2 py-1 text-center text-xs font-semibold tabular-nums"
                    style={
                      live
                        ? { backgroundColor: "#E3F5EB", color: DUTY }
                        : r.status === "away"
                          ? { backgroundColor: "#FDEBD9", color: "#B35F0E" }
                          : { backgroundColor: "#EEF2F8", color: "#5B6B86" }
                    }
                  >
                    {live ? `${mm}:${ss}` : r.status === "away" ? "On break" : "Off today"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-[#5B6B86]">Example board with made-up names. Time in game comes from your Roblox game.</figcaption>
    </figure>
  );
}

const GROUPS: { title: string; blurb: string; items: [string, string][] }[] = [
  {
    title: "See who’s showing up",
    blurb: "Time in game is logged for you, so quotas stop being a guessing game.",
    items: [
      ["Activity tracking", "Your game sends each staff member’s time in game, idle time and messages."],
      ["Quotas and leaderboards", "Set weekly targets per role and see who’s on track."],
      ["Inactivity notices", "Staff log time away, so a quiet week isn’t mistaken for a missing one."],
    ],
  },
  {
    title: "Run the day",
    blurb: "Trainings, shifts and events in one calendar your whole team checks.",
    items: [
      ["Sessions", "Schedule shifts and trainings, let staff claim slots, and post them to Discord."],
      ["Events and RSVPs", "Game nights and meetups with reminders before they start."],
      ["Tasks and team chat", "A shared to-do board and a chat for the whole staff team."],
    ],
  },
  {
    title: "Keep it fair",
    blurb: "Records your leadership can trust, instead of a moderation channel nobody can search.",
    items: [
      ["Moderation cases", "In-game bans and punishments, with screenshots and videos attached."],
      ["Userbook", "Warnings, promotions and notes on one timeline per member."],
      ["Policies", "Rules people sign to show they’ve read them."],
    ],
  },
  {
    title: "Grow your people",
    blurb: "Help good staff get better, and make sure they’re noticed.",
    items: [
      ["Trainings and certifications", "Track who’s trained for what, with renewal reminders."],
      ["Reviews and recommendations", "Performance reviews and promotion votes the team can weigh in on."],
      ["Kudos and Staff of the Month", "Shout-outs and nominations that keep morale up."],
    ],
  },
];

const STEPS: [string, string][] = [
  ["Create your workspace", "Enter your Roblox group ID. Your group’s ranks become roles right away."],
  ["Connect your game", "Drop the activity script into ServerScriptService. Time in game starts showing up next time staff play."],
  ["Bring your team in", "Staff sign up with their Roblox username. Their rank decides what they can see."],
];

const FAQ: [string, string][] = [
  ["Does it cost anything?", "No. Every plan is free. Bigger groups can request a higher plan, or unlock one as they grow."],
  ["Do staff need to install anything?", "No. Crewbase works in the browser. Only the game owner adds the activity script."],
  ["Who can see our records?", "Your workspace members, based on the roles you set, plus a small Crewbase team for support and safety."],
  ["Is it made by Roblox?", "No. Crewbase is an independent project that works with Roblox groups and games."],
];

export default function Landing({ mode, displayName, avatar }: LandingProps) {
  const primary =
    mode === "loggedIn"
      ? { href: "/workspaces", label: "Open your workspace" }
      : mode === "setup"
        ? { href: "/welcome", label: "Set up Crewbase" }
        : { href: "/login", label: "Get started free" };

  const btnPrimary =
    "inline-flex h-12 items-center justify-center rounded-2xl px-6 text-[15px] font-semibold text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
  const btnQuiet =
    "inline-flex h-12 items-center justify-center rounded-2xl px-6 text-[15px] font-semibold ring-1 ring-[#14213D]/15 transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

  return (
    <div className="min-h-screen bg-[#F5F8FC] antialiased" style={{ fontFamily: TEXT, color: INK }}>
      <Head>
        <title>Crewbase - Home base for your Roblox staff team</title>
        <meta name="description" content="Crewbase helps Roblox groups run their staff team: activity, sessions, moderation and promotions in one workspace." />
        <link rel="canonical" href="https://crewbase.dev/" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Crewbase" />
        <meta property="og:url" content="https://crewbase.dev/" />
        <meta property="og:title" content="Crewbase - Home base for your Roblox staff team" />
        <meta property="og:description" content="Activity, sessions, moderation and promotions for Roblox groups, in one workspace your whole team shares." />
        <meta property="og:image" content="https://crewbase.dev/crewbase.png" />
        <meta name="twitter:card" content="summary" />
        <meta name="theme-color" content="#F5F8FC" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Figtree:wght@400;500;600;700&display=swap"
        />
      </Head>

      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-[#14213D]/[0.07] bg-[#F5F8FC]/85 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Crewbase home">
            <img src="/crewbase.png" alt="" aria-hidden="true" className="h-8 w-8 rounded-lg" />
            <span className="text-lg font-bold tracking-tight" style={{ fontFamily: DISPLAY }}>Crewbase</span>
          </Link>
          <div className="flex items-center gap-1 text-[15px]">
            <a href="#features" className="hidden rounded-lg px-3 py-2 font-medium text-[#3A4A66] hover:text-[#14213D] md:block">Features</a>
            <Link href="/plans" className="hidden rounded-lg px-3 py-2 font-medium text-[#3A4A66] hover:text-[#14213D] md:block">Plans</Link>
            <Link href="/help" className="hidden rounded-lg px-3 py-2 font-medium text-[#3A4A66] hover:text-[#14213D] md:block">Help</Link>
            {mode === "loggedIn" ? (
              <Link href="/workspaces" className="ml-2 flex items-center gap-2 rounded-xl bg-white px-2.5 py-1.5 font-semibold ring-1 ring-[#14213D]/10 hover:ring-[#14213D]/25">
                {avatar && <img src={avatar} alt="" aria-hidden="true" className="h-7 w-7 rounded-full bg-[#DCE7F6] object-cover" />}
                <span className="max-w-[140px] truncate">{displayName || "Your workspaces"}</span>
              </Link>
            ) : (
              <Link href={mode === "setup" ? "/welcome" : "/login"} className="ml-2 rounded-xl px-3 py-2 font-semibold hover:bg-white">
                {mode === "setup" ? "Set up" : "Log in"}
              </Link>
            )}
          </div>
        </nav>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:pt-20">
          <div>
            {mode === "loggedIn" && displayName && (
              <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-medium ring-1 ring-[#14213D]/10">
                Welcome back, {displayName}
              </p>
            )}
            <h1 className="text-[44px] font-extrabold leading-[1.02] tracking-[-0.035em] sm:text-6xl lg:text-[68px]" style={{ fontFamily: DISPLAY }}>
              Know who’s on shift, who’s slacking, and who deserves a promotion.
            </h1>
            <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-[#3A4A66]">
              Crewbase is a free home base for Roblox group staff teams. Activity from your game, sessions, moderation records and
              promotions, all in one place your whole team shares.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={primary.href} className={`${btnPrimary} hover:brightness-110`} style={{ backgroundColor: INK, outlineColor: INK }}>
                {primary.label}
              </Link>
              <a href="#features" className={btnQuiet} style={{ outlineColor: INK }}>
                See what it does
              </a>
            </div>
            {mode === "setup" && <p className="mt-4 text-sm text-[#5B6B86]">The first person to finish setup becomes this site’s owner.</p>}
          </div>
          <DutyBoard />
        </section>

        {/* Features, grouped by the job they do */}
        <section id="features" className="scroll-mt-20 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
            <h2 className="max-w-2xl text-4xl font-bold leading-tight tracking-[-0.03em] sm:text-5xl" style={{ fontFamily: DISPLAY }}>
              Everything your staff team runs on, built to work together.
            </h2>
            <div className="mt-14 divide-y divide-[#14213D]/10">
              {GROUPS.map((g) => (
                <div key={g.title} className="grid gap-6 py-10 first:pt-0 last:pb-0 lg:grid-cols-[1fr_2fr] lg:gap-12">
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight" style={{ fontFamily: DISPLAY }}>{g.title}</h3>
                    <p className="mt-2 max-w-sm text-[#3A4A66]">{g.blurb}</p>
                  </div>
                  <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-3">
                    {g.items.map(([name, text]) => (
                      <div key={name}>
                        <dt className="font-semibold">{name}</dt>
                        <dd className="mt-1 text-[15px] leading-relaxed text-[#5B6B86]">{text}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Setup: a real sequence, so it's numbered */}
        <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
          <h2 className="text-4xl font-bold tracking-[-0.03em] sm:text-5xl" style={{ fontFamily: DISPLAY }}>Up and running in an evening.</h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="relative">
                <span className="text-6xl font-extrabold leading-none" style={{ fontFamily: DISPLAY, color: SIGNAL }} aria-hidden="true">{i + 1}</span>
                <h3 className="mt-4 text-xl font-bold" style={{ fontFamily: DISPLAY }}>{title}</h3>
                <p className="mt-2 leading-relaxed text-[#3A4A66]">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Plans and questions */}
        <section className="bg-[#DCE7F6]">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-2">
            <div>
              <h2 className="text-4xl font-bold tracking-[-0.03em]" style={{ fontFamily: DISPLAY }}>Free for every group.</h2>
              <p className="mt-4 max-w-md text-lg leading-relaxed text-[#3A4A66]">
                Every workspace starts on Starter. Plus and Pro raise limits and add Discord, the API and priority support. Request one
                any time, or unlock it as your group grows.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {[["Starter", "#71717A"], ["Plus", "#3B82F6"], ["Pro", SIGNAL]].map(([n, c]) => (
                  <span key={n} className="rounded-full bg-white px-3 py-1 text-sm font-semibold" style={{ color: c }}>{n}</span>
                ))}
              </div>
              <Link href="/plans" className="mt-6 inline-block font-semibold underline decoration-2 underline-offset-4" style={{ textDecorationColor: SIGNAL }}>
                Compare plans
              </Link>
            </div>
            <dl className="space-y-6">
              {FAQ.map(([q, a]) => (
                <div key={q}>
                  <dt className="text-lg font-bold" style={{ fontFamily: DISPLAY }}>{q}</dt>
                  <dd className="mt-1 leading-relaxed text-[#3A4A66]">{a}</dd>
                </div>
              ))}
              <p>
                <Link href="/help" className="font-semibold underline decoration-2 underline-offset-4" style={{ textDecorationColor: SIGNAL }}>
                  More answers in the help center
                </Link>
              </p>
            </dl>
          </div>
        </section>

        {/* Closing */}
        <section style={{ backgroundColor: INK }}>
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-5 py-20 sm:px-8 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              <img src="/crewbase-mark-white.svg" alt="" aria-hidden="true" className="h-16 w-16" />
              <h2 className="max-w-lg text-3xl font-bold leading-tight tracking-[-0.03em] text-white sm:text-4xl" style={{ fontFamily: DISPLAY }}>
                Give your crew a home base.
              </h2>
            </div>
            <Link href={primary.href} className={`${btnPrimary} hover:brightness-105`} style={{ backgroundColor: SIGNAL, color: INK, outlineColor: "#fff" }}>
              {primary.label}
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-[#F5F8FC]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-sm text-[#5B6B86] sm:px-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/crewbase.png" alt="" aria-hidden="true" className="h-6 w-6 rounded-md" />
            <span className="font-semibold" style={{ color: INK }}>Crewbase</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer">
            <Link href="/plans" className="hover:text-[#14213D]">Plans</Link>
            <Link href="/help" className="hover:text-[#14213D]">Help</Link>
            <Link href="/changelog" className="hover:text-[#14213D]">What’s new</Link>
            <Link href="/status" className="hover:text-[#14213D]">Status</Link>
            <Link href="/terms" className="hover:text-[#14213D]">Terms</Link>
            <Link href="/privacy" className="hover:text-[#14213D]">Privacy</Link>
          </nav>
        </div>
        <p className="mx-auto max-w-6xl px-5 pb-10 text-xs text-[#5B6B86] sm:px-8">
          Crewbase is an independent hobby project, not affiliated with Roblox Corporation. Based on{" "}
          <a href="https://github.com/TeamFirefli/firefli" target="_blank" rel="noopener noreferrer" className="underline">Firefli</a> by Cloudysatrn and
          Max Croft, licensed under GPL-3.0.
        </p>
      </footer>
    </div>
  );
}

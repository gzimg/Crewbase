import Head from "next/head";
import Link from "next/link";
import {
  IconArrowRight,
  IconGift,
  IconSpeakerphone,
  IconPin,
  IconChartBar,
  IconCalendarEvent,
  IconShieldCheck,
  IconBook2,
  IconUserCheck,
  IconFileText,
  IconClock,
  IconClipboardList,
} from "@tabler/icons-react";

export type LandingMode = "login" | "setup" | "loggedIn";

type LandingProps = {
  mode: LandingMode;
  /** Shown in the greeting when the visitor is logged in. */
  displayName?: string;
  avatar?: string;
};

const ACCENT = "#F28C28";

const features = [
  { icon: IconChartBar, label: "Activity", title: "Know who’s putting in the hours", text: "The in-game script tracks time per person and checks it against the quota you set for each role." },
  { icon: IconCalendarEvent, label: "Sessions", title: "One calendar for every training", text: "Schedule shifts, trainings and events, let staff claim slots, and post them to Discord." },
  { icon: IconShieldCheck, label: "Moderation", title: "Cases with the evidence attached", text: "Track in-game bans and punishments, with screenshots and videos kept on the case." },
  { icon: IconBook2, label: "Userbook", title: "Every member’s history in one place", text: "Warnings, promotions, demotions and notes on a timeline your leadership can trust." },
  { icon: IconUserCheck, label: "Recommendations", title: "Promotions the whole team weighs in on", text: "Put someone forward, collect votes and comments, then decide." },
  { icon: IconClock, label: "Notices", title: "Breaks that don’t look like no-shows", text: "Staff log time away and managers approve it, so quotas stay fair." },
  { icon: IconFileText, label: "Docs", title: "Handbooks people actually read", text: "Host your guides and have staff sign the policies they need to follow." },
  { icon: IconClipboardList, label: "Applications", title: "Hiring without the form chaos", text: "Build application forms, review submissions together and accept in one place." },
];

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">{children}</p>;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-zinc-700/70 bg-zinc-800 p-6 ${className}`}>{children}</div>;
}

function IconBadge({ icon: Icon, size = "md" }: { icon: any; size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-14 w-14" : "h-10 w-10";
  const glyph = size === "lg" ? "h-7 w-7" : "h-5 w-5";
  return (
    <span className={`flex ${box} shrink-0 items-center justify-center rounded-full bg-[#F28C28]/15 text-[#F5A55A]`}>
      <Icon className={glyph} aria-hidden="true" />
    </span>
  );
}

export default function Landing({ mode, displayName, avatar }: LandingProps) {
  const primary =
    mode === "loggedIn"
      ? { href: "/workspaces", label: "Open your workspace" }
      : mode === "setup"
        ? { href: "/welcome", label: "Set up Crewbase" }
        : { href: "/login", label: "Get started" };

  return (
    <div className="min-h-screen bg-zinc-900 text-white antialiased">
      <Head>
        <title>Crewbase - Home base for your Roblox staff team</title>
        <meta
          name="description"
          content="Crewbase helps Roblox groups run their staff team: activity, sessions, moderation and promotions in one workspace."
        />
        <link rel="canonical" href="https://crewbase.dev/" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Crewbase" />
        <meta property="og:url" content="https://crewbase.dev/" />
        <meta property="og:title" content="Crewbase - Home base for your Roblox staff team" />
        <meta
          property="og:description"
          content="Activity, sessions, moderation and promotions for Roblox groups, in one workspace your whole team shares."
        />
        <meta property="og:image" content="https://crewbase.dev/crewbase.png" />
        <meta name="twitter:card" content="summary" />
        <meta name="theme-color" content="#18181b" />
      </Head>

      {/* Top bar, styled like the app's own */}
      <header className="sticky top-0 z-20 bg-zinc-800/90 backdrop-blur">
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Crewbase home" className="flex items-center gap-3">
            <img src="/crewbase.png" alt="" aria-hidden="true" className="h-8 w-8 rounded-lg" />
            <span className="text-[15px] font-medium text-zinc-100">Crewbase</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <a href="#features" className="hidden h-9 items-center rounded-lg px-3 text-sm text-zinc-300 hover:bg-zinc-700 sm:flex">
              Features
            </a>
            <a href="#how" className="hidden h-9 items-center rounded-lg px-3 text-sm text-zinc-300 hover:bg-zinc-700 sm:flex">
              How it works
            </a>
            {mode === "loggedIn" ? (
              <Link href="/workspaces" className="flex h-9 items-center gap-2 rounded-lg px-2 text-sm font-medium text-zinc-100 hover:bg-zinc-700">
                {avatar && <img src={avatar} alt="" aria-hidden="true" className="h-7 w-7 rounded-full bg-zinc-600 object-cover" />}
                <span className="hidden sm:inline">{displayName || "Your workspaces"}</span>
              </Link>
            ) : (
              <Link href={mode === "setup" ? "/welcome" : "/login"} className="flex h-9 items-center rounded-lg px-3 text-sm font-medium text-zinc-100 hover:bg-zinc-700">
                {mode === "setup" ? "Set up" : "Log in"}
              </Link>
            )}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Hero */}
        <section className="grid items-start gap-10 pb-16 pt-14 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
          <div className="lg:pt-6">
            <p className="text-lg font-medium text-[#F5A55A]">
              {mode === "loggedIn" && displayName ? `Welcome back, ${displayName}` : "Staff management for Roblox groups"}
            </p>
            <h1 className="mt-3 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-[56px]">
              Your staff team’s home base.
            </h1>
            <div className="mt-6 h-1.5 w-24 rounded-full" style={{ backgroundColor: ACCENT }} />
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-zinc-400">
              Activity, sessions, moderation and promotions for your Roblox group, in one workspace your whole team shares.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={primary.href}
                className="inline-flex h-12 items-center gap-2 rounded-xl px-6 text-[15px] font-semibold text-zinc-900 hover:opacity-90"
                style={{ backgroundColor: ACCENT }}
              >
                {primary.label}
                <IconArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <a
                href="#features"
                className="inline-flex h-12 items-center rounded-xl border border-zinc-700 bg-zinc-800 px-6 text-[15px] font-medium text-zinc-100 hover:bg-zinc-700"
              >
                See what’s inside
              </a>
            </div>
            <p className="mt-4 text-sm text-zinc-500">
              {mode === "setup" ? "The first person to finish setup becomes the owner." : "Free and open source."}
            </p>
          </div>

          {/* Dashboard preview built from the app's own widget styles (sample data) */}
          <div className="space-y-4" aria-label="Preview of a Crewbase dashboard with sample data">
            <Card>
              <Label>Birthdays</Label>
              <div className="mt-4 flex items-center gap-3">
                <IconBadge icon={IconGift} />
                <div>
                  <p className="text-sm font-medium text-zinc-100">rivermoss turns another year older on Friday</p>
                  <p className="text-sm text-zinc-400">Shared with the team automatically</p>
                </div>
              </div>
            </Card>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <Label>Sessions</Label>
                <div className="mt-4 space-y-3">
                  {[
                    ["18:00", "Staff training", "6/8"],
                    ["20:30", "Weekend shift", "3/5"],
                  ].map(([time, name, slots]) => (
                    <div key={name} className="flex items-center gap-3 rounded-xl bg-zinc-900/60 px-3 py-2.5 text-sm">
                      <IconSpeakerphone className="h-4 w-4 text-[#F5A55A]" aria-hidden="true" />
                      <span className="flex-1 truncate text-zinc-100">{name}</span>
                      <span className="tabular-nums text-zinc-400">{time}</span>
                      <span className="tabular-nums text-zinc-500">{slots}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card>
                <Label>Sticky note</Label>
                <div className="mt-4 flex gap-3">
                  <img src="/crewbase.png" alt="" aria-hidden="true" className="h-9 w-9 shrink-0 rounded-full" />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-zinc-100">
                      <IconPin className="h-4 w-4 text-[#F5A55A]" aria-hidden="true" />
                      Leadership
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-400">Quotas reset Sunday. Log your notices before then.</p>
                  </div>
                </div>
              </Card>
            </div>
            <Card>
              <Label>New to the team</Label>
              <div className="mt-4 flex gap-5">
                {["pixelharbor", "mapleraid", "sunnyvolt"].map((name, i) => (
                  <div key={name} className="text-center">
                    <span
                      className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold text-zinc-900"
                      style={{ backgroundColor: ["#D9F99D", "#FDE68A", "#A5F3FC"][i] }}
                      aria-hidden="true"
                    >
                      {name[0].toUpperCase()}
                    </span>
                    <p className="mt-2 text-xs text-zinc-300">{name}</p>
                  </div>
                ))}
              </div>
            </Card>
            <p className="text-center text-xs text-zinc-600">Preview with made-up sample data.</p>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 border-t border-zinc-800 py-20">
          <Label>Features</Label>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Everything your staff team runs on.</h2>
          <p className="mt-4 max-w-xl text-zinc-400">
            The tools most groups stitch together from bots and spreadsheets, built to work with each other.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <Card key={f.label} className="flex flex-col">
                <div className="flex items-center justify-between">
                  <Label>{f.label}</Label>
                  <IconBadge icon={f.icon} />
                </div>
                <h3 className="mt-5 font-semibold text-zinc-100">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.text}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 border-t border-zinc-800 py-20">
          <Label>How it works</Label>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Set up in an evening.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ["Create your workspace", "Enter your Roblox group ID and pick a colour. Your group’s ranks come across as roles straight away."],
              ["Connect your game", "Download the activity script from settings and drop it into ServerScriptService. Activity shows up the next time staff join."],
              ["Bring your team in", "Staff make an account linked to their Roblox username. Their rank decides what they can see."],
            ].map(([title, text], i) => (
              <Card key={title}>
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-zinc-900"
                  style={{ backgroundColor: ACCENT }}
                >
                  {i + 1}
                </span>
                <h3 className="mt-5 font-semibold text-zinc-100">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{text}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Closing call to action */}
        <section className="pb-20">
          <Card className="flex flex-col items-start gap-6 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div className="flex items-center gap-5">
              <img src="/crewbase.png" alt="" aria-hidden="true" className="h-14 w-14 rounded-2xl" />
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Bring your crew home.</h2>
                <p className="mt-1 text-zinc-400">One place to clock in, check what’s on and keep the records straight.</p>
              </div>
            </div>
            <Link
              href={primary.href}
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl px-6 text-[15px] font-semibold text-zinc-900 hover:opacity-90"
              style={{ backgroundColor: ACCENT }}
            >
              {primary.label}
              <IconArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </Card>
        </section>
      </main>

      <footer className="border-t border-zinc-800">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-4">
            <span className="text-zinc-300">© {new Date().getFullYear()} Crewbase</span>
            <Link href="/terms" className="hover:text-zinc-300">Terms</Link>
            <Link href="/privacy" className="hover:text-zinc-300">Privacy</Link>
          </div>
          <p>
            Based on{" "}
            <a href="https://github.com/TeamFirefli/firefli" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-zinc-300">
              Firefli
            </a>{" "}
            by Cloudysatrn &amp; Max Croft · GPL-3.0
          </p>
        </div>
        <p className="mx-auto max-w-6xl px-4 pb-8 text-xs text-zinc-600 sm:px-6">
          Crewbase is an independent hobby project and isn’t affiliated with, endorsed by or sponsored by Roblox Corporation.
        </p>
      </footer>
    </div>
  );
}

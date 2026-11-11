import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import {
  IconArrowRight, IconBrandDiscord, IconClock, IconCalendarEvent, IconShieldCheck, IconUsersGroup,
  IconRobot, IconSparkles, IconChevronDown, IconChecks,
} from "@tabler/icons-react";

export type LandingMode = "login" | "setup" | "loggedIn";
type LandingProps = { mode: LandingMode; displayName?: string; avatar?: string };

const ORANGE = "#F28C28";
const SOURCE = process.env.NEXT_PUBLIC_SOURCE_URL || "https://github.com/TeamFirefli/firefli";
const DISCORD = process.env.NEXT_PUBLIC_DISCORD_INVITE || "";

const FEATURES = [
  { icon: IconClock, title: "Activity from your game", text: "A script in your Roblox game logs each staff member’s time in game, so weekly quotas track themselves." },
  { icon: IconCalendarEvent, title: "Sessions and events", text: "Schedule trainings, shifts and events. Staff claim slots and get reminded before they start." },
  { icon: IconShieldCheck, title: "Moderation records", text: "Cases for in-game bans and warnings, with screenshots and videos kept on the case." },
  { icon: IconUsersGroup, title: "A home for your team", text: "Announcements, team chat, tasks, polls, trainings, reviews and Staff of the Month." },
  { icon: IconRobot, title: "Discord bot", text: "Slash commands for activity, the leaderboard, sessions and events, right in your server." },
  { icon: IconSparkles, title: "Free plans that grow", text: "Every plan is free. Bigger groups can ask for higher limits or unlock them as they grow." },
];

const MORE = [
  "Quotas", "Leaderboards", "Inactivity notices", "Userbook", "Promotions", "Recommendations", "Applications",
  "Docs", "Policies", "Onboarding checklists", "Ideas board", "Kudos", "Alliances", "Saved staff views",
  "Public API", "Bloxlink", "Audit logs", "Ctrl+K search",
];

const FAQ: [string, string][] = [
  ["What is Crewbase?", "A free website for running a Roblox group’s staff team. It brings activity tracking, sessions, moderation, promotions and team tools into one workspace."],
  ["How much does it cost?", "Nothing. Every plan is free. Larger groups can request Plus or Pro for higher limits, also free."],
  ["How does activity tracking work?", "A workspace admin adds our script to the group’s Roblox game. When staff play, their time is sent to Crewbase and counted towards their quota."],
  ["Do my staff need to install anything?", "No. Crewbase runs in the browser, and staff sign up with their Roblox username."],
  ["Can we use it in Discord?", "Yes. Add the Crewbase bot to your server and link it to your workspace for slash commands like /activity and /sessions."],
  ["Is Crewbase open source?", "Yes. It’s licensed under GPL-3.0 and based on Firefli, Orbit and Tovy. The source code is public."],
  ["Is it made by Roblox?", "No. Crewbase is an independent project and isn’t affiliated with Roblox Corporation or Discord."],
];

function Stats() {
  const [s, setS] = useState<{ workspaces: number; members: number; hoursLast30Days: number } | null>(null);
  useEffect(() => {
    fetch("/api/site/stats").then((r) => r.json()).then(setS).catch(() => {});
  }, []);
  // Only show real totals once they're meaningful; otherwise show plain facts instead
  const real = s && s.workspaces >= 10;
  const items = real
    ? [
        [s!.workspaces.toLocaleString(), "workspaces"],
        [s!.members.toLocaleString(), "staff members"],
        [s!.hoursLast30Days.toLocaleString(), "hours tracked this month"],
      ]
    : [
        ["Free", "on every plan"],
        ["Open source", "under GPL-3.0"],
        ["Minutes", "to set up a workspace"],
      ];
  return (
    <dl className="mx-auto mt-14 grid max-w-3xl grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/[0.02]">
      {items.map(([v, l]) => (
        <div key={l} className="px-3 py-5 text-center">
          <dt className="sr-only">{l}</dt>
          <dd className="text-xl font-semibold text-white sm:text-2xl">{v}</dd>
          <dd className="mt-1 text-xs text-zinc-400 sm:text-sm">{l}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function Landing({ mode, displayName, avatar }: LandingProps) {
  const primary =
    mode === "loggedIn" ? { href: "/workspaces", label: "Open your workspace" } : mode === "setup" ? { href: "/welcome", label: "Set up Crewbase" } : { href: "/login", label: "Get started free" };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0B0B0F] text-zinc-300 antialiased">
      <Head>
        <title>Crewbase - Staff management for Roblox groups</title>
        <meta name="description" content="Crewbase is a free, open-source staff management platform for Roblox groups: activity tracking, sessions, moderation, team tools and a Discord bot." />
        <link rel="canonical" href="https://crewbase.dev/" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Crewbase" />
        <meta property="og:url" content="https://crewbase.dev/" />
        <meta property="og:title" content="Crewbase - Staff management for Roblox groups" />
        <meta property="og:description" content="Free, open-source staff management for Roblox groups." />
        <meta property="og:image" content="https://crewbase.dev/screenshots/dashboard.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="theme-color" content="#0B0B0F" />
      </Head>

      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0B0B0F]/90">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" aria-label="Crewbase home"><img src="/wlogo.svg" alt="Crewbase" className="h-7 w-auto" /></Link>
          <div className="flex items-center gap-1 text-sm">
            <a href="#features" className="hidden rounded-lg px-3 py-2 text-zinc-400 hover:text-white md:block">Features</a>
            <Link href="/plans" className="hidden rounded-lg px-3 py-2 text-zinc-400 hover:text-white md:block">Plans</Link>
            <Link href="/bot" className="hidden rounded-lg px-3 py-2 text-zinc-400 hover:text-white md:block">Discord bot</Link>
            <Link href="/help" className="hidden rounded-lg px-3 py-2 text-zinc-400 hover:text-white md:block">Help</Link>
            {mode === "loggedIn" ? (
              <Link href="/workspaces" className="ml-2 flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 font-medium text-white hover:bg-white/5">
                {avatar && <img src={avatar} alt="" aria-hidden="true" className="h-6 w-6 rounded-full bg-zinc-700" />}
                <span className="max-w-[140px] truncate">{displayName || "Your workspaces"}</span>
              </Link>
            ) : (
              <>
                <Link href="/login" className="rounded-lg px-3 py-2 font-medium text-white hover:bg-white/5">Log in</Link>
                <Link href={primary.href} className="ml-1 rounded-lg px-3 py-2 font-semibold text-zinc-900" style={{ backgroundColor: ORANGE }}>Sign up</Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[560px]"
            style={{ background: "radial-gradient(60% 55% at 50% 0%, rgba(242,140,40,0.18), transparent 70%)" }}
          />
          <div className="relative mx-auto max-w-6xl px-5 pb-10 pt-20 text-center sm:pt-28">
            <Link href="/bot" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-sm text-zinc-300 hover:border-white/20">
              <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-zinc-900" style={{ backgroundColor: ORANGE }}>New</span>
              The Crewbase Discord bot is here
              <IconArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <h1 className="mx-auto mt-7 max-w-4xl text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-6xl">
              Run your Roblox staff team from <span style={{ color: ORANGE }}>one place.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
              Crewbase is a free, open-source home for your group’s staff: activity from your game, sessions, moderation, promotions
              and team tools, with a Discord bot to match.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link href={primary.href} className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold text-zinc-900 hover:brightness-110" style={{ backgroundColor: ORANGE }}>
                {primary.label} <IconArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link href="/bot" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-6 py-3 font-semibold text-white hover:bg-white/5">
                <IconBrandDiscord className="h-5 w-5" aria-hidden="true" /> Add the Discord bot
              </Link>
            </div>
            {mode === "setup" && <p className="mt-4 text-sm text-zinc-500">The first person to finish setup becomes this site’s owner.</p>}

            <div className="relative mx-auto mt-16 max-w-5xl">
              <div aria-hidden="true" className="absolute -inset-x-8 -top-8 bottom-0 rounded-[40px] opacity-60 blur-3xl" style={{ background: "radial-gradient(50% 50% at 50% 40%, rgba(242,140,40,0.25), transparent 70%)" }} />
              <picture>
                <source srcSet="/screenshots/dashboard.webp" type="image/webp" />
                <img
                  src="/screenshots/dashboard.jpg"
                  alt="The Crewbase dashboard for a workspace."
                  width={1400}
                  height={953}
                  className="relative w-full rounded-2xl border border-white/10 shadow-2xl"
                />
              </picture>
            </div>
            <Stats />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-5 py-24">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Everything a staff team needs</h2>
              <p className="mt-4 text-zinc-400">Built for Roblox groups, from a handful of moderators to whole departments.</p>
            </div>
            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition-colors hover:border-white/20">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: "rgba(242,140,40,0.12)", color: ORANGE }}>
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-white">{title}</h3>
                  <p className="mt-2 leading-relaxed text-zinc-400">{text}</p>
                </div>
              ))}
            </div>
            <div className="mt-14 text-center">
              <p className="text-sm font-medium text-zinc-500">And plenty more</p>
              <ul className="mx-auto mt-4 flex max-w-4xl flex-wrap justify-center gap-2">
                {MORE.map((m) => (
                  <li key={m} className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-sm text-zinc-300">
                    <IconChecks className="h-4 w-4" style={{ color: ORANGE }} aria-hidden="true" /> {m}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Signature features */}
        <section className="mx-auto max-w-6xl px-5 pb-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold" style={{ color: ORANGE }}>Only on Crewbase</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Fair for staff, not just easy for owners</h2>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border p-7" style={{ borderColor: "rgba(242,140,40,0.35)", backgroundColor: "rgba(242,140,40,0.05)" }}>
              <h3 className="text-xl font-semibold text-white">Promotion paths</h3>
              <p className="mt-3 leading-relaxed text-zinc-300">
                Publish exactly what each promotion takes: time in game, certifications, kudos, reviews and a clean record. Every staff
                member sees a live checklist of their progress, and leaders see who’s ready. No more “why did they get promoted and not me?”
              </p>
            </div>
            <div className="rounded-2xl border p-7" style={{ borderColor: "rgba(242,140,40,0.35)", backgroundColor: "rgba(242,140,40,0.05)" }}>
              <h3 className="text-xl font-semibold text-white">Staff Passport</h3>
              <p className="mt-3 leading-relaxed text-zinc-300">
                A verified staff record members can take with them. When they apply to a new group, they share one link showing their real
                roles, time on the team, certifications and recognition, straight from Crewbase. Off by default, and always their choice.
              </p>
            </div>
          </div>
        </section>

        {/* Setup */}
        <section className="border-y border-white/[0.06] bg-white/[0.015]">
          <div className="mx-auto max-w-6xl px-5 py-24">
            <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">Set up before your next training</h2>
            <ol className="mt-14 grid gap-8 md:grid-cols-3">
              {[
                ["Create your workspace", "Sign up with your Roblox username and enter your group ID. Your ranks come across as roles."],
                ["Connect your game", "Add the activity script to your game from workspace settings. Time in game starts counting next time staff play."],
                ["Bring your team in", "Staff sign up and see what their rank allows. Add the Discord bot to your server too, if you like."],
              ].map(([t, d], i) => (
                <li key={t} className="text-center md:text-left">
                  <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold md:mx-0" style={{ borderColor: ORANGE, color: ORANGE }}>
                    {i + 1}
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-white">{t}</h3>
                  <p className="mt-2 leading-relaxed text-zinc-400">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-5 py-24">
          <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">Questions</h2>
          <div className="mt-10 space-y-3">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group rounded-xl border border-white/10 bg-white/[0.02] px-5 py-4 open:border-white/20">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-white">
                  {q}
                  <IconChevronDown className="h-5 w-5 shrink-0 text-zinc-500 transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="mt-3 leading-relaxed text-zinc-400">{a}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-zinc-500">
            More answers in the <Link href="/help" className="text-white underline underline-offset-4">help center</Link>
            {DISCORD && <>, or ask us on <a href={DISCORD} target="_blank" rel="noopener noreferrer" className="text-white underline underline-offset-4">Discord</a></>}.
          </p>
        </section>

        {/* Built on */}
        <section className="mx-auto max-w-6xl px-5 pb-24" aria-labelledby="credits-heading">
          <div className="rounded-2xl border p-6 sm:p-8" style={{ borderColor: "rgba(242,140,40,0.35)", backgroundColor: "rgba(242,140,40,0.05)" }}>
            <h2 id="credits-heading" className="text-2xl font-semibold text-white">Built on open source</h2>
            <p className="mt-2 max-w-3xl leading-relaxed text-zinc-300">
              Crewbase is a fork of <strong className="text-white">Firefli</strong> by Cloudysatrn and Max Croft, which grew out of{" "}
              <strong className="text-white">Orbit</strong> by Planetary and the original <strong className="text-white">Tovy</strong> project. Thank you to everyone who
              built them. Like them, Crewbase is open source under GPL-3.0.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/credits" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-200">See all credits</Link>
              <a href={SOURCE} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5">View the source code</a>
            </div>
          </div>
        </section>

        {/* Closing */}
        <section className="relative overflow-hidden border-t border-white/[0.06]">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(50% 80% at 50% 100%, rgba(242,140,40,0.16), transparent 70%)" }} />
          <div className="relative mx-auto max-w-3xl px-5 py-24 text-center">
            <img src="/crewbase-mark-white.svg" alt="" aria-hidden="true" className="mx-auto h-14 w-14" />
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-4xl">Give your staff team a home base</h2>
            <p className="mt-4 text-zinc-400">Free for every group. Set up in minutes.</p>
            <Link href={primary.href} className="mt-8 inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold text-zinc-900 hover:brightness-110" style={{ backgroundColor: ORANGE }}>
              {primary.label} <IconArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <img src="/wlogo.svg" alt="Crewbase" className="h-7 w-auto" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-zinc-500">Free, open-source staff management for Roblox groups.</p>
          </div>
          {[
            ["Product", [["Features", "/#features"], ["Plans", "/plans"], ["Discord bot", "/bot"], ["What’s new", "/changelog"], ["Status", "/status"]]],
            ["Resources", [["Help center", "/help"], ["Report a problem", "/report"], ["Credits", "/credits"], ["Source code", SOURCE], ...(DISCORD ? [["Discord", DISCORD]] : [])]],
            ["Legal", [["Terms of Service", "/terms"], ["Privacy Policy", "/privacy"], ["License (GPL-3.0)", "https://www.gnu.org/licenses/gpl-3.0.html"]]],
          ].map(([title, links]) => (
            <div key={title as string}>
              <p className="text-sm font-semibold text-white">{title as string}</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {(links as string[][]).map(([label, href]) => (
                  <li key={label}>
                    {href.startsWith("http") ? (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white">{label}</a>
                    ) : (
                      <Link href={href} className="text-zinc-400 hover:text-white">{label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/[0.06]">
          <div className="mx-auto max-w-6xl space-y-2 px-5 py-8 text-xs leading-relaxed text-zinc-500">
            <p>© {new Date().getFullYear()} Crewbase. Crewbase is an independent hobby project based on Firefli, Orbit and Tovy, licensed under the GNU General Public License v3.0.</p>
            <p>
              Crewbase isn’t affiliated with, endorsed by or sponsored by Roblox Corporation, Discord Inc., Bloxlink or any other company or community.
              Roblox is a trademark of Roblox Corporation, and Discord is a trademark of Discord Inc. All other names and logos belong to their owners.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

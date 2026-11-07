import Head from "next/head";
import Link from "next/link";
import {
  IconArrowRight,
  IconUsersGroup,
  IconChartBar,
  IconCalendarEvent,
  IconGavel,
  IconAward,
  IconFileText,
  IconBrandDiscord,
  IconClock,
} from "@tabler/icons-react";

type LandingProps = {
  /** True when this instance has no workspace yet and the owner still needs to run setup. */
  setupNeeded?: boolean;
};

const features = [
  {
    icon: IconUsersGroup,
    title: "Roles synced to your group",
    text: "Create custom roles or sync them straight from your Roblox group, then bulk manage your members.",
  },
  {
    icon: IconChartBar,
    title: "Activity tracking",
    text: "See who’s active in-game, set activity requirements, and track progress against quotas.",
  },
  {
    icon: IconCalendarEvent,
    title: "Sessions",
    text: "Schedule and host sessions, assign roles to staff, and announce them in your Discord.",
  },
  {
    icon: IconGavel,
    title: "Moderation",
    text: "Manage in-game bans and punishments, with cases and evidence kept in one place.",
  },
  {
    icon: IconAward,
    title: "Promotions",
    text: "Warn, promote and demote members, and let your team recommend people for promotion.",
  },
  {
    icon: IconFileText,
    title: "Docs and policies",
    text: "Host your staff guides and have members sign the policies they need to follow.",
  },
  {
    icon: IconClock,
    title: "Inactivity notices",
    text: "Staff can log time away, so you always know who’s on a break and who’s missing.",
  },
  {
    icon: IconBrandDiscord,
    title: "Discord integration",
    text: "Send session announcements, birthdays and workspace updates to your Discord server.",
  },
];

export default function Landing({ setupNeeded = false }: LandingProps) {
  const primaryHref = setupNeeded ? "/welcome" : "/login";
  const primaryLabel = setupNeeded ? "Set up Crewbase" : "Log in";

  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-[#0c1324] dark:text-zinc-100">
      <Head>
        <title>Crewbase - Home base for your Roblox staff team</title>
        <meta
          name="description"
          content="Crewbase helps Roblox groups manage their staff team: roles, activity, sessions, moderation and promotions in one place."
        />
      </Head>

      <header className="border-b border-zinc-200 dark:border-white/10">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="flex items-center" aria-label="Crewbase home">
            <img src="/logo.svg" alt="Crewbase" className="h-8 w-auto dark:hidden" />
            <img src="/wlogo.svg" alt="Crewbase" className="hidden h-8 w-auto dark:block" />
          </Link>
          <Link
            href={primaryHref}
            className="inline-flex min-h-[44px] items-center rounded-lg bg-[#14213D] px-5 text-sm font-semibold text-white hover:bg-[#1d2f57] dark:bg-white dark:text-[#14213D] dark:hover:bg-zinc-200"
          >
            {primaryLabel}
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-[1.2fr_1fr] md:py-24">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#B85A0C] dark:text-[#F5A55A]">
              Staff management for Roblox groups
            </p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              The home base for your staff team.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-zinc-600 dark:text-zinc-300">
              Crewbase brings your roles, activity, sessions, moderation and promotions together, so
              running your group’s staff takes less time and fewer spreadsheets.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={primaryHref}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-lg bg-[#F28C28] px-6 font-semibold text-[#14213D] hover:bg-[#f59d45]"
              >
                {setupNeeded ? "Set up Crewbase" : "Log in to your workspace"}
                <IconArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <a
                href="#features"
                className="inline-flex min-h-[48px] items-center rounded-lg border border-zinc-300 px-6 font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
              >
                See features
              </a>
            </div>
            {setupNeeded && (
              <p className="mt-4 max-w-xl text-sm text-zinc-500 dark:text-zinc-400">
                This Crewbase instance hasn’t been set up yet. The first person to complete setup becomes
                its owner.
              </p>
            )}
          </div>

          <div className="flex justify-center">
            <div className="flex aspect-square w-full max-w-[320px] items-center justify-center rounded-[2.5rem] bg-[#14213D]">
              <img src="/crewbase-mark-white.svg" alt="" aria-hidden="true" className="w-3/4" />
            </div>
          </div>
        </section>

        <section id="features" className="border-t border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
            <h2 className="text-3xl font-bold tracking-tight">Everything your staff team needs</h2>
            <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-300">
              Built for Roblox groups that run real staff teams, from small communities to large
              departments.
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map(({ icon: Icon, title, text }) => (
                <div
                  key={title}
                  className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-[#111a2e]"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#14213D] text-white dark:bg-white/10">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16 text-center md:py-20">
          <h2 className="text-3xl font-bold tracking-tight">Ready to bring your crew together?</h2>
          <div className="mt-8 flex justify-center">
            <Link
              href={primaryHref}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-lg bg-[#14213D] px-6 font-semibold text-white hover:bg-[#1d2f57] dark:bg-[#F28C28] dark:text-[#14213D] dark:hover:bg-[#f59d45]"
            >
              {primaryLabel}
              <IconArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 dark:border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 text-sm text-zinc-500 dark:text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Crewbase</p>
          <p>
            Based on{" "}
            <a
              href="https://github.com/TeamFirefli/firefli"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-zinc-800 dark:hover:text-white"
            >
              Firefli
            </a>{" "}
            by Cloudysatrn &amp; Max Croft, licensed under GPL-3.0.
          </p>
        </div>
      </footer>
    </div>
  );
}

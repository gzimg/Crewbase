import Head from "next/head";
import Link from "next/link";

export type LandingMode = "login" | "setup" | "loggedIn";

type LandingProps = {
  mode: LandingMode;
  displayName?: string;
  avatar?: string;
};

/*
  Kept deliberately plain: the app's own colours and system fonts, a real
  screenshot instead of a mock-up, and short, direct copy. No animations.
*/

const FEATURES: { name: string; text: string }[] = [
  { name: "Activity tracking", text: "A script in your game logs each staff member’s time in game. Set weekly quotas per role." },
  { name: "Sessions", text: "Schedule trainings and shifts. Staff claim slots, and it can post to your Discord." },
  { name: "Moderation", text: "Cases for in-game bans and warnings, with screenshots and videos attached." },
  { name: "Userbook", text: "Every warning, promotion and note for a member, in one place." },
  { name: "Notices", text: "Staff log time away so a quiet week isn’t mistaken for someone going missing." },
  { name: "Docs and policies", text: "Your handbook, plus rules staff sign to say they’ve read." },
  { name: "Team tab", text: "Announcements, chat, events, tasks, polls, kudos and Staff of the Month." },
  { name: "Trainings and reviews", text: "Track certifications and write proper staff reviews." },
];

export default function Landing({ mode, displayName, avatar }: LandingProps) {
  const primary =
    mode === "loggedIn"
      ? { href: "/workspaces", label: "Go to your workspace" }
      : mode === "setup"
        ? { href: "/welcome", label: "Set up Crewbase" }
        : { href: "/login", label: "Sign up" };

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-300 antialiased">
      <Head>
        <title>Crewbase - Staff management for Roblox groups</title>
        <meta name="description" content="Crewbase is a free staff management site for Roblox groups: activity tracking, sessions, moderation and promotions." />
        <link rel="canonical" href="https://crewbase.dev/" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Crewbase" />
        <meta property="og:url" content="https://crewbase.dev/" />
        <meta property="og:title" content="Crewbase - Staff management for Roblox groups" />
        <meta property="og:description" content="Free staff management for Roblox groups: activity tracking, sessions, moderation and promotions." />
        <meta property="og:image" content="https://crewbase.dev/screenshots/dashboard.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="theme-color" content="#18181b" />
      </Head>

      <header className="border-b border-zinc-800">
        <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2 text-white" aria-label="Crewbase home">
            <img src="/crewbase.png" alt="" aria-hidden="true" width={28} height={28} className="h-7 w-7 rounded-md" />
            <span className="font-semibold">Crewbase</span>
          </Link>
          <div className="flex items-center gap-5 text-sm">
            <Link href="/plans" className="hidden hover:text-white sm:inline">Plans</Link>
            <Link href="/help" className="hidden hover:text-white sm:inline">Help</Link>
            {mode === "loggedIn" ? (
              <Link href="/workspaces" className="flex items-center gap-2 font-medium text-white">
                {avatar && <img src={avatar} alt="" aria-hidden="true" width={24} height={24} className="h-6 w-6 rounded-full bg-zinc-700" />}
                {displayName || "Your workspaces"}
              </Link>
            ) : (
              <Link href={mode === "setup" ? "/welcome" : "/login"} className="font-medium text-white">
                {mode === "setup" ? "Set up" : "Log in"}
              </Link>
            )}
          </div>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-5 pt-16 sm:pt-24">
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
            Staff management for Roblox groups.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-400">
            Crewbase tracks your staff’s time in game, organises your sessions and keeps your moderation records in one place.
            It’s free, and you can set it up for your group in about an evening.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href={primary.href}
              className="rounded-md bg-[#F28C28] px-5 py-2.5 font-semibold text-zinc-900 hover:bg-[#f59d45] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {primary.label}
            </Link>
            <Link href="/help" className="font-medium text-white underline-offset-4 hover:underline">
              How does it work?
            </Link>
          </div>
          {mode === "setup" && <p className="mt-4 text-sm text-zinc-500">The first person to finish setup becomes this site’s owner.</p>}

          <picture>
            <source srcSet="/screenshots/dashboard.webp" type="image/webp" />
            <img
              src="/screenshots/dashboard.jpg"
              alt="The Crewbase dashboard for a workspace, showing the sidebar, upcoming birthdays and new team members."
              width={1400}
              height={953}
              className="mt-14 w-full rounded-lg border border-zinc-700"
            />
          </picture>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-20">
          <h2 className="text-2xl font-semibold text-white">What’s in it</h2>
          <dl className="mt-8 grid gap-x-12 gap-y-7 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.name}>
                <dt className="font-medium text-white">{f.name}</dt>
                <dd className="mt-1 leading-relaxed text-zinc-400">{f.text}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="border-t border-zinc-800">
          <div className="mx-auto grid max-w-5xl gap-12 px-5 py-20 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold text-white">Getting started</h2>
              <ol className="mt-6 list-decimal space-y-4 pl-5 leading-relaxed text-zinc-400 marker:text-zinc-500">
                <li><span className="text-white">Sign up</span> with your Roblox username.</li>
                <li><span className="text-white">Create a workspace</span> with your group ID. Your group’s ranks come across as roles.</li>
                <li><span className="text-white">Add the activity script</span> to your game from the workspace settings.</li>
                <li><span className="text-white">Invite your staff.</span> Their rank decides what they can see.</li>
              </ol>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white">Questions</h2>
              <dl className="mt-6 space-y-5 leading-relaxed">
                <div>
                  <dt className="text-white">Is it free?</dt>
                  <dd className="text-zinc-400">Yes. Larger groups can ask for a <Link href="/plans" className="text-white underline underline-offset-4">higher plan</Link> with bigger limits, also free.</dd>
                </div>
                <div>
                  <dt className="text-white">Who can see our data?</dt>
                  <dd className="text-zinc-400">People in your workspace, based on the roles you set. Details are in the <Link href="/privacy" className="text-white underline underline-offset-4">privacy policy</Link>.</dd>
                </div>
                <div>
                  <dt className="text-white">Is this made by Roblox?</dt>
                  <dd className="text-zinc-400">No. It’s an independent hobby project, built on the open-source Firefli.</dd>
                </div>
              </dl>
              <p className="mt-6"><Link href="/help" className="text-white underline underline-offset-4">More in the help center</Link></p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-800">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Crewbase. Not affiliated with Roblox Corporation.</p>
          <nav className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Footer">
            <Link href="/changelog" className="hover:text-zinc-300">What’s new</Link>
            <Link href="/status" className="hover:text-zinc-300">Status</Link>
            <Link href="/terms" className="hover:text-zinc-300">Terms</Link>
            <Link href="/privacy" className="hover:text-zinc-300">Privacy</Link>
            <a href="https://github.com/TeamFirefli/firefli" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300">Based on Firefli (GPL-3.0)</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

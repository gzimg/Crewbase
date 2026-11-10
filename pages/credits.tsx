import Link from "next/link";
import PublicLayout from "@/components/publiclayout";
import { LEGAL } from "@/utils/legal";

type Credit = { name: string; what: string; href?: string };

const BUILT_ON: Credit[] = [
  { name: "Firefli", what: "by Cloudysatrn and Max Croft. Crewbase is a fork of Firefli.", href: "https://github.com/TeamFirefli/firefli" },
  { name: "Orbit", what: "by Planetary, which Firefli built on." },
  { name: "Tovy", what: "the original open-source project that Orbit and Firefli grew from (2022)." },
];

const PLATFORMS: Credit[] = [
  { name: "Roblox", what: "Group, user and Open Cloud APIs for ranks, profiles and avatars.", href: "https://www.roblox.com" },
  { name: "Discord", what: "Our support server, the Crewbase bot and workspace announcements.", href: "https://discord.com" },
  { name: "Bloxlink", what: "Matching Discord accounts to Roblox accounts.", href: "https://blox.link" },
  { name: "RankGun", what: "Optional group ranking for workspaces that connect it." },
  { name: "Vercel", what: "Hosting, scheduled jobs and file storage.", href: "https://vercel.com" },
  { name: "Neon", what: "Our PostgreSQL database.", href: "https://neon.tech" },
  { name: "Google Fonts", what: "Fonts on some of our public pages.", href: "https://fonts.google.com" },
];

const OPEN_SOURCE: Credit[] = [
  { name: "Next.js", what: "The framework Crewbase runs on.", href: "https://nextjs.org" },
  { name: "React", what: "The user interface.", href: "https://react.dev" },
  { name: "Tailwind CSS", what: "Styling.", href: "https://tailwindcss.com" },
  { name: "Prisma", what: "Talking to the database.", href: "https://www.prisma.io" },
  { name: "PostgreSQL", what: "The database itself.", href: "https://www.postgresql.org" },
  { name: "Tiptap", what: "The docs editor.", href: "https://tiptap.dev" },
  { name: "Chart.js", what: "Activity charts.", href: "https://www.chartjs.org" },
  { name: "Headless UI", what: "Menus and pop-ups.", href: "https://headlessui.com" },
  { name: "Tabler Icons and Hugeicons", what: "Icons across the app.", href: "https://tabler.io/icons" },
  { name: "Inter", what: "by Rasmus Andersson, the typeface in our logo.", href: "https://rsms.me/inter/" },
];

function Section({ title, intro, items }: { title: string; intro?: React.ReactNode; items: Credit[] }) {
  return (
    <section className="mt-12 first:mt-0">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      {intro && <p className="mt-2 max-w-2xl text-zinc-400">{intro}</p>}
      <ul className="mt-4 divide-y divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800">
        {items.map((c) => (
          <li key={c.name} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:gap-6">
            <span className="w-48 shrink-0 font-medium text-white">
              {c.href ? (
                <a href={c.href} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">{c.name}</a>
              ) : (
                c.name
              )}
            </span>
            <span className="text-zinc-400">{c.what}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Credits for the projects, platforms and tools Crewbase is built with. */
export default function CreditsPage() {
  return (
    <PublicLayout title="Credits" intro="Crewbase wouldn’t exist without these projects, platforms and tools. Thank you to everyone behind them.">
      <Section
        title="Built on"
        intro={
          <>
            Crewbase continues the work of these open-source projects. Like them, it’s licensed under the{" "}
            <a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noopener noreferrer" className="text-white underline underline-offset-4">GNU GPL-3.0</a>, and
            our{" "}
            <a href={LEGAL.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-white underline underline-offset-4">source code</a> is public.
          </>
        }
        items={BUILT_ON}
      />
      <Section title="Platforms and services" items={PLATFORMS} />
      <Section title="Open-source tools" items={OPEN_SOURCE} />
      <p className="mt-10 text-sm text-zinc-500">
        Crewbase is an independent hobby project. It isn’t affiliated with, endorsed by or sponsored by Roblox Corporation, Discord
        Inc. or any company listed here. All names and trademarks belong to their owners. Spotted something missing?{" "}
        <Link href="/report" className="underline">Let us know</Link>.
      </p>
    </PublicLayout>
  );
}

import { useState } from "react";
import Link from "next/link";
import PublicLayout from "@/components/publiclayout";
import { LEGAL } from "@/utils/legal";

type Faq = { q: string; a: React.ReactNode; tags: string };

const faqs: { section: string; items: Faq[] }[] = [
  {
    section: "Getting started",
    items: [
      { q: "What is Crewbase?", tags: "about", a: <>Crewbase is a free home base for Roblox group staff teams. It brings activity tracking, sessions, moderation, promotions, docs and more into one shared workspace.</> },
      { q: "Is Crewbase free?", tags: "price cost money", a: <>Yes. Crewbase is a free, open-source hobby project, and every plan is free.</> },
      { q: "How do plans work?", tags: "plan upgrade plus pro limits badge", a: <>Every workspace starts on the default plan. Higher plans raise limits and unlock extras like Discord and the API. A workspace admin can request one from the Plan page in their workspace, Crewbase staff can give one, and workspaces can unlock one automatically as they grow. <Link href="/plans">Compare plans</Link>.</> },
      { q: "How do I join my group’s workspace?", tags: "join member invite", a: <>Create a Crewbase account linked to your Roblox username. If your group’s workspace syncs roles from Roblox ranks, it shows up on your <Link href="/workspaces">workspaces page</Link> once your rank has a role. Otherwise, ask your workspace’s admins to add you.</> },
      { q: "How do I set up a workspace for my group?", tags: "create new group", a: <>On your <Link href="/workspaces">workspaces page</Link>, choose to create a workspace and enter your Roblox group ID. If you don’t see that option, <Link href="/report">contact Crewbase staff</Link>.</> },
      { q: "How old do I need to be?", tags: "age 13 kids", a: <>You must be at least 13. If you’re under 18, a parent or guardian should be okay with you using Crewbase. See our <Link href="/terms">Terms of Service</Link>.</> },
    ],
  },
  {
    section: "Using Crewbase",
    items: [
      { q: "How does activity tracking work?", tags: "hours script game roblox", a: <>A workspace admin downloads the activity script from workspace settings and puts it in ServerScriptService in the group’s game. HTTP requests must be turned on in the game’s settings. When staff play, their time is sent to Crewbase and counted towards their quota.</> },
      { q: "Is there a quick way to get around?", tags: "shortcut keyboard search", a: <>Press <kbd className="rounded border border-zinc-600 px-1">Ctrl</kbd> + <kbd className="rounded border border-zinc-600 px-1">K</kbd> (or <kbd className="rounded border border-zinc-600 px-1">⌘</kbd> + <kbd className="rounded border border-zinc-600 px-1">K</kbd> on a Mac) anywhere in the app to jump to any page or workspace.</> },
      { q: "Who can see my information?", tags: "privacy visible", a: <>People in your workspace, depending on the roles and permissions its owner sets up, plus a small Crewbase site staff team for support and safety. Read the full <Link href="/privacy">Privacy Policy</Link>.</> },
      { q: "Something’s not working. What do I do?", tags: "bug broken error", a: <>Check the <Link href="/status">status page</Link> first. If everything looks fine there, <Link href="/report">report the problem</Link> with what you were doing when it happened.</> },
    ],
  },
  {
    section: "Your account",
    items: [
      { q: "I forgot my password.", tags: "reset login", a: <>Use the <Link href="/forgot-password">password reset page</Link>.</> },
      { q: "How do I download or delete my data?", tags: "export privacy remove", a: <>Go to <Link href="/account">your account page</Link>. You can download your data there and request account deletion. We reply to deletion requests within 30 days.</> },
      { q: "My account was suspended. Can I appeal?", tags: "ban suspended appeal", a: <>Yes. {LEGAL.contactEmail ? <>Email <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a></> : <>Contact Crewbase staff</>} with your Roblox username and why you think the suspension was a mistake.</> },
      { q: "How do I report someone?", tags: "abuse harassment rules", a: <>Use <Link href="/report">Report a problem</Link>. Reports go to Crewbase site staff, not your workspace’s leadership. If someone is in immediate danger, contact local emergency services first.</> },
    ],
  },
];

/** Public help center with searchable answers. */
export default function HelpPage() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = (f: Faq) => !q || `${f.q} ${f.tags}`.toLowerCase().includes(q);
  const visible = faqs.map((s) => ({ ...s, items: s.items.filter(matches) })).filter((s) => s.items.length);

  return (
    <PublicLayout title="Help center" intro="Answers to common questions about Crewbase.">
      <label htmlFor="help-search" className="sr-only">Search help</label>
      <input
        id="help-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for an answer…"
        className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 text-white placeholder:text-zinc-500 focus:border-[#F28C28] focus:outline-none"
      />
      {visible.length === 0 && (
        <p className="mt-8 text-zinc-400">No answers match that. Try different words, or <Link href="/report" className="underline">ask Crewbase staff</Link>.</p>
      )}
      {visible.map((s) => (
        <section key={s.section} className="mt-10">
          <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">{s.section}</h2>
          <div className="mt-3 divide-y divide-zinc-700/70 overflow-hidden rounded-2xl border border-zinc-700/70 bg-zinc-800">
            {s.items.map((f) => (
              <details key={f.q} className="group px-6 py-4" open={!!q}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-zinc-100">
                  {f.q}
                  <span className="text-zinc-500 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <div className="mt-3 leading-relaxed text-zinc-400 [&_a]:text-white [&_a]:underline">{f.a}</div>
              </details>
            ))}
          </div>
        </section>
      ))}
      <div className="mt-12 rounded-2xl border border-zinc-700/70 bg-zinc-800 p-6">
        <p className="font-semibold">Still stuck?</p>
        <p className="mt-1 text-zinc-400">
          <Link href="/report" className="text-white underline">Send a report</Link> to Crewbase staff
          {LEGAL.contactEmail && <> or email <a href={`mailto:${LEGAL.contactEmail}`} className="text-white underline">{LEGAL.contactEmail}</a></>}.
        </p>
      </div>
    </PublicLayout>
  );
}

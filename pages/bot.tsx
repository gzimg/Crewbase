import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import PublicLayout from "@/components/publiclayout";

type Info = { available: boolean; inviteUrl: string | null; commands: { name: string; description: string }[] };

/** Public page for the Crewbase Discord bot. */
export default function BotPage() {
  const [info, setInfo] = useState<Info | null>(null);
  useEffect(() => {
    axios.get("/api/bot-info").then((r) => setInfo(r.data)).catch(() => setInfo({ available: false, inviteUrl: null, commands: [] }));
  }, []);

  return (
    <PublicLayout title="Discord bot" intro="Bring Crewbase into your Discord server. Staff can check their activity, the leaderboard, sessions and events without leaving Discord.">
      <div className="flex flex-wrap items-center gap-3">
        {info?.available && info.inviteUrl ? (
          <a href={info.inviteUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-[#5865F2] px-5 py-2.5 font-semibold text-white hover:bg-[#4752c4]">
            Add to Discord
          </a>
        ) : (
          <p className="text-zinc-400">{info ? "The bot isn’t available yet. Check back soon." : "Loading…"}</p>
        )}
        <Link href="/help" className="font-medium text-white underline underline-offset-4">Need help?</Link>
      </div>

      <h2 className="mt-12 text-xl font-semibold text-white">Setting it up</h2>
      <ol className="mt-4 list-decimal space-y-3 pl-5 text-zinc-400 marker:text-zinc-500">
        <li><span className="text-white">Add the bot</span> to your server with the button above.</li>
        <li><span className="text-white">Get a link code</span> in your Crewbase workspace under <strong className="text-white">Team → Settings</strong> (workspace managers).</li>
        <li><span className="text-white">Run /link</span> in your server and paste the code. You need the Manage Server permission.</li>
        <li><span className="text-white">Staff add their Discord ID</span> to their Crewbase workspace profile, so the bot knows who they are.</li>
      </ol>

      <h2 className="mt-12 text-xl font-semibold text-white">Commands</h2>
      <dl className="mt-4 divide-y divide-zinc-800 overflow-hidden rounded-xl border border-zinc-800">
        {(info?.commands || []).map((c) => (
          <div key={c.name} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:gap-6">
            <dt className="w-32 shrink-0 font-mono text-white">/{c.name}</dt>
            <dd className="text-zinc-400">{c.description}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-6 text-sm text-zinc-500">The bot only reads what it needs to answer commands. It doesn’t read your server’s messages. See the <Link href="/privacy" className="underline">privacy policy</Link>.</p>
    </PublicLayout>
  );
}

import { useEffect, useState } from "react";
import axios from "axios";
import PublicLayout from "@/components/publiclayout";

type Entry = { id: string; title: string; body: string; tag: "new" | "improved" | "fixed"; at: string };

const tagStyles: Record<Entry["tag"], string> = {
  new: "bg-[#F28C28]/15 text-[#F5A55A]",
  improved: "bg-sky-500/15 text-sky-300",
  fixed: "bg-emerald-500/15 text-emerald-300",
};

/** Public list of Crewbase updates, posted by site admins. */
export default function ChangelogPage() {
  const [entries, setEntries] = useState<Entry[] | null>(null);

  useEffect(() => {
    axios.get("/api/site/changelog").then((r) => setEntries(r.data.entries)).catch(() => setEntries([]));
    try {
      localStorage.setItem("crewbase_changelog_seen", new Date().toISOString());
    } catch {}
  }, []);

  return (
    <PublicLayout title="What’s new" intro="New features, improvements and fixes in Crewbase.">
      {entries === null && <p className="text-zinc-500">Loading…</p>}
      {entries?.length === 0 && <p className="text-zinc-400">No updates posted yet. Check back soon.</p>}
      <ol className="space-y-4">
        {entries?.map((e) => (
          <li key={e.id} className="rounded-2xl border border-zinc-700/70 bg-zinc-800 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${tagStyles[e.tag]}`}>{e.tag}</span>
              <time dateTime={e.at} className="text-sm text-zinc-500">
                {new Date(e.at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
              </time>
            </div>
            <h2 className="mt-3 text-xl font-semibold tracking-tight">{e.title}</h2>
            {e.body && <p className="mt-2 whitespace-pre-wrap leading-relaxed text-zinc-400">{e.body}</p>}
          </li>
        ))}
      </ol>
    </PublicLayout>
  );
}

import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import axios from "axios";
import PublicLayout from "@/components/publiclayout";

/** A public, verified Staff Passport. */
export default function PassportPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = router.query.token;
    if (typeof token !== "string") return;
    axios.get(`/api/passport/${token}`).then((r) => setData(r.data.passport)).catch((e) => setError(e?.response?.data?.error || "Couldn’t load this passport"));
  }, [router.query.token]);

  return (
    <PublicLayout title="Staff Passport">
      <Head><meta name="robots" content="noindex" /></Head>
      {error && <p className="text-zinc-400">{error}</p>}
      {!data && !error && <p className="text-zinc-500">Loading…</p>}
      {data && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-zinc-700/70 bg-zinc-800 p-6">
            <img src={data.picture || "/default-avatar.jpg"} alt="" className="h-20 w-20 rounded-full bg-zinc-700 object-cover" />
            <div className="min-w-0 flex-1">
              <p className="text-2xl font-bold text-white">{data.displayName || data.username}</p>
              <a href={`https://www.roblox.com/users/${data.robloxId}/profile`} target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-400 underline">@{data.username} on Roblox</a>
            </div>
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-300">✓ Verified by Crewbase</span>
          </div>
          <p className="text-sm text-zinc-500">
            Everything below comes straight from Crewbase workspace records, not typed in by the person. They chose which communities to include.
            Checked {new Date(data.generatedAt).toLocaleString()}.
          </p>
          {data.workspaces.length === 0 && <p className="text-zinc-400">No communities are included.</p>}
          {data.workspaces.map((w: any) => (
            <div key={w.groupId} className="rounded-2xl border border-zinc-700/70 bg-zinc-800 p-6">
              <div className="flex flex-wrap items-center gap-3">
                {w.groupLogo && <img src={w.groupLogo} alt="" className="h-10 w-10 rounded-lg object-cover" />}
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold text-white">{w.groupName}</p>
                  <p className="text-sm text-zinc-400">{w.roles.join(", ") || "Member"}{w.since ? ` · since ${new Date(w.since).toLocaleDateString(undefined, { month: "long", year: "numeric" })}` : ""}</p>
                </div>
              </div>
              <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-zinc-900/60 p-4"><dt className="text-xs text-zinc-500">Time in game, last 90 days</dt><dd className="mt-1 text-xl font-bold text-white">{w.hoursLast90Days}h</dd></div>
                <div className="rounded-xl bg-zinc-900/60 p-4"><dt className="text-xs text-zinc-500">Kudos from teammates</dt><dd className="mt-1 text-xl font-bold text-white">{w.kudosReceived}</dd></div>
                <div className="rounded-xl bg-zinc-900/60 p-4"><dt className="text-xs text-zinc-500">Staff of the Month</dt><dd className="mt-1 text-xl font-bold text-white">{w.staffOfTheMonth.length ? `🏆 ×${w.staffOfTheMonth.length}` : "–"}</dd></div>
              </dl>
              {w.certifications.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {w.certifications.map((c: any, i: number) => (
                    <span key={i} className="rounded-full border border-zinc-600 px-3 py-1 text-sm text-zinc-200">🎓 {c.name}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PublicLayout>
  );
}

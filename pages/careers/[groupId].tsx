import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import axios from "axios";
import PublicLayout from "@/components/publiclayout";

/** A workspace’s public careers page: open staff positions anyone can see. */
export default function Careers() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const id = router.query.groupId;
    if (typeof id !== "string") return;
    axios.get(`/api/careers/${id}`).then((r) => setData(r.data)).catch(() => setError(true));
  }, [router.query.groupId]);

  return (
    <PublicLayout title={data ? `Join ${data.group.name}` : "Careers"} intro={data ? "Open staff positions. Click Apply to get started." : undefined}>
      <Head>{data && <meta name="description" content={`Open staff positions at ${data.group.name}.`} />}</Head>
      {error && <p className="text-zinc-400">This careers page doesn’t exist.</p>}
      {!data && !error && <p className="text-zinc-500">Loading…</p>}
      {data && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {data.group.logo && <img src={data.group.logo} alt="" className="h-12 w-12 rounded-xl object-cover" />}
            <a href={`https://www.roblox.com/groups/${data.group.id}`} target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-400 underline">View the group on Roblox</a>
          </div>
          {data.positions.length === 0 && <p className="rounded-xl border border-dashed border-zinc-700 p-8 text-center text-zinc-400">No open positions right now. Check back soon!</p>}
          {data.positions.map((p: any) => (
            <div key={p.id} className="rounded-2xl border border-zinc-700/70 bg-zinc-800 p-6">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-white">{p.title}</h2>
                {p.department && <span className="text-sm text-zinc-400">{p.department}</span>}
                <span className="ml-auto text-xs text-zinc-500">{p.openings} spot{p.openings === 1 ? "" : "s"} open</span>
              </div>
              {p.description && <p className="mt-3 whitespace-pre-wrap text-zinc-300">{p.description}</p>}
              {p.requirements && <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-400"><strong className="text-zinc-200">Requirements:</strong> {p.requirements}</p>}
              {p.applyLink && <a href={p.applyLink} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block rounded-lg bg-[#F28C28] px-5 py-2.5 font-semibold text-zinc-900 hover:bg-[#f59d45]">Apply</a>}
            </div>
          ))}
          <p className="pt-4 text-xs text-zinc-500">Powered by Crewbase. Staff management for Roblox groups.</p>
        </div>
      )}
    </PublicLayout>
  );
}

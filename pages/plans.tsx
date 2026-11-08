import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import PublicLayout from "@/components/publiclayout";
import { PlanBadge } from "@/components/planbadge";

type Plan = {
  id: string;
  name: string;
  tagline: string;
  color: string;
  limits: { members: number; evidenceFiles: number; evidenceFileMb: number; apiKeys: number };
  features: string[];
};
type Data = {
  defaultPlan: string;
  auto: { enabled: boolean; toPlan: string; minMembers: number; minAgeDays: number };
  requestsOpen: boolean;
  features: Record<string, string>;
  plans: Plan[];
};

/** Public plan comparison. All plans are free. */
export default function PlansPage() {
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => {
    axios.get("/api/plans").then((r) => setData(r.data)).catch(() => {});
  }, []);

  return (
    <PublicLayout
      title="Plans"
      intro="Every Crewbase plan is free. Workspaces move up by requesting a plan, being given one by Crewbase staff, or automatically as their group grows."
    >
      {!data && <p className="text-zinc-500">Loading…</p>}
      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {data.plans.map((p) => (
              <div key={p.id} className="flex flex-col rounded-2xl border bg-zinc-800 p-6" style={{ borderColor: `${p.color}80` }}>
                <PlanBadge name={p.name} color={p.color} size="md" />
                <p className="mt-4 text-3xl font-bold">Free</p>
                <p className="mt-2 text-sm text-zinc-400">{p.tagline}</p>
                <ul className="mt-5 space-y-2 text-sm text-zinc-300">
                  <li>Up to {p.limits.members.toLocaleString()} members</li>
                  <li>{p.limits.evidenceFiles.toLocaleString()} moderation evidence files</li>
                  <li>Evidence files up to {p.limits.evidenceFileMb} MB</li>
                  {p.features.includes("api") && <li>{p.limits.apiKeys} API key{p.limits.apiKeys === 1 ? "" : "s"}</li>}
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span style={{ color: p.color }} aria-hidden="true">✓</span>
                      {data.features[f] || f}
                    </li>
                  ))}
                </ul>
                <p className="mt-auto pt-6 text-xs text-zinc-500">
                  {p.id === data.defaultPlan
                    ? "Every new workspace starts here."
                    : data.auto.enabled && data.auto.toPlan === p.id
                      ? `Unlocks automatically at ${data.auto.minMembers}+ members after ${data.auto.minAgeDays} days, or on request.`
                      : "Available on request."}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ["Request it", `A workspace admin opens the Plan page in their workspace and tells us about their group.${data.requestsOpen ? "" : " (Requests are closed right now.)"}`],
              ["Get it from staff", "Crewbase staff can give any workspace a plan, sometimes for a set time, like a trial or event."],
              ["Grow into it", data.auto.enabled ? "Workspaces that reach the size and age above move up automatically." : "Automatic upgrades are turned off right now."],
            ].map(([t, d], i) => (
              <div key={t} className="rounded-2xl border border-zinc-700/70 bg-zinc-800 p-6">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F28C28] text-sm font-bold text-zinc-900">{i + 1}</span>
                <h2 className="mt-4 font-semibold">{t}</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{d}</p>
              </div>
            ))}
          </div>

          <p className="mt-10 text-sm text-zinc-400">
            Every workspace shows a plan badge in its colour. Crewbase staff can also give workspaces special badges, like Verified or
            Partner, on any plan. Questions? Visit the <Link href="/help" className="text-white underline">help center</Link>.
          </p>
        </>
      )}
    </PublicLayout>
  );
}

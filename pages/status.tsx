import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import PublicLayout from "@/components/publiclayout";

type Component = { name: string; status: "operational" | "degraded" | "outage" | "maintenance" };

const labels: Record<Component["status"], { text: string; dot: string }> = {
  operational: { text: "Operational", dot: "bg-emerald-400" },
  degraded: { text: "Degraded", dot: "bg-amber-400" },
  outage: { text: "Outage", dot: "bg-red-500" },
  maintenance: { text: "Maintenance", dot: "bg-sky-400" },
};

/** Public status page. */
export default function StatusPage() {
  const [components, setComponents] = useState<Component[] | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    axios
      .get("/api/site/status")
      .then((r) => {
        setComponents(r.data.components);
        setCheckedAt(r.data.checkedAt);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  const worst = failed
    ? "outage"
    : components?.some((c) => c.status === "outage")
      ? "outage"
      : components?.some((c) => c.status === "maintenance")
        ? "maintenance"
        : components?.some((c) => c.status === "degraded")
          ? "degraded"
          : "operational";
  const headline = {
    operational: "All systems operational",
    degraded: "Some things are running slowly",
    outage: "Crewbase is having problems",
    maintenance: "Crewbase is under maintenance",
  }[worst];

  return (
    <PublicLayout title="Status" intro="Live status of the Crewbase website. This page refreshes every minute.">
      <div className="rounded-2xl border border-zinc-700/70 bg-zinc-800 p-6">
        <div className="flex items-center gap-3">
          <span className={`h-3 w-3 rounded-full ${labels[worst as Component["status"]].dot}`} aria-hidden="true" />
          <p className="text-xl font-semibold">{components || failed ? headline : "Checking…"}</p>
        </div>
        {checkedAt && <p className="mt-1 text-sm text-zinc-500">Last checked {new Date(checkedAt).toLocaleTimeString()}</p>}
      </div>
      <ul className="mt-4 divide-y divide-zinc-700/70 overflow-hidden rounded-2xl border border-zinc-700/70 bg-zinc-800">
        {(components || []).map((c) => (
          <li key={c.name} className="flex items-center justify-between gap-4 px-6 py-4">
            <span className="text-zinc-200">{c.name}</span>
            <span className="flex items-center gap-2 text-sm text-zinc-400">
              <span className={`h-2.5 w-2.5 rounded-full ${labels[c.status].dot}`} aria-hidden="true" />
              {labels[c.status].text}
            </span>
          </li>
        ))}
        {failed && <li className="px-6 py-4 text-zinc-400">We couldn’t reach Crewbase’s servers.</li>}
      </ul>
    </PublicLayout>
  );
}

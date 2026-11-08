import { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useRecoilState } from "recoil";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { workspacestate } from "@/state";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import { PlanBadge, CustomBadge } from "@/components/planbadge";

export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));

type Plan = {
  id: "starter" | "plus" | "pro";
  name: string;
  tagline: string;
  color: string;
  limits: { members: number; evidenceFiles: number; evidenceFileMb: number; apiKeys: number };
  features: string[];
};
type Data = {
  plan: Plan & { source: string; since: string; expiresAt: string | null };
  plans: Plan[];
  usage: { members: number; evidenceFiles: number; apiKeys: number };
  badges: { id: string; label: string; color: string; description?: string }[];
  requestsOpen: boolean;
  requests: { id: string; plan: string; status: string; reason: string; createdAt: string; response?: string }[];
};

const FEATURE_LABELS: Record<string, string> = {
  discord: "Discord integration",
  api: "Public API keys",
  bloxlink: "Bloxlink integration",
  priority_support: "Priority support",
  custom_badges: "Eligible for custom badges",
};
const SOURCE_LABELS: Record<string, string> = {
  default: "Every workspace starts here",
  request: "Approved from your request",
  staff: "Given by Crewbase staff",
  auto: "Unlocked automatically as your group grew",
};

const PlanPage: pageWithLayout = () => {
  const router = useRouter();
  const [ws] = useRecoilState(workspacestate);
  const [data, setData] = useState<Data | null>(null);
  const [requestPlan, setRequestPlan] = useState<string>("");
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const id = router.query.id as string;

  const load = useCallback(() => {
    if (!id) return;
    axios.get(`/api/workspace/${id}/plan`).then((r) => setData(r.data)).catch(() => toast.error("Couldn’t load the plan"));
  }, [id]);
  useEffect(load, [load]);

  const currentIndex = data ? data.plans.findIndex((p) => p.id === data.plan.id) : 0;
  const higherPlans = data ? data.plans.slice(currentIndex + 1) : [];
  const pending = data?.requests.find((r) => r.status === "pending");

  useEffect(() => {
    if (higherPlans.length && !requestPlan) setRequestPlan(higherPlans[0].id);
  }, [higherPlans, requestPlan]);

  const send = async () => {
    setSending(true);
    try {
      await axios.post(`/api/workspace/${id}/plan/request`, { plan: requestPlan, reason });
      toast.success("Request sent to Crewbase staff");
      setReason("");
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Something went wrong");
    } finally {
      setSending(false);
    }
  };
  const cancel = async () => {
    try {
      await axios.delete(`/api/workspace/${id}/plan/request`);
      toast.success("Request cancelled");
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Something went wrong");
    }
  };

  if (!data) return <div className="p-8 text-sm text-zinc-500">Loading…</div>;
  const p = data.plan;

  const usageRows: [string, number, number, string?][] = [
    ["Members", data.usage.members, p.limits.members, "Soft limit: we’ll reach out if you go well over"],
    ["Evidence files", data.usage.evidenceFiles, p.limits.evidenceFiles],
    ["API keys", data.usage.apiKeys, p.features.includes("api") ? p.limits.apiKeys : 0],
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <Head>
        <title>{`Plan - ${ws.groupName || "Workspace"}`}</title>
      </Head>

      <div>
        <p className="text-sm font-medium" style={{ color: p.color }}>Your plan</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">{p.name}</h1>
          <PlanBadge name={p.name} color={p.color} size="md" />
          {data.badges.map((b) => <CustomBadge key={b.id} {...b} />)}
        </div>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          {SOURCE_LABELS[p.source] || ""}
          {p.expiresAt && ` · Ends ${new Date(p.expiresAt).toLocaleDateString()}`}
        </p>
        <p className="mt-1 text-sm text-zinc-500">All Crewbase plans are free. Higher plans are given on request, by Crewbase staff, or automatically as your group grows.</p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
        <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">Usage</h2>
        <div className="mt-4 space-y-4">
          {usageRows.map(([label, used, limit, hint]) => {
            const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100;
            const over = used > limit;
            return (
              <div key={label}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">{label}</span>
                  <span className={over ? "font-medium text-red-600 dark:text-red-400" : "text-zinc-500"}>
                    {used} / {limit === 0 ? "not included" : limit}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${label} usage`}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: over || pct >= 90 ? "#DC2626" : p.color }} />
                </div>
                {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
              </div>
            );
          })}
          <p className="text-sm text-zinc-600 dark:text-zinc-300">Largest evidence file: {p.limits.evidenceFileMb} MB</p>
        </div>
      </section>

      <section>
        <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">Compare plans</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          {data.plans.map((plan) => {
            const isCurrent = plan.id === p.id;
            return (
              <div
                key={plan.id}
                className="rounded-2xl border bg-white p-5 dark:bg-zinc-800"
                style={{ borderColor: isCurrent ? plan.color : undefined }}
              >
                <div className="flex items-center justify-between">
                  <PlanBadge name={plan.name} color={plan.color} size="md" />
                  {isCurrent && <span className="text-xs font-medium text-zinc-500">Current</span>}
                </div>
                <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">{plan.tagline}</p>
                <ul className="mt-4 space-y-1.5 text-sm text-zinc-700 dark:text-zinc-300">
                  <li>Up to {plan.limits.members.toLocaleString()} members</li>
                  <li>{plan.limits.evidenceFiles.toLocaleString()} evidence files, {plan.limits.evidenceFileMb} MB each</li>
                  {plan.features.includes("api") && <li>{plan.limits.apiKeys} API key{plan.limits.apiKeys === 1 ? "" : "s"}</li>}
                  {plan.features.map((f) => <li key={f}>✓ {FEATURE_LABELS[f] || f}</li>)}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {higherPlans.length > 0 && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
          <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">Request a higher plan</h2>
          {!ws.isAdmin ? (
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">Ask a workspace admin to request a higher plan.</p>
          ) : pending ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-zinc-700 dark:text-zinc-200">
                Your request for <strong>{data.plans.find((x) => x.id === pending.plan)?.name}</strong> is waiting for Crewbase staff.
              </p>
              <button onClick={cancel} className="h-9 rounded-lg border border-zinc-300 px-3 text-sm dark:border-zinc-600 dark:text-zinc-200">Cancel request</button>
            </div>
          ) : !data.requestsOpen ? (
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">Plan requests are closed right now. Check back later.</p>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-2">
                {higherPlans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setRequestPlan(plan.id)}
                    aria-pressed={requestPlan === plan.id}
                    className="rounded-lg border px-3 py-2 text-sm font-medium dark:text-zinc-100"
                    style={{ borderColor: requestPlan === plan.id ? plan.color : undefined }}
                  >
                    {plan.name}
                  </button>
                ))}
              </div>
              <label htmlFor="plan-reason" className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">Tell us about your group</label>
              <textarea
                id="plan-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                maxLength={1500}
                placeholder="How big is your staff team, what do you use Crewbase for, and what would the higher plan help with?"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
              />
              <button
                disabled={sending || reason.trim().length < 20}
                onClick={send}
                className="h-10 rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-40"
                style={{ backgroundColor: data.plans.find((x) => x.id === requestPlan)?.color || "#18181b" }}
              >
                {sending ? "Sending…" : "Send request"}
              </button>
            </div>
          )}
        </section>
      )}

      {data.requests.length > 0 && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
          <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">Request history</h2>
          <ul className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-700">
            {data.requests.map((r) => (
              <li key={r.id} className="py-3 text-sm">
                <p className="text-zinc-800 dark:text-zinc-200">
                  <strong>{data.plans.find((x) => x.id === r.plan)?.name || r.plan}</strong> · <span className="capitalize">{r.status}</span> ·{" "}
                  <span className="text-zinc-500">{new Date(r.createdAt).toLocaleDateString()}</span>
                </p>
                {r.response && <p className="mt-1 text-zinc-500">Crewbase staff: {r.response}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-center text-xs text-zinc-500">
        See every plan on the public <Link href="/plans" className="underline">plans page</Link>.
      </p>
    </div>
  );
};

PlanPage.layout = workspace;
export default PlanPage;

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));
import { HrShell, useHrMe, LEVELS, isActiveInfraction, StatusPill } from "@/components/hr/hrkit";
import { useTeam, Card, Empty, inputClass, btn, btnPrimary, ago } from "@/components/team/teamkit";

const Appeals: pageWithLayout = () => {
  const router = useRouter();
  const me = useHrMe();
  const t = useTeam("appeals");
  const infractions = useTeam("infractions");
  const canDecide = !!me?.can.cases;
  const [form, setForm] = useState({ infractionId: "", reason: "" });
  const [responses, setResponses] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof router.query.infraction === "string") setForm((f) => ({ ...f, infractionId: router.query.infraction as string }));
  }, [router.query.infraction]);

  const myActive = infractions.items.filter((i) => i.userId === me?.id && isActiveInfraction(i));
  const label = (id: string) => { const i = infractions.items.find((x) => x.id === id); return i ? `${LEVELS[i.level]?.label}: ${i.reason}` : ""; };

  return (
    <HrShell title="Appeals" description={canDecide ? "Review appeals fairly. Overturning removes the infraction; reducing halves its points." : "If you think an infraction was unfair, explain why and HR will review it."}>
      {myActive.length > 0 && (
        <Card className="mb-6 space-y-2">
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">Appeal one of your infractions</p>
          <select aria-label="Infraction" value={form.infractionId} onChange={(e) => setForm({ ...form, infractionId: e.target.value })} className={inputClass}>
            <option value="">Choose an infraction…</option>
            {myActive.map((i) => <option key={i.id} value={i.id}>{LEVELS[i.level]?.label}: {i.reason}</option>)}
          </select>
          <textarea aria-label="Why" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={4} maxLength={3000} placeholder="Explain why you think it should be changed. Stay calm and stick to the facts." className={inputClass} />
          <button disabled={!form.infractionId || form.reason.trim().length < 20} onClick={async () => { if (await t.create({ infractionId: form.infractionId, infractionLabel: label(form.infractionId), reason: form.reason }, "Appeal sent")) setForm({ infractionId: "", reason: "" }); }} className={btnPrimary}>Send appeal</button>
        </Card>
      )}
      {!t.loading && t.items.length === 0 && <Empty>No appeals.</Empty>}
      <div className="space-y-3">
        {t.items.map((a) => (
          <Card key={a.id}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-zinc-900 dark:text-white">{a.createdByName || "Member"}</span>
              <span className="text-xs text-zinc-500">{ago(a.createdAt)}</span>
              <span className="ml-auto"><StatusPill status={a.status === "decided" ? a.decision === "upheld" ? "closed" : "resolved" : "pending"} /></span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">{a.infractionLabel}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">{a.reason}</p>
            {a.status === "decided" && <p className="mt-3 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300"><strong className="capitalize">{a.decision}</strong> by {a.decidedBy}{a.response ? `: ${a.response}` : ""}</p>}
            {canDecide && a.status === "pending" && (
              <div className="mt-3 flex flex-wrap gap-2">
                <input aria-label="Response" value={responses[a.id] || ""} onChange={(e) => setResponses({ ...responses, [a.id]: e.target.value })} placeholder="Explain your decision to them" className={`${inputClass} min-w-[200px] flex-1`} />
                {(["upheld", "reduced", "overturned"] as const).map((d) => (
                  <button key={d} onClick={() => t.act(a.id, "decide", { decision: d, response: responses[a.id] || "" }, `Appeal ${d}`)} className={d === "overturned" ? btnPrimary : btn}>
                    {d === "upheld" ? "Uphold" : d === "reduced" ? "Reduce" : "Overturn"}
                  </button>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </HrShell>
  );
};
Appeals.layout = workspace;
export default Appeals;

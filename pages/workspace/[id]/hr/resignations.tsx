import { useState } from "react";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));
import { HrShell, useHrMe, StatusPill } from "@/components/hr/hrkit";
import { useTeam, Card, Empty, inputClass, btn, btnPrimary, ago } from "@/components/team/teamkit";

const REASONS: Record<string, string> = { time: "Not enough time", school: "School or work", other_group: "Joining another group", not_enjoying: "Not enjoying it anymore", conflict: "Conflict with someone", personal: "Personal reasons", other: "Something else" };

const Resignations: pageWithLayout = () => {
  const me = useHrMe();
  const t = useTeam("resignations");
  const canProcess = !!me?.can.resignations;
  const [form, setForm] = useState({ lastDay: "", reason: "time", wentWell: "", improve: "", wouldReturn: "maybe" });
  const pendingMine = t.items.some((r) => r.createdBy === me?.id && r.status === "received");

  const send = async () => {
    if (!window.confirm("Send your resignation to HR?")) return;
    const ok = await t.create({ ...form, lastDay: new Date(form.lastDay + "T12:00:00").toISOString() }, "Resignation sent");
    if (ok) setForm({ lastDay: "", reason: "time", wentWell: "", improve: "", wouldReturn: "maybe" });
  };

  return (
    <HrShell title="Resignations" description={canProcess ? "Resignations and exit surveys, so leaving is smooth and you learn why people go." : "Leaving the team? Let HR know, and tell us how we could improve."}>
      {!pendingMine && (
        <Card className="mb-6 space-y-2">
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">Resign from the team</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs text-zinc-500">Your last day<input type="date" value={form.lastDay} onChange={(e) => setForm({ ...form, lastDay: e.target.value })} className={inputClass} /></label>
            <label className="text-xs text-zinc-500">Main reason
              <select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className={inputClass}>
                {Object.entries(REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
          </div>
          <textarea aria-label="What went well" value={form.wentWell} onChange={(e) => setForm({ ...form, wentWell: e.target.value })} rows={2} maxLength={2000} placeholder="What went well during your time here? (optional)" className={inputClass} />
          <textarea aria-label="What could improve" value={form.improve} onChange={(e) => setForm({ ...form, improve: e.target.value })} rows={2} maxLength={2000} placeholder="What could we do better? (optional)" className={inputClass} />
          <label className="block text-xs text-zinc-500">Would you come back one day?
            <select value={form.wouldReturn} onChange={(e) => setForm({ ...form, wouldReturn: e.target.value })} className={inputClass}>
              <option value="yes">Yes</option><option value="maybe">Maybe</option><option value="no">No</option>
            </select>
          </label>
          <button disabled={!form.lastDay} onClick={send} className={btnPrimary}>Send resignation</button>
        </Card>
      )}
      {!t.loading && t.items.length === 0 && <Empty>No resignations.</Empty>}
      <div className="space-y-3">
        {t.items.map((r) => (
          <Card key={r.id}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-zinc-900 dark:text-white">{r.createdByName}</span>
              <span className="text-xs text-zinc-500">last day {new Date(r.lastDay).toLocaleDateString()} · {REASONS[r.reason]} · {ago(r.createdAt)}</span>
              <span className="ml-auto"><StatusPill status={r.status} /></span>
            </div>
            {r.wentWell && <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300"><strong>Went well:</strong> {r.wentWell}</p>}
            {r.improve && <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300"><strong>Could improve:</strong> {r.improve}</p>}
            <p className="mt-1 text-xs text-zinc-500">Would return: {r.wouldReturn}</p>
            {r.hrMessage && <p className="mt-2 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300">HR: {r.hrMessage}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {r.createdBy === me?.id && r.status === "received" && <button onClick={() => t.act(r.id, "withdraw", {}, "Resignation withdrawn")} className={btn}>Withdraw</button>}
              {canProcess && r.status === "received" && (
                <button onClick={() => { const message = window.prompt("Message to them (optional):") ?? ""; t.act(r.id, "process", { status: "processed", message }, "Processed"); }} className={btnPrimary}>Mark processed</button>
              )}
            </div>
          </Card>
        ))}
      </div>
      {canProcess && <p className="mt-6 text-xs text-zinc-500">Tip: assign an offboarding checklist from Team → Onboarding, and update their roles once their last day passes.</p>}
    </HrShell>
  );
};
Resignations.layout = workspace;
export default Resignations;

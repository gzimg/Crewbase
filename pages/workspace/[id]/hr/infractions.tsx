import { useState } from "react";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));
import { HrShell, useHrMe, LEVELS, escalation, isActiveInfraction, StatusPill } from "@/components/hr/hrkit";
import { useTeam, useMembers, MemberSelect, Card, Empty, inputClass, btn, btnPrimary, Member } from "@/components/team/teamkit";

const Infractions: pageWithLayout = () => {
  const me = useHrMe();
  const t = useTeam("infractions");
  const members = useMembers();
  const canIssue = !!me?.can.infractions;
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"active" | "all">("active");
  const [form, setForm] = useState<{ member: Member | null; level: string; reason: string; details: string }>({ member: null, level: "verbal", reason: "", details: "" });

  const pointsFor = (userId: string) => t.items.filter((i) => i.userId === userId && isActiveInfraction(i)).reduce((s, i) => s + (i.points || 0), 0);
  const currentPoints = form.member ? pointsFor(form.member.userId) : 0;
  const after = currentPoints + (LEVELS[form.level]?.points || 0);

  const issue = async () => {
    if (!form.member) return;
    const ok = await t.create({ userId: form.member.userId, username: form.member.username, level: form.level, reason: form.reason, details: form.details }, "Infraction issued");
    if (ok) { setForm({ member: null, level: "verbal", reason: "", details: "" }); setOpen(false); }
  };

  const list = t.items.filter((i) => filter === "all" || isActiveInfraction(i));
  const mine = !me?.can.view && !canIssue;

  return (
    <HrShell
      title="Infractions"
      description={mine ? "Infractions on your record. Each one expires after a set time." : "A fair, consistent discipline record. Points add up, expire over time, and suggest the next step."}
      action={canIssue && <button onClick={() => setOpen(!open)} className={btnPrimary}>{open ? "Close" : "Issue infraction"}</button>}
    >
      {open && (
        <Card className="mb-6 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <MemberSelect id="inf-member" members={members} value={form.member?.userId || ""} onChange={(m) => setForm({ ...form, member: m })} />
            <select aria-label="Level" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className={inputClass}>
              {Object.entries(LEVELS).map(([k, v]) => <option key={k} value={k}>{v.label} ({v.points} pt{v.points === 1 ? "" : "s"}{v.days ? `, expires in ${v.days} days` : ", permanent"})</option>)}
            </select>
          </div>
          <input aria-label="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} maxLength={200} placeholder="Reason, e.g. Missed three trainings without notice" className={inputClass} />
          <textarea aria-label="Details" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} rows={3} maxLength={3000} placeholder="What happened, evidence, and what’s expected next (the member can read this)" className={inputClass} />
          {form.member && (
            <p className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300">
              {form.member.username} has <strong>{currentPoints}</strong> active points. After this: <strong>{after}</strong>.{" "}
              <span className={escalation(after).tone}>{escalation(after).label}.</span>
            </p>
          )}
          <button disabled={!form.member || !form.reason.trim()} onClick={issue} className={btnPrimary}>Issue infraction</button>
          <p className="text-xs text-zinc-500">The member is notified, can read the details, and can appeal it.</p>
        </Card>
      )}
      <div className="mb-4 flex gap-2">
        {(["active", "all"] as const).map((f) => <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={filter === f ? btnPrimary : btn}>{f === "active" ? "Active" : "All"}</button>)}
      </div>
      {!t.loading && list.length === 0 && <Empty>{filter === "active" ? "No active infractions." : "No infractions recorded."}</Empty>}
      <div className="space-y-3">
        {list.map((i) => {
          const active = isActiveInfraction(i);
          return (
            <Card key={i.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${LEVELS[i.level]?.tone}`}>{LEVELS[i.level]?.label}</span>
                <span className="font-semibold text-zinc-900 dark:text-white">{i.username}</span>
                <span className="text-xs text-zinc-500">{i.points} pt{i.points === 1 ? "" : "s"}{i.reducedOnAppeal ? " (reduced on appeal)" : ""}</span>
                <span className="ml-auto"><StatusPill status={active ? "active" : i.status === "revoked" ? "revoked" : "expired"} /></span>
              </div>
              <p className="mt-2 font-medium text-zinc-800 dark:text-zinc-200">{i.reason}</p>
              {i.details && <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">{i.details}</p>}
              <p className="mt-3 text-xs text-zinc-500">
                Issued by {i.createdByName || "HR"} on {new Date(i.issuedAt || i.createdAt).toLocaleDateString()}
                {i.expiresAt ? ` · expires ${new Date(i.expiresAt).toLocaleDateString()}` : " · doesn’t expire"}
                {i.acknowledgedAt && " · acknowledged"}
                {i.status === "revoked" && ` · revoked${i.revokedReason ? `: ${i.revokedReason}` : ""}`}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {i.userId === me?.id && !i.acknowledgedAt && active && <button onClick={() => t.act(i.id, "acknowledge", {}, "Acknowledged")} className={btn}>I’ve read this</button>}
                {i.userId === me?.id && active && <a href={`/workspace/${t.id}/hr/appeals?infraction=${i.id}`} className={btn}>Appeal</a>}
                {canIssue && active && (
                  <button onClick={() => { const reason = window.prompt("Why are you revoking this?"); if (reason !== null) t.act(i.id, "revoke", { reason }, "Revoked"); }} className={btn}>Revoke</button>
                )}
                {canIssue && <button onClick={() => window.confirm("Delete this record completely? Revoking keeps a record; deleting doesn’t.") && t.remove(i.id)} className={`${btn} ml-auto`}>Delete</button>}
              </div>
            </Card>
          );
        })}
      </div>
    </HrShell>
  );
};
Infractions.layout = workspace;
export default Infractions;

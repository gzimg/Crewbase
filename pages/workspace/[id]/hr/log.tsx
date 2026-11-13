import { useState } from "react";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));
import { HrShell, useHrMe } from "@/components/hr/hrkit";
import { useTeam, Card, Empty, inputClass, btn } from "@/components/team/teamkit";

const ACTIONS: Record<string, string> = {
  created: "created", edited: "edited", deleted: "deleted", revoke: "revoked", acknowledge: "acknowledged", status: "changed status",
  note: "added a note to", decide: "decided", checkin: "checked in on", outcome: "set the outcome of", goal: "updated a goal on",
  process: "processed", withdraw: "withdrew", evidence: "added evidence to", close: "closed",
};

const HrLog: pageWithLayout = () => {
  const me = useHrMe();
  const t = useTeam("hrlog");
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const types = Array.from(new Set(t.items.map((x) => x.type)));
  const list = t.items.filter((x) => (type === "all" || x.type === type) && (!q || `${x.subject} ${x.actorName} ${x.detail}`.toLowerCase().includes(q.toLowerCase())));

  const exportCsv = () => {
    const cell = (v: unknown) => { let s = String(v ?? ""); if (/^[=+\-@]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
    const rows = [["When", "Who", "Action", "Type", "About", "Detail"], ...list.map((x) => [x.createdAt, x.actorName || "System", ACTIONS[x.action] || x.action, x.typeLabel, x.subject, x.detail])];
    const blob = new Blob([rows.map((r) => r.map(cell).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "crewbase-hr-log.csv";
    a.click();
  };

  if (me && !me.can.view) return <HrShell title="HR log" description=""><Empty>Only people who can view HR records can see the log.</Empty></HrShell>;

  return (
    <HrShell title="HR log" description="An automatic record of everything that happens in HR: who did what, to whom, and when. Entries can’t be edited or deleted." action={<button onClick={exportCsv} className={btn}>Export CSV</button>}>
      <div className="mb-4 flex flex-wrap gap-2">
        <input aria-label="Search the log" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or detail" className={`${inputClass} max-w-xs`} />
        <select aria-label="Type" value={type} onChange={(e) => setType(e.target.value)} className={`${inputClass} w-auto`}>
          <option value="all">Everything</option>
          {types.map((x) => <option key={x} value={x}>{t.items.find((i) => i.type === x)?.typeLabel || x}</option>)}
        </select>
      </div>
      {!t.loading && list.length === 0 && <Empty>Nothing logged yet.</Empty>}
      <Card className="divide-y divide-zinc-200 p-0 dark:divide-zinc-700">
        {list.map((x) => (
          <div key={x.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-5 py-2.5 text-sm">
            <span className="w-36 shrink-0 text-xs tabular-nums text-zinc-500">{new Date(x.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
            <span className="text-zinc-800 dark:text-zinc-200">
              <strong>{x.actorName || "System"}</strong> {ACTIONS[x.action] || x.action} {x.typeLabel?.toLowerCase()}{x.subject ? <> for <strong>{x.subject}</strong></> : ""}
            </span>
            {x.detail && <span className="text-zinc-500">· {x.detail}</span>}
          </div>
        ))}
      </Card>
    </HrShell>
  );
};
HrLog.layout = workspace;
export default HrLog;

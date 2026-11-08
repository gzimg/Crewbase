import { useState } from "react";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));
import { TeamShell, useTeam, useMembers, MemberSelect, Card, inputClass, btn, btnPrimary, Member } from "@/components/team/teamkit";

const COLUMNS = [
  { id: "todo", label: "To do" },
  { id: "doing", label: "In progress" },
  { id: "done", label: "Done" },
];
const PRIORITY: Record<string, string> = {
  high: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  normal: "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200",
  low: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
};

const Tasks: pageWithLayout = () => {
  const t = useTeam("tasks");
  const members = useMembers();
  const [open, setOpen] = useState(false);
  const [mine, setMine] = useState(false);
  const blank = { title: "", description: "", priority: "normal", due: "", assignee: null as Member | null };
  const [form, setForm] = useState(blank);

  const create = async () => {
    const ok = await t.create({
      title: form.title, description: form.description, priority: form.priority,
      due: form.due ? new Date(form.due + "T23:59:00").toISOString() : null,
      assigneeId: form.assignee?.userId || null, assigneeName: form.assignee?.username || null,
    }, "Task added");
    if (ok) { setForm(blank); setOpen(false); }
  };

  const items = t.items.filter((i) => !mine || i.assigneeId === t.me.id || i.createdBy === t.me.id);
  const canMove = (i: any) => t.me.isManager || i.createdBy === t.me.id || i.assigneeId === t.me.id;

  return (
    <TeamShell
      title="Tasks"
      description="A shared board for team to-dos. Assign tasks, set due dates and move them along."
      action={
        <div className="flex gap-2">
          <button onClick={() => setMine(!mine)} aria-pressed={mine} className={mine ? btnPrimary : btn}>My tasks</button>
          <button onClick={() => setOpen(!open)} className={btnPrimary}>{open ? "Close" : "New task"}</button>
        </div>
      }
    >
      {open && (
        <Card className="mb-6 grid gap-2 sm:grid-cols-2">
          <input aria-label="Task" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={160} placeholder="What needs doing?" className={`${inputClass} sm:col-span-2`} />
          <textarea aria-label="Details" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} maxLength={2000} placeholder="Details (optional)" className={`${inputClass} sm:col-span-2`} />
          <MemberSelect id="task-assignee" label="Assign to" members={members} value={form.assignee?.userId || ""} onChange={(m) => setForm({ ...form, assignee: m })} />
          <div className="flex gap-2">
            <select aria-label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputClass}>
              <option value="low">Low priority</option><option value="normal">Normal priority</option><option value="high">High priority</option>
            </select>
            <input aria-label="Due date" type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} className={inputClass} />
          </div>
          <div className="sm:col-span-2"><button disabled={!form.title.trim()} onClick={create} className={btnPrimary}>Add task</button></div>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map((col, ci) => {
          const list = items.filter((i) => (i.status || "todo") === col.id);
          return (
            <section key={col.id} className="rounded-2xl bg-zinc-100 p-3 dark:bg-zinc-800/60" aria-label={col.label}>
              <h2 className="mb-3 flex items-center justify-between px-1 text-sm font-semibold text-zinc-700 dark:text-zinc-200">{col.label}<span className="text-xs font-normal text-zinc-500">{list.length}</span></h2>
              <div className="space-y-2">
                {list.length === 0 && <p className="px-1 py-4 text-center text-xs text-zinc-500">Nothing here</p>}
                {list.map((i) => {
                  const overdue = i.due && i.status !== "done" && new Date(i.due) < new Date();
                  return (
                    <div key={i.id} className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800">
                      <div className="flex items-start gap-2">
                        <p className={`flex-1 text-sm font-medium text-zinc-900 dark:text-white ${i.status === "done" ? "line-through opacity-60" : ""}`}>{i.title}</p>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize ${PRIORITY[i.priority || "normal"]}`}>{i.priority || "normal"}</span>
                      </div>
                      {i.description && <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{i.description}</p>}
                      <p className="mt-2 text-xs text-zinc-500">
                        {i.assigneeName ? `👤 ${i.assigneeName}` : "Unassigned"}
                        {i.due && <span className={overdue ? " font-semibold text-red-600 dark:text-red-400" : ""}> · due {new Date(i.due).toLocaleDateString()}</span>}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {!i.assigneeId && <button onClick={() => t.act(i.id, "claim", {}, "It’s yours")} className={btn}>Take it</button>}
                        {canMove(i) && ci > 0 && <button onClick={() => t.act(i.id, "move", { status: COLUMNS[ci - 1].id })} className={btn} aria-label={`Move to ${COLUMNS[ci - 1].label}`}>←</button>}
                        {canMove(i) && ci < 2 && <button onClick={() => t.act(i.id, "move", { status: COLUMNS[ci + 1].id }, ci === 1 ? "Nice work!" : undefined)} className={btn} aria-label={`Move to ${COLUMNS[ci + 1].label}`}>→</button>}
                        {(t.me.isManager || i.createdBy === t.me.id) && <button onClick={() => window.confirm("Delete this task?") && t.remove(i.id)} className={`${btn} ml-auto`}>Delete</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </TeamShell>
  );
};
Tasks.layout = workspace;
export default Tasks;

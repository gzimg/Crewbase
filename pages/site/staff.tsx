import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useRecoilState } from "recoil";
import { loginState } from "@/state";
import SiteShell, { Panel, StatGrid } from "@/components/siteshell";
import { PlanBadge, CustomBadge } from "@/components/planbadge";
import {
  Badge, Tabs, inputClass, buttonClass, primaryButtonClass, dangerButtonClass, reportCategoryLabels, timeAgo,
} from "@/components/sitebits";

type SiteUser = {
  userId: string; username: string | null; picture: string | null; isOwner: boolean;
  siteRole: "admin" | "staff" | null; banned: boolean; bannedAt: string | null; banReason: string | null; workspaces: number;
};
type SiteWorkspace = {
  groupId: string; groupName: string | null; groupLogo: string | null; ownerId: string | null; ownerName: string | null;
  members: number; lastSynced: string | null; lock: { by: string; at: string; reason: string } | null;
};
type Report = {
  id: string; category: string; status: "open" | "resolved" | "dismissed"; reporterId: string; reporterName: string | null;
  targetUsername?: string; workspaceId?: string; workspaceName: string | null; details: string; createdAt: string;
  handledByName: string | null; handledAt?: string; resolution?: string;
};
type UserDetail = {
  user: SiteUser & { displayName: string | null; registered: boolean };
  memberships: { groupId: string; groupName: string | null; groupLogo: string | null; joinDate: string | null; isAdmin: boolean; roles: string[] }[];
  notes: { id: string; by: string; byName: string | null; at: string; text: string }[];
  reports: { id: string; category: string; status: string; details: string; createdAt: string; reporterId: string }[];
  canExport: boolean;
};

type Tab = "overview" | "reports" | "plans" | "users" | "workspaces";
const errorText = (e: any) => e?.response?.data?.error || "Something went wrong";

export default function SiteStaffPage() {
  const [login] = useRecoilState(loginState);
  const isAdmin = login?.siteRole === "admin";
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<{ users: number; workspaces: number; suspended: number; activeSessions: number } | null>(null);
  const [reportCounts, setReportCounts] = useState({ open: 0, resolved: 0, dismissed: 0 });
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [pendingPlans, setPendingPlans] = useState(0);

  const loadStats = useCallback(() => {
    axios.get("/api/site/overview").then((r) => setStats(r.data.stats)).catch(() => {});
    axios.get("/api/site/reports", { params: { status: "open" } }).then((r) => setReportCounts(r.data.counts)).catch(() => {});
    axios.get("/api/site/plans").then((r) => setPendingPlans(r.data.requests.filter((x: any) => x.status === "pending").length)).catch(() => {});
  }, []);
  useEffect(loadStats, [loadStats]);

  return (
    <SiteShell title="Site staff" description="Reports, users and workspaces across this Crewbase instance." minRole="staff">
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "reports", label: "Reports", count: reportCounts.open },
          { id: "plans", label: "Plans & badges", count: pendingPlans },
          { id: "users", label: "Users" },
          { id: "workspaces", label: "Workspaces" },
        ]}
      />

      {tab === "overview" && (
        <div className="space-y-6">
          <StatGrid
            stats={[
              { label: "Users", value: stats?.users ?? "–" },
              { label: "Workspaces", value: stats?.workspaces ?? "–" },
              { label: "Suspended users", value: stats?.suspended ?? "–" },
              { label: "Active in-game sessions", value: stats?.activeSessions ?? "–" },
            ]}
          />
          <StatGrid
            stats={[
              { label: "Open reports", value: reportCounts.open },
              { label: "Resolved reports", value: reportCounts.resolved },
              { label: "Dismissed reports", value: reportCounts.dismissed },
              { label: "Your role", value: isAdmin ? "Admin" : "Staff" },
            ]}
          />
          <Panel title="Quick guide">
            <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-600 dark:text-zinc-300">
              <li>Work through <strong>Reports</strong> first. Resolve them with a short note so other staff know what you did.</li>
              <li>Open any user in <strong>Users</strong> to see their workspaces, staff notes and reports before you act.</li>
              <li>Suspensions apply to the whole site. Always give a clear reason; it’s saved in the audit log.</li>
              <li>Account deletion requests come in as reports. Pass them to a site admin, who can export the user’s data first.</li>
            </ul>
          </Panel>
        </div>
      )}

      {tab === "reports" && <ReportsTab onChanged={loadStats} onOpenUser={setSelectedUser} />}
      {tab === "plans" && <PlansTab onChanged={loadStats} />}
      {tab === "users" && <UsersTab onOpenUser={setSelectedUser} onChanged={loadStats} />}
      {tab === "workspaces" && <WorkspacesTab isAdmin={isAdmin} />}

      {selectedUser && (
        <UserDrawer userId={selectedUser} onClose={() => setSelectedUser(null)} onChanged={loadStats} />
      )}
    </SiteShell>
  );
}

/* ---------------- Reports ---------------- */

function ReportsTab({ onChanged, onOpenUser }: { onChanged: () => void; onOpenUser: (id: string) => void }) {
  const [status, setStatus] = useState<"open" | "resolved" | "dismissed" | "all">("open");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [replies, setReplies] = useState<{ id: string; title: string; text: string }[]>([]);
  const [newReply, setNewReply] = useState({ title: "", text: "" });
  const [showReplies, setShowReplies] = useState(false);

  const loadReplies = useCallback(() => {
    axios.get("/api/site/saved-replies").then((r) => setReplies(r.data.replies)).catch(() => {});
  }, []);
  useEffect(loadReplies, [loadReplies]);

  const addReply = async () => {
    try {
      await axios.post("/api/site/saved-replies", newReply);
      setNewReply({ title: "", text: "" });
      toast.success("Saved reply added");
      loadReplies();
    } catch (e) {
      toast.error(errorText(e));
    }
  };
  const deleteReply = async (id: string) => {
    try {
      await axios.delete("/api/site/saved-replies", { params: { id } });
      loadReplies();
    } catch (e) {
      toast.error(errorText(e));
    }
  };

  const load = useCallback(() => {
    setLoading(true);
    axios
      .get("/api/site/reports", { params: { status } })
      .then((r) => setReports(r.data.reports))
      .catch((e) => toast.error(errorText(e)))
      .finally(() => setLoading(false));
  }, [status]);
  useEffect(load, [load]);

  const update = async (id: string, next: "open" | "resolved" | "dismissed") => {
    try {
      await axios.post(`/api/site/reports/${id}`, { status: next, resolution: notes[id] || "" });
      toast.success(next === "open" ? "Report reopened" : `Report ${next}`);
      load();
      onChanged();
    } catch (e) {
      toast.error(errorText(e));
    }
  };

  return (
    <Panel
      title="Reports"
      action={
        <select value={status} onChange={(e) => setStatus(e.target.value as any)} aria-label="Filter reports" className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-900 dark:text-white">
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
          <option value="all">All</option>
        </select>
      }
    >
      {loading && reports.length === 0 && <p className="py-6 text-center text-sm text-zinc-500">Loading…</p>}
      <div className="mb-4">
        <button onClick={() => setShowReplies(!showReplies)} className="text-sm font-medium text-zinc-600 underline dark:text-zinc-300">
          {showReplies ? "Hide saved replies" : `Manage saved replies (${replies.length})`}
        </button>
        {showReplies && (
          <div className="mt-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
            <p className="text-xs text-zinc-500">Reusable resolution notes, shared with all site staff.</p>
            <ul className="mt-2 space-y-1">
              {replies.map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-zinc-800 dark:text-zinc-200"><strong>{x.title}</strong> · {x.text}</span>
                  <button onClick={() => deleteReply(x.id)} className="text-xs underline text-zinc-500">Delete</button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <label htmlFor="sr-title" className="sr-only">Saved reply title</label>
              <input id="sr-title" value={newReply.title} onChange={(e) => setNewReply({ ...newReply, title: e.target.value })} maxLength={60} placeholder="Title" className={`${inputClass} w-40`} />
              <label htmlFor="sr-text" className="sr-only">Saved reply text</label>
              <input id="sr-text" value={newReply.text} onChange={(e) => setNewReply({ ...newReply, text: e.target.value })} maxLength={1000} placeholder="Reply text" className={`${inputClass} min-w-[200px] flex-1`} />
              <button disabled={!newReply.title.trim() || !newReply.text.trim()} onClick={addReply} className={primaryButtonClass}>Save</button>
            </div>
          </div>
        )}
      </div>
      {!loading && reports.length === 0 && <p className="py-6 text-center text-sm text-zinc-500">No reports here. Nice.</p>}
      <div className="space-y-3">
        {reports.map((r) => (
          <div key={r.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge tone={r.category === "deletion" ? "red" : r.category === "bug" ? "blue" : "amber"}>{reportCategoryLabels[r.category] || r.category}</Badge>
              <Badge tone={r.status === "open" ? "amber" : r.status === "resolved" ? "green" : "zinc"}>{r.status}</Badge>
              <span className="text-zinc-500 dark:text-zinc-400">
                from{" "}
                <button onClick={() => onOpenUser(r.reporterId)} className="font-medium text-zinc-900 underline dark:text-white">
                  {r.reporterName || r.reporterId}
                </button>{" "}
                · {timeAgo(r.createdAt)}
              </span>
            </div>
            {(r.targetUsername || r.workspaceId) && (
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                {r.targetUsername && <>About user: <strong className="text-zinc-800 dark:text-zinc-200">{r.targetUsername}</strong> </>}
                {r.workspaceId && <>Workspace: <strong className="text-zinc-800 dark:text-zinc-200">{r.workspaceName || r.workspaceId}</strong></>}
              </p>
            )}
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">{r.details}</p>
            {r.status !== "open" ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span>
                  {r.status} by {r.handledByName || "staff"} · {timeAgo(r.handledAt)}
                  {r.resolution && <> · “{r.resolution}”</>}
                </span>
                <button onClick={() => update(r.id, "open")} className={buttonClass}>Reopen</button>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {replies.length > 0 && (
                  <>
                    <label htmlFor={`saved-${r.id}`} className="sr-only">Use a saved reply</label>
                    <select
                      id={`saved-${r.id}`}
                      value=""
                      onChange={(e) => {
                        const reply = replies.find((x) => x.id === e.target.value);
                        if (reply) setNotes({ ...notes, [r.id]: reply.text });
                      }}
                      className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                    >
                      <option value="">Saved reply…</option>
                      {replies.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
                    </select>
                  </>
                )}
                <label htmlFor={`res-${r.id}`} className="sr-only">Resolution note</label>
                <input
                  id={`res-${r.id}`}
                  value={notes[r.id] || ""}
                  onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                  placeholder="What did you do? (optional)"
                  className={`${inputClass} min-w-[200px] flex-1`}
                />
                <button onClick={() => update(r.id, "resolved")} className={primaryButtonClass}>Resolve</button>
                <button onClick={() => update(r.id, "dismissed")} className={buttonClass}>Dismiss</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ---------------- Users ---------------- */

function UsersTab({ onOpenUser, onChanged }: { onOpenUser: (id: string) => void; onChanged: () => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "suspended">("all");
  const [page, setPage] = useState(0);
  const [users, setUsers] = useState<SiteUser[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get("/api/site/users", { params: { q: query, page, filter } });
      setUsers(r.data.users);
      setTotal(r.data.total);
      setPageSize(r.data.pageSize);
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setLoading(false);
    }
  }, [query, page, filter]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Panel
      title={`Users (${total})`}
      action={
        <div className="flex rounded-md border border-zinc-200 p-0.5 text-xs dark:border-zinc-700">
          {(["all", "suspended"] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(0); }}
              className={`rounded px-2.5 py-1 capitalize ${filter === f ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-600 dark:text-zinc-300"}`}
            >
              {f}
            </button>
          ))}
        </div>
      }
    >
      <label htmlFor="site-user-search" className="sr-only">Search users</label>
      <input
        id="site-user-search"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setPage(0); }}
        placeholder="Search by Roblox username or user ID"
        className={inputClass}
      />
      <div className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-700">
        {loading && users.length === 0 && <p className="py-6 text-center text-sm text-zinc-500">Loading…</p>}
        {!loading && users.length === 0 && <p className="py-6 text-center text-sm text-zinc-500">No users found.</p>}
        {users.map((u) => (
          <button key={u.userId} onClick={() => onOpenUser(u.userId)} className="flex w-full items-center gap-3 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-700/40">
            <img src={u.picture || "/default-avatar.jpg"} alt="" className="h-9 w-9 rounded-full bg-zinc-200 object-cover dark:bg-zinc-700" />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-zinc-900 dark:text-white">
                {u.username || "Unknown"}
                {u.isOwner && <Badge tone="amber">Owner</Badge>}
                {!u.isOwner && u.siteRole === "admin" && <Badge tone="amber">Site admin</Badge>}
                {u.siteRole === "staff" && <Badge tone="blue">Site staff</Badge>}
                {u.banned && <Badge tone="red">Suspended</Badge>}
              </p>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                ID {u.userId} · {u.workspaces} workspace{u.workspaces === 1 ? "" : "s"}
                {u.banned && u.banReason ? ` · ${u.banReason}` : ""}
              </p>
            </div>
            <span className="text-xs text-zinc-400">Open →</span>
          </button>
        ))}
      </div>
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
          <span>Page {page + 1} of {pages}</span>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage(page - 1)} className={buttonClass}>Previous</button>
            <button disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} className={buttonClass}>Next</button>
          </div>
        </div>
      )}
    </Panel>
  );
}

function UserDrawer({ userId, onClose, onChanged }: { userId: string; onClose: () => void; onChanged: () => void }) {
  const [data, setData] = useState<UserDetail | null>(null);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [showSuspend, setShowSuspend] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    axios.get(`/api/site/users/${userId}`).then((r) => setData(r.data)).catch((e) => toast.error(errorText(e)));
  }, [userId]);
  useEffect(load, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const run = async (fn: () => Promise<any>, success: string): Promise<boolean> => {
    setBusy(true);
    try {
      await fn();
      toast.success(success);
      load();
      onChanged();
      return true;
    } catch (e) {
      toast.error(errorText(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const u = data?.user;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="User details"
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-xl dark:bg-zinc-800"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={u?.picture || "/default-avatar.jpg"} alt="" className="h-12 w-12 rounded-full bg-zinc-200 object-cover dark:bg-zinc-700" />
            <div>
              <p className="font-semibold text-zinc-900 dark:text-white">{u?.username || "Loading…"}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{u?.displayName} · ID {userId}</p>
            </div>
          </div>
          <button onClick={onClose} className={buttonClass} aria-label="Close">Close</button>
        </div>

        {u && (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              {u.isOwner && <Badge tone="amber">Instance owner</Badge>}
              {!u.isOwner && u.siteRole === "admin" && <Badge tone="amber">Site admin</Badge>}
              {u.siteRole === "staff" && <Badge tone="blue">Site staff</Badge>}
              {u.banned ? <Badge tone="red">Suspended</Badge> : <Badge tone="green">Active</Badge>}
              {!u.registered && <Badge tone="zinc">No account yet</Badge>}
            </div>
            {u.banned && (
              <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
                Suspended {timeAgo(u.bannedAt)}{u.banReason ? `: ${u.banReason}` : ""}
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              {u.banned ? (
                <button disabled={busy} onClick={() => run(() => axios.delete(`/api/site/users/${userId}/suspend`), "Suspension lifted")} className={buttonClass}>
                  Lift suspension
                </button>
              ) : (
                u.siteRole !== "admin" && (
                  <button onClick={() => setShowSuspend(!showSuspend)} className={dangerButtonClass}>Suspend…</button>
                )
              )}
              {data?.canExport && (
                <a href={`/api/site/users/${userId}/export`} className={buttonClass}>Export data</a>
              )}
            </div>
            {showSuspend && !u.banned && (
              <div className="mt-3 flex flex-wrap gap-2">
                <label htmlFor="suspend-reason" className="sr-only">Reason</label>
                <input id="suspend-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Reason (saved in the audit log)" className={`${inputClass} min-w-[200px] flex-1`} />
                <button
                  disabled={busy || !reason.trim()}
                  onClick={() => run(() => axios.post(`/api/site/users/${userId}/suspend`, { reason }), "User suspended").then((ok) => { if (ok) { setShowSuspend(false); setReason(""); } })}
                  className="inline-flex h-9 items-center rounded-lg bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
                >
                  Confirm
                </button>
              </div>
            )}

            <h3 className="mt-8 text-xs font-semibold uppercase tracking-wider text-zinc-500">Workspaces ({data!.memberships.length})</h3>
            <ul className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-700">
              {data!.memberships.length === 0 && <li className="py-2 text-sm text-zinc-500">Not in any workspace.</li>}
              {data!.memberships.map((m) => (
                <li key={m.groupId} className="flex items-center gap-3 py-2.5">
                  <img src={m.groupLogo || "/default-group-logo.svg"} alt="" className="h-7 w-7 rounded object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">{m.groupName || m.groupId}</p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {m.isAdmin ? "Workspace admin · " : ""}{m.roles.join(", ") || "No role"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <h3 className="mt-8 text-xs font-semibold uppercase tracking-wider text-zinc-500">Staff notes</h3>
            <p className="mt-1 text-xs text-zinc-500">Only site staff and admins can see these.</p>
            <div className="mt-3 flex gap-2">
              <label htmlFor="staff-note" className="sr-only">New note</label>
              <input id="staff-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Add a note…" className={`${inputClass} flex-1`} />
              <button
                disabled={busy || !note.trim()}
                onClick={() => run(() => axios.post(`/api/site/users/${userId}/notes`, { text: note }), "Note added").then((ok) => ok && setNote(""))}
                className={primaryButtonClass}
              >
                Add
              </button>
            </div>
            <ul className="mt-3 space-y-2">
              {data!.notes.map((n) => (
                <li key={n.id} className="rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-900/60">
                  <p className="whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">{n.text}</p>
                  <p className="mt-1 flex items-center justify-between text-xs text-zinc-500">
                    <span>{n.byName || n.by} · {timeAgo(n.at)}</span>
                    <button onClick={() => run(() => axios.delete(`/api/site/users/${userId}/notes`, { params: { noteId: n.id } }), "Note deleted")} className="underline">
                      Delete
                    </button>
                  </p>
                </li>
              ))}
            </ul>

            <h3 className="mt-8 text-xs font-semibold uppercase tracking-wider text-zinc-500">Related reports</h3>
            <ul className="mt-2 space-y-2">
              {data!.reports.length === 0 && <li className="text-sm text-zinc-500">None.</li>}
              {data!.reports.map((r) => (
                <li key={r.id} className="text-sm text-zinc-700 dark:text-zinc-300">
                  <Badge tone="zinc">{reportCategoryLabels[r.category] || r.category}</Badge>{" "}
                  <Badge tone={r.status === "open" ? "amber" : "zinc"}>{r.status}</Badge>{" "}
                  {r.reporterId === userId ? "Sent by this user" : "About this user"} · {timeAgo(r.createdAt)}
                  <span className="block truncate text-xs text-zinc-500">{r.details}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>
    </div>
  );
}

/* ---------------- Workspaces ---------------- */

function WorkspacesTab({ isAdmin }: { isAdmin: boolean }) {
  const [workspaces, setWorkspaces] = useState<SiteWorkspace[]>([]);
  const [query, setQuery] = useState("");
  const [locking, setLocking] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(() => {
    axios.get("/api/site/workspaces").then((r) => setWorkspaces(r.data.workspaces)).catch((e) => toast.error(errorText(e)));
  }, []);
  useEffect(load, [load]);

  const lock = async (groupId: string) => {
    try {
      await axios.post(`/api/site/workspaces/${groupId}/lock`, { reason });
      toast.success("Workspace locked");
      setLocking(null);
      setReason("");
      load();
    } catch (e) {
      toast.error(errorText(e));
    }
  };
  const unlock = async (groupId: string) => {
    try {
      await axios.delete(`/api/site/workspaces/${groupId}/lock`);
      toast.success("Workspace unlocked");
      load();
    } catch (e) {
      toast.error(errorText(e));
    }
  };

  const q = query.trim().toLowerCase();
  const shown = workspaces.filter((w) => !q || (w.groupName || "").toLowerCase().includes(q) || w.groupId.includes(q) || (w.ownerName || "").toLowerCase().includes(q));

  return (
    <Panel title={`Workspaces (${workspaces.length})`}>
      <label htmlFor="ws-search" className="sr-only">Search workspaces</label>
      <input id="ws-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by group name, ID or owner" className={inputClass} />
      <div className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-700">
        {shown.length === 0 && <p className="py-6 text-center text-sm text-zinc-500">No workspaces found.</p>}
        {shown.map((w) => (
          <div key={w.groupId} className="py-3">
            <div className="flex flex-wrap items-center gap-3">
              <img src={w.groupLogo || "/default-group-logo.svg"} alt="" className="h-9 w-9 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-zinc-900 dark:text-white">
                  {w.groupName || "Unnamed group"}
                  {w.lock && <Badge tone="red">Locked</Badge>}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Group {w.groupId} · Owner {w.ownerName || "unknown"} · {w.members} members · synced {timeAgo(w.lastSynced)}
                </p>
                {w.lock && <p className="mt-1 text-xs text-red-700 dark:text-red-300">Locked {timeAgo(w.lock.at)}: {w.lock.reason}</p>}
              </div>
              <a href={`https://www.roblox.com/groups/${w.groupId}`} target="_blank" rel="noopener noreferrer" className={buttonClass}>Roblox group</a>
              {isAdmin && (w.lock ? (
                <button onClick={() => unlock(w.groupId)} className={buttonClass}>Unlock</button>
              ) : (
                <button onClick={() => { setLocking(locking === w.groupId ? null : w.groupId); setReason(""); }} className={dangerButtonClass}>Lock…</button>
              ))}
            </div>
            {locking === w.groupId && (
              <div className="mt-3 flex flex-wrap gap-2 sm:pl-12">
                <label htmlFor={`lock-${w.groupId}`} className="sr-only">Reason for locking</label>
                <input id={`lock-${w.groupId}`} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Reason (members won’t be able to open the workspace)" className={`${inputClass} min-w-[220px] flex-1`} />
                <button disabled={!reason.trim()} onClick={() => lock(w.groupId)} className="inline-flex h-9 items-center rounded-lg bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40">
                  Lock workspace
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ---------------- Plans & badges ---------------- */

type PlanOption = { id: string; name: string; color: string };
type PlanWorkspace = {
  groupId: string; groupName: string | null; groupLogo: string | null; members: number;
  plan: string; source: string; expiresAt: string | null;
  badges: { id: string; label: string; color: string; description?: string }[];
};
type PlanRequestRow = {
  id: string; groupId: string; groupName: string | null; plan: string; status: string; reason: string;
  memberCount: number; createdAt: string; requestedByName: string | null; response?: string;
};

function PlansTab({ onChanged }: { onChanged: () => void }) {
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [workspaces, setWorkspaces] = useState<PlanWorkspace[]>([]);
  const [requests, setRequests] = useState<PlanRequestRow[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [endDates, setEndDates] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ plan: "", expiresAt: "", note: "" });
  const [badge, setBadge] = useState({ label: "", color: "#F28C28", description: "" });

  const load = useCallback(() => {
    axios
      .get("/api/site/plans")
      .then((r) => {
        setPlans(r.data.plans);
        setWorkspaces(r.data.workspaces);
        setRequests(r.data.requests);
      })
      .catch((e) => toast.error(errorText(e)));
  }, []);
  useEffect(load, [load]);

  const planInfo = (id: string) => plans.find((p) => p.id === id) || { id, name: id, color: "#71717A" };

  const decide = async (id: string, decision: "approve" | "decline") => {
    try {
      await axios.post("/api/site/plans/requests", { id, decision, response: responses[id] || "", expiresAt: endDates[id] || undefined });
      toast.success(decision === "approve" ? "Approved" : "Declined");
      load();
      onChanged();
    } catch (e) {
      toast.error(errorText(e));
    }
  };

  const assign = async (groupId: string) => {
    try {
      await axios.post("/api/site/plans", { groupId, plan: draft.plan, expiresAt: draft.expiresAt || undefined, note: draft.note });
      toast.success("Plan updated");
      setEditing(null);
      load();
    } catch (e) {
      toast.error(errorText(e));
    }
  };

  const addBadge = async (groupId: string) => {
    try {
      await axios.post("/api/site/plans/badges", { groupId, ...badge });
      toast.success("Badge added");
      setBadge({ label: "", color: "#F28C28", description: "" });
      load();
    } catch (e) {
      toast.error(errorText(e));
    }
  };
  const removeBadge = async (groupId: string, badgeId: string) => {
    try {
      await axios.delete("/api/site/plans/badges", { params: { groupId, badgeId } });
      load();
    } catch (e) {
      toast.error(errorText(e));
    }
  };

  const pending = requests.filter((r) => r.status === "pending");
  const q = query.trim().toLowerCase();
  const shown = workspaces.filter((w) => !q || (w.groupName || "").toLowerCase().includes(q) || w.groupId.includes(q));
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <Panel title={`Plan requests (${pending.length} waiting)`}>
        {pending.length === 0 && <p className="text-sm text-zinc-500">No requests waiting.</p>}
        <div className="space-y-3">
          {pending.map((r) => (
            <div key={r.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium text-zinc-900 dark:text-white">{r.groupName || r.groupId}</span>
                <span className="text-zinc-500">wants</span>
                <PlanBadge name={planInfo(r.plan).name} color={planInfo(r.plan).color} />
                <span className="text-zinc-500">· {r.memberCount} members · by {r.requestedByName || "unknown"} · {timeAgo(r.createdAt)}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">{r.reason}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <label htmlFor={`pr-${r.id}`} className="sr-only">Response</label>
                <input
                  id={`pr-${r.id}`}
                  value={responses[r.id] || ""}
                  onChange={(e) => setResponses({ ...responses, [r.id]: e.target.value })}
                  placeholder="Message to the workspace (required to decline)"
                  className={`${inputClass} min-w-[220px] flex-1`}
                />
                <label htmlFor={`pe-${r.id}`} className="sr-only">Optional end date</label>
                <input
                  id={`pe-${r.id}`}
                  type="date"
                  min={tomorrow}
                  value={endDates[r.id] || ""}
                  onChange={(e) => setEndDates({ ...endDates, [r.id]: e.target.value })}
                  title="Optional end date"
                  className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                />
                <button onClick={() => decide(r.id, "approve")} className={primaryButtonClass}>Approve</button>
                <button onClick={() => decide(r.id, "decline")} className={buttonClass}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Workspace plans and badges">
        <label htmlFor="plan-ws-search" className="sr-only">Search workspaces</label>
        <input id="plan-ws-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search workspaces" className={inputClass} />
        <div className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-700">
          {shown.map((w) => {
            const info = planInfo(w.plan);
            const isOpen = editing === w.groupId;
            return (
              <div key={w.groupId} className="py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <img src={w.groupLogo || "/default-group-logo.svg"} alt="" className="h-9 w-9 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-zinc-900 dark:text-white">
                      {w.groupName || w.groupId}
                      <PlanBadge name={info.name} color={info.color} />
                      {w.badges.map((b) => <CustomBadge key={b.id} {...b} />)}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {w.members} members · {w.source === "default" ? "default plan" : `via ${w.source}`}
                      {w.expiresAt && ` · ends ${new Date(w.expiresAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditing(isOpen ? null : w.groupId);
                      setDraft({ plan: w.plan, expiresAt: "", note: "" });
                      setBadge({ label: "", color: "#F28C28", description: "" });
                    }}
                    className={buttonClass}
                  >
                    {isOpen ? "Close" : "Manage"}
                  </button>
                </div>
                {isOpen && (
                  <div className="mt-3 space-y-4 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900/60 sm:ml-12">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Plan</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <label htmlFor={`pl-${w.groupId}`} className="sr-only">Plan</label>
                        <select id={`pl-${w.groupId}`} value={draft.plan} onChange={(e) => setDraft({ ...draft, plan: e.target.value })} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-white">
                          {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <label htmlFor={`pd-${w.groupId}`} className="sr-only">Optional end date</label>
                        <input id={`pd-${w.groupId}`} type="date" min={tomorrow} value={draft.expiresAt} onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })} title="Optional end date" className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-white" />
                        <label htmlFor={`pn-${w.groupId}`} className="sr-only">Note</label>
                        <input id={`pn-${w.groupId}`} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} maxLength={300} placeholder="Internal note (optional)" className={`${inputClass} min-w-[180px] flex-1`} />
                        <button onClick={() => assign(w.groupId)} className={primaryButtonClass}>Save plan</button>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">Leave the date empty for no end date. When it ends, the workspace goes back to the default plan.</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Custom badges</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {w.badges.length === 0 && <span className="text-sm text-zinc-500">None yet.</span>}
                        {w.badges.map((b) => (
                          <span key={b.id} className="inline-flex items-center gap-1">
                            <CustomBadge {...b} />
                            <button onClick={() => removeBadge(w.groupId, b.id)} className="text-xs text-zinc-500 underline" aria-label={`Remove ${b.label} badge`}>remove</button>
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <label htmlFor={`bl-${w.groupId}`} className="sr-only">Badge name</label>
                        <input id={`bl-${w.groupId}`} value={badge.label} onChange={(e) => setBadge({ ...badge, label: e.target.value })} maxLength={24} placeholder="e.g. Verified, Partner" className={`${inputClass} w-44`} />
                        <label htmlFor={`bc-${w.groupId}`} className="sr-only">Badge colour</label>
                        <input id={`bc-${w.groupId}`} type="color" value={badge.color} onChange={(e) => setBadge({ ...badge, color: e.target.value })} className="h-9 w-12 cursor-pointer rounded border border-zinc-300 dark:border-zinc-600" />
                        <label htmlFor={`bd-${w.groupId}`} className="sr-only">Badge description</label>
                        <input id={`bd-${w.groupId}`} value={badge.description} onChange={(e) => setBadge({ ...badge, description: e.target.value })} maxLength={140} placeholder="Tooltip (optional)" className={`${inputClass} min-w-[160px] flex-1`} />
                        <button disabled={!badge.label.trim()} onClick={() => addBadge(w.groupId)} className={primaryButtonClass}>Add badge</button>
                        {badge.label && <CustomBadge label={badge.label} color={badge.color} />}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      {requests.some((r) => r.status !== "pending") && (
        <Panel title="Recent decisions">
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {requests.filter((r) => r.status !== "pending").slice(0, 20).map((r) => (
              <li key={r.id} className="py-2 text-sm text-zinc-700 dark:text-zinc-300">
                <strong>{r.groupName || r.groupId}</strong> → {planInfo(r.plan).name} · <span className="capitalize">{r.status}</span>
                {r.response && <span className="text-zinc-500"> · “{r.response}”</span>}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

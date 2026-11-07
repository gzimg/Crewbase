import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import SiteShell, { Panel, StatGrid } from "@/components/siteshell";

type SiteUser = {
  userId: string;
  username: string | null;
  picture: string | null;
  isOwner: boolean;
  siteRole: "admin" | "staff" | null;
  banned: boolean;
  bannedAt: string | null;
  banReason: string | null;
  workspaces: number;
};

type SiteWorkspace = {
  groupId: string;
  groupName: string | null;
  groupLogo: string | null;
  ownerName: string | null;
  members: number;
  lastSynced: string | null;
};

const errorText = (e: any) => e?.response?.data?.error || "Something went wrong";

export default function SiteStaffPage() {
  const [stats, setStats] = useState<{ users: number; workspaces: number; suspended: number; activeSessions: number } | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "suspended">("all");
  const [page, setPage] = useState(0);
  const [users, setUsers] = useState<SiteUser[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [workspaces, setWorkspaces] = useState<SiteWorkspace[]>([]);
  const [suspending, setSuspending] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const loadStats = useCallback(() => {
    axios.get("/api/site/overview").then((r) => setStats(r.data.stats)).catch(() => {});
  }, []);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const r = await axios.get("/api/site/users", { params: { q: query, page, filter } });
      setUsers(r.data.users);
      setTotal(r.data.total);
      setPageSize(r.data.pageSize);
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setLoadingUsers(false);
    }
  }, [query, page, filter]);

  useEffect(() => {
    loadStats();
    axios.get("/api/site/workspaces").then((r) => setWorkspaces(r.data.workspaces)).catch(() => {});
  }, [loadStats]);

  useEffect(() => {
    const t = setTimeout(loadUsers, 250);
    return () => clearTimeout(t);
  }, [loadUsers]);

  const suspend = async (userId: string) => {
    if (!reason.trim()) {
      toast.error("Please give a reason");
      return;
    }
    try {
      await axios.post(`/api/site/users/${userId}/suspend`, { reason });
      toast.success("User suspended");
      setSuspending(null);
      setReason("");
      loadUsers();
      loadStats();
    } catch (e) {
      toast.error(errorText(e));
    }
  };

  const unsuspend = async (userId: string) => {
    try {
      await axios.delete(`/api/site/users/${userId}/suspend`);
      toast.success("Suspension lifted");
      loadUsers();
      loadStats();
    } catch (e) {
      toast.error(errorText(e));
    }
  };

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <SiteShell title="Site staff" description="Look up users and workspaces across this Crewbase instance." minRole="staff">
      <div className="space-y-6">
        <StatGrid
          stats={[
            { label: "Users", value: stats?.users ?? "–" },
            { label: "Workspaces", value: stats?.workspaces ?? "–" },
            { label: "Suspended users", value: stats?.suspended ?? "–" },
            { label: "Active in-game sessions", value: stats?.activeSessions ?? "–" },
          ]}
        />

        <Panel
          title="Users"
          action={
            <div className="flex rounded-md border border-zinc-200 p-0.5 text-xs dark:border-zinc-700">
              {(["all", "suspended"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setFilter(f);
                    setPage(0);
                  }}
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
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search by Roblox username or user ID"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
          />

          <div className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-700">
            {loadingUsers && users.length === 0 && <p className="py-6 text-center text-sm text-zinc-500">Loading…</p>}
            {!loadingUsers && users.length === 0 && <p className="py-6 text-center text-sm text-zinc-500">No users found.</p>}
            {users.map((u) => (
              <div key={u.userId} className="py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <img src={u.picture || "/default-avatar.jpg"} alt="" className="h-9 w-9 rounded-full bg-zinc-200 object-cover dark:bg-zinc-700" />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-zinc-900 dark:text-white">
                      {u.username || "Unknown"}
                      {u.isOwner && <Badge tone="amber">Owner</Badge>}
                      {!u.isOwner && u.siteRole === "admin" && <Badge tone="amber">Site admin</Badge>}
                      {u.siteRole === "staff" && <Badge tone="blue">Site staff</Badge>}
                      {u.banned && <Badge tone="red">Suspended</Badge>}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      ID {u.userId} · {u.workspaces} workspace{u.workspaces === 1 ? "" : "s"}
                      {u.banned && u.banReason ? ` · Reason: ${u.banReason}` : ""}
                    </p>
                  </div>
                  {u.banned ? (
                    <button
                      onClick={() => unsuspend(u.userId)}
                      className="h-9 rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-700"
                    >
                      Lift suspension
                    </button>
                  ) : (
                    u.siteRole !== "admin" && (
                      <button
                        onClick={() => {
                          setSuspending(suspending === u.userId ? null : u.userId);
                          setReason("");
                        }}
                        className="h-9 rounded-lg border border-red-200 px-3 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                      >
                        Suspend
                      </button>
                    )
                  )}
                </div>
                {suspending === u.userId && (
                  <div className="mt-3 flex flex-wrap gap-2 sm:pl-12">
                    <label htmlFor={`reason-${u.userId}`} className="sr-only">Reason for suspension</label>
                    <input
                      id={`reason-${u.userId}`}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      maxLength={500}
                      placeholder="Reason (shown in the audit log)"
                      className="min-w-[200px] flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                    />
                    <button onClick={() => suspend(u.userId)} className="h-9 rounded-lg bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700">
                      Confirm suspension
                    </button>
                    <button onClick={() => setSuspending(null)} className="h-9 rounded-lg px-3 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {pages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
              <span>
                Page {page + 1} of {pages}
              </span>
              <div className="flex gap-2">
                <button disabled={page === 0} onClick={() => setPage(page - 1)} className="h-9 rounded-lg border border-zinc-300 px-3 disabled:opacity-40 dark:border-zinc-600">
                  Previous
                </button>
                <button disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} className="h-9 rounded-lg border border-zinc-300 px-3 disabled:opacity-40 dark:border-zinc-600">
                  Next
                </button>
              </div>
            </div>
          )}
        </Panel>

        <Panel title={`Workspaces (${workspaces.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="pb-2 font-medium">Group</th>
                  <th className="pb-2 font-medium">Group ID</th>
                  <th className="pb-2 font-medium">Owner</th>
                  <th className="pb-2 font-medium">Members</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {workspaces.map((w) => (
                  <tr key={w.groupId}>
                    <td className="py-2.5">
                      <span className="flex items-center gap-2 font-medium text-zinc-900 dark:text-white">
                        <img src={w.groupLogo || "/default-group-logo.svg"} alt="" className="h-6 w-6 rounded object-cover" />
                        {w.groupName || "Unnamed group"}
                      </span>
                    </td>
                    <td className="py-2.5 tabular-nums text-zinc-500 dark:text-zinc-400">{w.groupId}</td>
                    <td className="py-2.5 text-zinc-700 dark:text-zinc-300">{w.ownerName || "–"}</td>
                    <td className="py-2.5 tabular-nums text-zinc-700 dark:text-zinc-300">{w.members}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </SiteShell>
  );
}

function Badge({ tone, children }: { tone: "amber" | "blue" | "red"; children: React.ReactNode }) {
  const tones = {
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
    red: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  };
  return <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}>{children}</span>;
}

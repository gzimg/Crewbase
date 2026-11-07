import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import SiteShell, { Panel } from "@/components/siteshell";

type RoleUser = { userId: string; username: string | null; picture: string | null; isOwner: boolean };
type AuditEntry = {
  at: string;
  actorId: string;
  actorName: string | null;
  action: string;
  targetId?: string;
  targetName: string | null;
  detail?: string;
};

const errorText = (e: any) => e?.response?.data?.error || "Something went wrong";

const actionLabels: Record<string, string> = {
  suspend_user: "suspended",
  unsuspend_user: "lifted the suspension of",
  set_site_role_admin: "made site admin:",
  set_site_role_staff: "made site staff:",
  set_site_role_none: "removed the site role of",
};

export default function SiteAdminPage() {
  const [admins, setAdmins] = useState<RoleUser[]>([]);
  const [staff, setStaff] = useState<RoleUser[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"staff" | "admin">("staff");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    axios
      .get("/api/site/roles")
      .then((r) => {
        setAdmins(r.data.admins);
        setStaff(r.data.staff);
      })
      .catch(() => {});
    axios.get("/api/site/audit").then((r) => setAudit(r.data.entries)).catch(() => {});
  }, []);

  useEffect(load, [load]);

  const setUserRole = async (name: string, newRole: "admin" | "staff" | "none") => {
    setSaving(true);
    try {
      await axios.post("/api/site/roles", { username: name, role: newRole });
      toast.success(newRole === "none" ? "Site role removed" : `Added as site ${newRole}`);
      setUsername("");
      load();
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SiteShell title="Site admin" description="Manage who runs this Crewbase instance and review their actions." minRole="admin">
      <div className="space-y-6">
        <Panel title="Add a site staff member or admin">
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (username.trim()) setUserRole(username.trim(), role);
            }}
          >
            <label htmlFor="site-role-username" className="sr-only">Roblox username</label>
            <input
              id="site-role-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Roblox username"
              className="min-w-[200px] flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
            />
            <label htmlFor="site-role-select" className="sr-only">Role</label>
            <select
              id="site-role-select"
              value={role}
              onChange={(e) => setRole(e.target.value as "staff" | "admin")}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
            >
              <option value="staff">Site staff</option>
              <option value="admin">Site admin</option>
            </select>
            <button
              type="submit"
              disabled={saving || !username.trim()}
              className="h-10 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-zinc-900"
            >
              Add
            </button>
          </form>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            They need to have logged in to Crewbase at least once. Site staff can look up users and suspend regular users.
            Site admins can also suspend staff and manage this list.
          </p>
        </Panel>

        <div className="grid gap-6 lg:grid-cols-2">
          <RoleList title="Site admins" people={admins} onRemove={(u) => setUserRole(u, "none")} />
          <RoleList title="Site staff" people={staff} onRemove={(u) => setUserRole(u, "none")} />
        </div>

        <Panel title="Recent site actions">
          {audit.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No actions yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {audit.map((e, i) => (
                <li key={`${e.at}-${i}`} className="py-2.5 text-sm">
                  <span className="font-medium text-zinc-900 dark:text-white">{e.actorName || e.actorId}</span>{" "}
                  <span className="text-zinc-600 dark:text-zinc-300">{actionLabels[e.action] || e.action}</span>{" "}
                  {e.targetId && <span className="font-medium text-zinc-900 dark:text-white">{e.targetName || e.targetId}</span>}
                  {e.detail && e.action === "suspend_user" && <span className="text-zinc-500"> · {e.detail}</span>}
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400">{new Date(e.at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </SiteShell>
  );
}

function RoleList({ title, people, onRemove }: { title: string; people: RoleUser[]; onRemove: (username: string) => void }) {
  return (
    <Panel title={`${title} (${people.length})`}>
      {people.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Nobody yet.</p>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
          {people.map((p) => (
            <li key={p.userId} className="flex items-center gap-3 py-2.5">
              <img src={p.picture || "/default-avatar.jpg"} alt="" className="h-8 w-8 rounded-full bg-zinc-200 object-cover dark:bg-zinc-700" />
              <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-white">
                {p.username || p.userId}
                {p.isOwner && <span className="ml-2 text-xs font-normal text-zinc-500">Instance owner</span>}
              </span>
              {!p.isOwner && p.username && (
                <button
                  onClick={() => onRemove(p.username!)}
                  className="h-8 rounded-lg px-2.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

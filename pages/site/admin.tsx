import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import SiteShell, { Panel } from "@/components/siteshell";
import { Badge, Tabs, inputClass, buttonClass, primaryButtonClass, timeAgo } from "@/components/sitebits";

type RoleUser = { userId: string; username: string | null; picture: string | null; isOwner: boolean };
type AuditEntry = { at: string; actorId: string; actorName: string | null; action: string; targetId?: string; targetName: string | null; detail?: string };
type Settings = {
  maintenance: { enabled: boolean; message: string };
  registrations: { open: boolean };
  announcement: { enabled: boolean; text: string; tone: "info" | "warning" | "success"; updatedAt: string | null };
};
type Health = {
  checks: { name: string; ok: boolean; detail: string }[];
  plainSecrets: number;
  cron: { name: string; every: string; lastRun: string | null; ok: boolean }[];
};
type Tab = "team" | "settings" | "health" | "audit";

const errorText = (e: any) => e?.response?.data?.error || "Something went wrong";

const actionLabels: Record<string, string> = {
  suspend_user: "suspended",
  unsuspend_user: "lifted the suspension of",
  set_site_role_admin: "made site admin:",
  set_site_role_staff: "made site staff:",
  set_site_role_none: "removed the site role of",
  update_site_settings: "changed site settings",
  lock_workspace: "locked a workspace",
  unlock_workspace: "unlocked a workspace",
  encrypt_secrets: "encrypted stored keys",
  add_staff_note: "added a staff note on",
  delete_staff_note: "deleted a staff note on",
  export_user_data: "exported the data of",
  report_resolved: "resolved a report from",
  report_dismissed: "dismissed a report from",
  report_open: "reopened a report from",
};

export default function SiteAdminPage() {
  const [tab, setTab] = useState<Tab>("team");
  return (
    <SiteShell title="Site admin" description="Run this Crewbase instance: your team, site settings, health and history." minRole="admin">
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "team", label: "Team" },
          { id: "settings", label: "Site settings" },
          { id: "health", label: "Health" },
          { id: "audit", label: "Audit log" },
        ]}
      />
      {tab === "team" && <TeamTab />}
      {tab === "settings" && <SettingsTab />}
      {tab === "health" && <HealthTab />}
      {tab === "audit" && <AuditTab />}
    </SiteShell>
  );
}

/* ---------------- Team ---------------- */

function TeamTab() {
  const [admins, setAdmins] = useState<RoleUser[]>([]);
  const [staff, setStaff] = useState<RoleUser[]>([]);
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"staff" | "admin">("staff");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    axios.get("/api/site/roles").then((r) => { setAdmins(r.data.admins); setStaff(r.data.staff); }).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const setUserRole = async (name: string, newRole: "admin" | "staff" | "none") => {
    setSaving(true);
    try {
      await axios.post("/api/site/roles", { username: name, role: newRole });
      toast.success(newRole === "none" ? "Site role removed" : `Now site ${newRole}`);
      setUsername("");
      load();
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Panel title="Add someone to the site team">
        <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (username.trim()) setUserRole(username.trim(), role); }}>
          <label htmlFor="site-role-username" className="sr-only">Roblox username</label>
          <input id="site-role-username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Roblox username" className={`${inputClass} min-w-[200px] flex-1`} />
          <label htmlFor="site-role-select" className="sr-only">Role</label>
          <select id="site-role-select" value={role} onChange={(e) => setRole(e.target.value as any)} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white">
            <option value="staff">Site staff</option>
            <option value="admin">Site admin</option>
          </select>
          <button type="submit" disabled={saving || !username.trim()} className={`${primaryButtonClass} h-10`}>Add</button>
        </form>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          They need to have logged in once. Site staff handle reports, look up users and suspend regular users. Site admins can
          also change site settings, lock workspaces, export data and manage this team.
        </p>
      </Panel>
      <div className="grid gap-6 lg:grid-cols-2">
        <RoleList title="Site admins" people={admins} onChange={setUserRole} other="staff" />
        <RoleList title="Site staff" people={staff} onChange={setUserRole} other="admin" />
      </div>
    </div>
  );
}

function RoleList({ title, people, onChange, other }: { title: string; people: RoleUser[]; onChange: (u: string, r: "admin" | "staff" | "none") => void; other: "admin" | "staff" }) {
  return (
    <Panel title={`${title} (${people.length})`}>
      {people.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Nobody yet.</p>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
          {people.map((p) => (
            <li key={p.userId} className="flex flex-wrap items-center gap-3 py-2.5">
              <img src={p.picture || "/default-avatar.jpg"} alt="" className="h-8 w-8 rounded-full bg-zinc-200 object-cover dark:bg-zinc-700" />
              <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-white">
                {p.username || p.userId}
                {p.isOwner && <span className="ml-2 text-xs font-normal text-zinc-500">Instance owner</span>}
              </span>
              {!p.isOwner && p.username && (
                <>
                  <button onClick={() => onChange(p.username!, other)} className={buttonClass}>Make {other}</button>
                  <button onClick={() => onChange(p.username!, "none")} className={buttonClass}>Remove</button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ---------------- Settings ---------------- */

function SettingsTab() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get("/api/site/settings").then((r) => setSettings(r.data.settings)).catch((e) => toast.error(errorText(e)));
  }, []);

  const save = async (patch: Partial<Settings>) => {
    setSaving(true);
    try {
      const r = await axios.post("/api/site/settings", patch);
      setSettings(r.data.settings);
      toast.success("Saved");
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <p className="text-sm text-zinc-500">Loading…</p>;
  const a = settings.announcement;

  return (
    <div className="space-y-6">
      <Panel title="Announcement banner">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">Shows a banner at the top of the app for every logged-in user. People can dismiss it.</p>
        <label htmlFor="ann-text" className="mt-4 block text-xs font-medium text-zinc-500">Message</label>
        <textarea
          id="ann-text"
          value={a.text}
          maxLength={280}
          rows={2}
          onChange={(e) => setSettings({ ...settings, announcement: { ...a, text: e.target.value } })}
          placeholder="e.g. Scheduled maintenance on Saturday at 10:00 ET."
          className={`${inputClass} mt-1`}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label htmlFor="ann-tone" className="sr-only">Style</label>
          <select id="ann-tone" value={a.tone} onChange={(e) => setSettings({ ...settings, announcement: { ...a, tone: e.target.value as any } })} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-white">
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="success">Good news</option>
          </select>
          <button disabled={saving || !a.text.trim()} onClick={() => save({ announcement: { ...a, enabled: true } })} className={primaryButtonClass}>
            {a.enabled ? "Update banner" : "Show banner"}
          </button>
          {a.enabled && <button disabled={saving} onClick={() => save({ announcement: { ...a, enabled: false } })} className={buttonClass}>Hide banner</button>}
          {a.enabled ? <Badge tone="green">Live</Badge> : <Badge tone="zinc">Hidden</Badge>}
        </div>
      </Panel>

      <Panel title="New sign-ups">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-lg text-sm text-zinc-600 dark:text-zinc-300">
            When closed, nobody new can create a Crewbase account. People who already have one can still log in.
          </p>
          <div className="flex items-center gap-2">
            {settings.registrations.open ? <Badge tone="green">Open</Badge> : <Badge tone="red">Closed</Badge>}
            <button disabled={saving} onClick={() => save({ registrations: { open: !settings.registrations.open } })} className={buttonClass}>
              {settings.registrations.open ? "Close sign-ups" : "Open sign-ups"}
            </button>
          </div>
        </div>
      </Panel>

      <Panel title="Maintenance mode">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          While on, only site staff and admins can use Crewbase. Everyone else sees a maintenance page with your message.
          The public homepage stays up.
        </p>
        <label htmlFor="maint-msg" className="mt-4 block text-xs font-medium text-zinc-500">Message</label>
        <input
          id="maint-msg"
          value={settings.maintenance.message}
          maxLength={300}
          onChange={(e) => setSettings({ ...settings, maintenance: { ...settings.maintenance, message: e.target.value } })}
          className={`${inputClass} mt-1`}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {settings.maintenance.enabled ? <Badge tone="red">On</Badge> : <Badge tone="green">Off</Badge>}
          <button
            disabled={saving}
            onClick={() => {
              if (!settings.maintenance.enabled && !window.confirm("Turn on maintenance mode? Regular users will be locked out until you turn it off.")) return;
              save({ maintenance: { ...settings.maintenance, enabled: !settings.maintenance.enabled } });
            }}
            className={settings.maintenance.enabled ? primaryButtonClass : buttonClass}
          >
            {settings.maintenance.enabled ? "Turn off maintenance" : "Turn on maintenance"}
          </button>
          <button disabled={saving} onClick={() => save({ maintenance: settings.maintenance })} className={buttonClass}>Save message</button>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Health ---------------- */

function HealthTab() {
  const [health, setHealth] = useState<Health | null>(null);
  const [encrypting, setEncrypting] = useState(false);

  const load = useCallback(() => {
    axios.get("/api/site/health").then((r) => setHealth(r.data)).catch((e) => toast.error(errorText(e)));
  }, []);
  useEffect(load, [load]);

  const encrypt = async () => {
    setEncrypting(true);
    try {
      const r = await axios.post("/api/site/encrypt-secrets");
      toast.success(`Encrypted ${r.data.encrypted} key${r.data.encrypted === 1 ? "" : "s"}`);
      load();
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setEncrypting(false);
    }
  };

  if (!health) return <p className="text-sm text-zinc-500">Running checks…</p>;
  const failing = health.checks.filter((c) => !c.ok).length;

  return (
    <div className="space-y-6">
      <Panel title="Setup checks" action={<button onClick={load} className={buttonClass}>Re-run</button>}>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-300">
          {failing === 0 ? "Everything looks set up." : `${failing} item${failing === 1 ? " needs" : "s need"} attention. Environment variables are set in Vercel under Settings → Environment Variables, then redeploy.`}
        </p>
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
          {health.checks.map((c) => (
            <li key={c.name} className="flex items-start gap-3 py-2.5">
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${c.ok ? "bg-emerald-500" : "bg-red-500"}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-900 dark:text-white">{c.name} <span className="sr-only">{c.ok ? "OK" : "needs attention"}</span></p>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{c.detail}</p>
              </div>
              {c.ok ? <Badge tone="green">OK</Badge> : <Badge tone="red">Missing</Badge>}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Encryption">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-lg text-sm text-zinc-600 dark:text-zinc-300">
            Roblox Open Cloud keys and RankGun tokens are encrypted when saved. Keys saved before encryption was added stay
            readable until you encrypt them here.
          </p>
          <div className="flex items-center gap-2">
            {health.plainSecrets === 0 ? <Badge tone="green">All encrypted</Badge> : <Badge tone="amber">{health.plainSecrets} not encrypted</Badge>}
            <button disabled={encrypting || health.plainSecrets === 0} onClick={encrypt} className={primaryButtonClass}>Encrypt stored keys</button>
          </div>
        </div>
        <p className="mt-3 text-xs text-zinc-500">Keep ENCRYPTION_KEY safe and never change it, or encrypted keys can’t be read and workspaces will need to re-enter them.</p>
      </Panel>

      <Panel title="Scheduled jobs">
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
          {health.cron.map((j) => (
            <li key={j.name} className="flex items-center gap-3 py-2.5 text-sm">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${j.ok ? "bg-emerald-500" : "bg-amber-500"}`} aria-hidden="true" />
              <span className="flex-1 font-medium text-zinc-900 dark:text-white">{j.name}</span>
              <span className="hidden text-zinc-500 sm:inline">every {j.every}</span>
              <span className="text-zinc-500">last ran {timeAgo(j.lastRun)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-zinc-500">Jobs that haven’t run show amber. They start reporting after your next deploy with this update.</p>
      </Panel>
    </div>
  );
}

/* ---------------- Audit ---------------- */

function AuditTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    axios.get("/api/site/audit").then((r) => setEntries(r.data.entries)).catch(() => {});
  }, []);

  const q = query.trim().toLowerCase();
  const shown = entries.filter((e) =>
    !q || [e.actorName, e.targetName, e.action, e.detail].some((v) => (v || "").toLowerCase().includes(q))
  );

  return (
    <Panel title="Recent site actions" action={<a href="/api/site/audit?format=csv" className={buttonClass}>Download CSV</a>}>
      <label htmlFor="audit-search" className="sr-only">Filter actions</label>
      <input id="audit-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by person, action or detail" className={inputClass} />
      {shown.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">No actions found.</p>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-700">
          {shown.map((e, i) => (
            <li key={`${e.at}-${i}`} className="py-2.5 text-sm">
              <span className="font-medium text-zinc-900 dark:text-white">{e.actorName || e.actorId}</span>{" "}
              <span className="text-zinc-600 dark:text-zinc-300">{actionLabels[e.action] || e.action.replace(/_/g, " ")}</span>{" "}
              {e.targetId && <span className="font-medium text-zinc-900 dark:text-white">{e.targetName || e.targetId}</span>}
              {e.detail && <span className="text-zinc-500"> · {e.detail}</span>}
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">{new Date(e.at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import SiteShell, { Panel } from "@/components/siteshell";
import { Badge, Tabs, inputClass, buttonClass, primaryButtonClass, timeAgo } from "@/components/sitebits";
import { PlanBadge } from "@/components/planbadge";

type RoleUser = { userId: string; username: string | null; picture: string | null; isOwner: boolean };
type AuditEntry = { at: string; actorId: string; actorName: string | null; action: string; targetId?: string; targetName: string | null; detail?: string };
type Settings = {
  maintenance: { enabled: boolean; message: string };
  registrations: { open: boolean };
  workspaces: { open: boolean; perUserLimit: number; minRank: number };
  announcement: { enabled: boolean; text: string; tone: "info" | "warning" | "success"; updatedAt: string | null };
};
type Health = {
  checks: { name: string; ok: boolean; detail: string }[];
  plainSecrets: number;
  cron: { name: string; every: string; lastRun: string | null; ok: boolean }[];
};
type Tab = "team" | "settings" | "plans" | "changelog" | "health" | "audit";

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
  publish_changelog: "published an update",
  update_plan_settings: "changed plan settings",
  register_bot_commands: "registered the Discord bot’s commands",
  set_workspace_plan: "set a workspace plan",
  plan_request_approved: "approved a plan request",
  plan_request_declined: "declined a plan request",
  add_workspace_badge: "added a badge",
  remove_workspace_badge: "removed a badge",
  delete_changelog: "deleted an update",
  add_staff_note: "added a staff note on",
  delete_staff_note: "deleted a staff note on",
  export_user_data: "exported the data of",
  delete_user_account: "deleted the account of",
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
          { id: "plans", label: "Plans" },
          { id: "changelog", label: "What’s new" },
          { id: "health", label: "Health" },
          { id: "audit", label: "Audit log" },
        ]}
      />
      {tab === "team" && <TeamTab />}
      {tab === "settings" && <SettingsTab />}
      {tab === "plans" && <PlanSettingsTab />}
      {tab === "changelog" && <ChangelogTab />}
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
  const [botInfo, setBotInfo] = useState<{ configured: boolean; inviteUrl: string | null; interactionsUrl: string; servers: number; commands: string[]; checks?: { name: string; ok: boolean; detail: string }[]; registered?: number } | null>(null);
  const [botError, setBotError] = useState<string | null>(null);
  useEffect(() => {
    axios.get("/api/site/discord-bot").then((r) => setBotInfo(r.data)).catch(() => {});
  }, []);

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
  const registerBot = async () => {
    setBotError(null);
    try {
      const r = await axios.post("/api/site/discord-bot");
      toast.success(`Registered ${r.data.count} commands`);
      axios.get("/api/site/discord-bot").then((x) => setBotInfo(x.data)).catch(() => {});
    } catch (e: any) {
      const msg = errorText(e);
      setBotError(msg === "Invalid request origin" ? "Invalid request origin: open Crewbase at the exact address in NEXTAUTH_URL (https://crewbase.dev, not the vercel.app address) and try again." : msg);
      toast.error("Registering failed. See the details in the bot panel.");
    }
  };

  return (
    <div className="space-y-6">
      <Panel title="Crewbase Discord bot">
        {!botInfo ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : !botInfo.configured ? (
          <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
            <p>The bot isn’t set up yet. In the Discord Developer Portal, create an application with a bot, then add these in Vercel and redeploy:</p>
            <p><code>DISCORD_BOT_APPLICATION_ID</code>, <code>DISCORD_BOT_PUBLIC_KEY</code>, <code>DISCORD_BOT_TOKEN</code></p>
            <p>Then set the application’s <strong>Interactions Endpoint URL</strong> to:</p>
            <code className="block break-all rounded bg-zinc-100 p-2 dark:bg-zinc-900">{botInfo.interactionsUrl}</code>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
            <p>
              <Badge tone="green">Set up</Badge> Connected to {botInfo.servers} server{botInfo.servers === 1 ? "" : "s"}. Interactions URL:{" "}
              <code className="break-all">{botInfo.interactionsUrl}</code>
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={registerBot} className={primaryButtonClass}>Register slash commands</button>
              {botInfo.inviteUrl && <a href={botInfo.inviteUrl} target="_blank" rel="noopener noreferrer" className={buttonClass}>Invite link</a>}
            </div>
            {botError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{botError}</p>}
            {botInfo.checks && botInfo.checks.length > 0 && (
              <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-700 dark:border-zinc-700">
                {botInfo.checks.map((c) => (
                  <li key={c.name} className="flex items-start gap-3 px-3 py-2">
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${c.ok ? "bg-emerald-500" : "bg-red-500"}`} aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">{c.name} <span className="sr-only">{c.ok ? "OK" : "problem"}</span></p>
                      <p className="break-words text-xs text-zinc-500">{c.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-zinc-500">
              Press Register after setting up, and again after any update that adds commands. New commands can take a minute to appear;
              restart Discord (Ctrl+R or ⌘R) if they don’t. Commands: {botInfo.commands.map((c) => `/${c}`).join(", ")}
            </p>
          </div>
        )}
      </Panel>

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

      <Panel title="Workspace creation">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Let people create workspaces for their own Roblox groups. You and site staff can always create them.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-4 text-sm">
          <label className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
            <input type="checkbox" checked={settings.workspaces?.open ?? true} onChange={(e) => save({ workspaces: { ...settings.workspaces, open: e.target.checked } })} className="h-4 w-4" />
            Anyone can create a workspace
          </label>
          <label className="block text-xs text-zinc-500">
            Workspaces per person
            <input type="number" min={1} max={50} defaultValue={settings.workspaces?.perUserLimit ?? 3} onBlur={(e) => save({ workspaces: { ...settings.workspaces, perUserLimit: Number(e.target.value) } })} className={`${inputClass} w-24`} />
          </label>
          <label className="block text-xs text-zinc-500">
            Lowest group rank allowed (1–255)
            <input type="number" min={1} max={255} defaultValue={settings.workspaces?.minRank ?? 25} onBlur={(e) => save({ workspaces: { ...settings.workspaces, minRank: Number(e.target.value) } })} className={`${inputClass} w-24`} />
          </label>
        </div>
        <p className="mt-2 text-xs text-zinc-500">The rank check stops people claiming a group they don’t help run. Group owners are rank 255.</p>
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

/* ---------------- What's new ---------------- */

type ChangeEntry = { id: string; title: string; body: string; tag: "new" | "improved" | "fixed"; at: string };

function ChangelogTab() {
  const [entries, setEntries] = useState<ChangeEntry[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tag, setTag] = useState<ChangeEntry["tag"]>("new");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    axios.get("/api/site/changelog").then((r) => setEntries(r.data.entries)).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const publish = async () => {
    setSaving(true);
    try {
      await axios.post("/api/site/changelog", { title, body, tag });
      toast.success("Update published");
      setTitle("");
      setBody("");
      load();
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this update?")) return;
    try {
      await axios.delete("/api/site/changelog", { params: { id } });
      toast.success("Deleted");
      load();
    } catch (e) {
      toast.error(errorText(e));
    }
  };

  return (
    <div className="space-y-6">
      <Panel title="Post an update" action={<a href="/changelog" target="_blank" rel="noopener noreferrer" className={buttonClass}>View page</a>}>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">Updates appear on the public What’s new page.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <label htmlFor="cl-title" className="sr-only">Title</label>
          <input id="cl-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Quick navigation with Ctrl+K" className={`${inputClass} min-w-[220px] flex-1`} />
          <label htmlFor="cl-tag" className="sr-only">Type</label>
          <select id="cl-tag" value={tag} onChange={(e) => setTag(e.target.value as any)} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-white">
            <option value="new">New</option>
            <option value="improved">Improved</option>
            <option value="fixed">Fixed</option>
          </select>
        </div>
        <label htmlFor="cl-body" className="sr-only">Details</label>
        <textarea id="cl-body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={3000} placeholder="What changed and why it helps (optional)" className={`${inputClass} mt-2`} />
        <button disabled={saving || !title.trim()} onClick={publish} className={`${primaryButtonClass} mt-3`}>Publish</button>
      </Panel>
      <Panel title={`Published (${entries.length})`}>
        {entries.length === 0 ? (
          <p className="text-sm text-zinc-500">Nothing yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {entries.map((e) => (
              <li key={e.id} className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">
                    <Badge tone={e.tag === "new" ? "amber" : e.tag === "improved" ? "blue" : "green"}>{e.tag}</Badge> {e.title}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">{new Date(e.at).toLocaleDateString()}</p>
                </div>
                <button onClick={() => remove(e.id)} className={buttonClass}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/* ---------------- Plans ---------------- */

type PlanDef = {
  name: string; tagline: string; color: string;
  limits: { members: number; evidenceFiles: number; evidenceFileMb: number; apiKeys: number };
  features: string[];
};
type PlanCfg = {
  defaultPlan: "starter" | "plus" | "pro";
  plans: Record<"starter" | "plus" | "pro", PlanDef>;
  auto: { enabled: boolean; toPlan: "starter" | "plus" | "pro"; minMembers: number; minAgeDays: number };
  requests: { open: boolean };
  requirements?: Record<"starter" | "plus" | "pro", { minGroupMembers: number; minWorkspaceDays: number }>;
};
const PLAN_IDS = ["starter", "plus", "pro"] as const;

function PlanSettingsTab() {
  const [cfg, setCfg] = useState<PlanCfg | null>(null);
  const [featureLabels, setFeatureLabels] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios
      .get("/api/site/plans/config")
      .then((r) => {
        setCfg(r.data.config);
        setFeatureLabels(r.data.featureLabels);
      })
      .catch((e) => toast.error(errorText(e)));
  }, []);

  if (!cfg) return <p className="text-sm text-zinc-500">Loading…</p>;

  const updatePlan = (id: (typeof PLAN_IDS)[number], patch: Partial<PlanDef>) =>
    setCfg({ ...cfg, plans: { ...cfg.plans, [id]: { ...cfg.plans[id], ...patch } } });
  const updateLimit = (id: (typeof PLAN_IDS)[number], key: keyof PlanDef["limits"], value: string) =>
    updatePlan(id, { limits: { ...cfg.plans[id].limits, [key]: Number(value) } });
  const toggleFeature = (id: (typeof PLAN_IDS)[number], f: string) => {
    const has = cfg.plans[id].features.includes(f);
    updatePlan(id, { features: has ? cfg.plans[id].features.filter((x) => x !== f) : [...cfg.plans[id].features, f] });
  };

  const save = async () => {
    setSaving(true);
    try {
      const r = await axios.post("/api/site/plans/config", cfg);
      setCfg(r.data.config);
      toast.success("Plan settings saved");
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setSaving(false);
    }
  };

  const num = "w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-white";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        {PLAN_IDS.map((id) => {
          const p = cfg.plans[id];
          return (
            <Panel key={id} title={id === cfg.defaultPlan ? `${p.name} (default)` : p.name}>
              <div className="space-y-3 text-sm">
                <PlanBadge name={p.name} color={p.color} size="md" />
                <div className="flex gap-2">
                  <label className="flex-1">
                    <span className="text-xs text-zinc-500">Name</span>
                    <input value={p.name} maxLength={20} onChange={(e) => updatePlan(id, { name: e.target.value })} className={num} />
                  </label>
                  <label>
                    <span className="text-xs text-zinc-500">Colour</span>
                    <input type="color" value={p.color} onChange={(e) => updatePlan(id, { color: e.target.value })} className="block h-[34px] w-12 cursor-pointer rounded border border-zinc-300 dark:border-zinc-600" />
                  </label>
                </div>
                <label className="block">
                  <span className="text-xs text-zinc-500">Tagline</span>
                  <input value={p.tagline} maxLength={120} onChange={(e) => updatePlan(id, { tagline: e.target.value })} className={num} />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label><span className="text-xs text-zinc-500">Members (soft)</span><input type="number" min={1} value={p.limits.members} onChange={(e) => updateLimit(id, "members", e.target.value)} className={num} /></label>
                  <label><span className="text-xs text-zinc-500">Evidence files</span><input type="number" min={0} value={p.limits.evidenceFiles} onChange={(e) => updateLimit(id, "evidenceFiles", e.target.value)} className={num} /></label>
                  <label><span className="text-xs text-zinc-500">Max file (MB)</span><input type="number" min={1} max={25} value={p.limits.evidenceFileMb} onChange={(e) => updateLimit(id, "evidenceFileMb", e.target.value)} className={num} /></label>
                  <label><span className="text-xs text-zinc-500">API keys</span><input type="number" min={0} max={50} value={p.limits.apiKeys} onChange={(e) => updateLimit(id, "apiKeys", e.target.value)} className={num} /></label>
                </div>
                <fieldset>
                  <legend className="text-xs text-zinc-500">Included</legend>
                  <div className="mt-1 space-y-1">
                    {Object.entries(featureLabels).map(([f, label]) => (
                      <label key={f} className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                        <input type="checkbox" checked={p.features.includes(f)} onChange={() => toggleFeature(id, f)} className="h-4 w-4 rounded" />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
            </Panel>
          );
        })}
      </div>

      <Panel title="How workspaces get plans">
        <div className="grid gap-4 text-sm md:grid-cols-3">
          <label className="block">
            <span className="text-xs text-zinc-500">Default plan for new workspaces</span>
            <select value={cfg.defaultPlan} onChange={(e) => setCfg({ ...cfg, defaultPlan: e.target.value as any })} className={num}>
              {PLAN_IDS.map((id) => <option key={id} value={id}>{cfg.plans[id].name}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 pt-5 text-zinc-700 dark:text-zinc-300">
            <input type="checkbox" checked={cfg.requests.open} onChange={(e) => setCfg({ ...cfg, requests: { open: e.target.checked } })} className="h-4 w-4 rounded" />
            Workspaces can request a higher plan
          </label>
          <label className="flex items-center gap-2 pt-5 text-zinc-700 dark:text-zinc-300">
            <input type="checkbox" checked={cfg.auto.enabled} onChange={(e) => setCfg({ ...cfg, auto: { ...cfg.auto, enabled: e.target.checked } })} className="h-4 w-4 rounded" />
            Automatic upgrades
          </label>
        </div>
        {cfg.auto.enabled && (
          <div className="mt-4 grid gap-4 text-sm md:grid-cols-3">
            <label className="block">
              <span className="text-xs text-zinc-500">Upgrade to</span>
              <select value={cfg.auto.toPlan} onChange={(e) => setCfg({ ...cfg, auto: { ...cfg.auto, toPlan: e.target.value as any } })} className={num}>
                {PLAN_IDS.map((id) => <option key={id} value={id}>{cfg.plans[id].name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-zinc-500">Once they have at least this many members</span>
              <input type="number" min={1} value={cfg.auto.minMembers} onChange={(e) => setCfg({ ...cfg, auto: { ...cfg.auto, minMembers: Number(e.target.value) } })} className={num} />
            </label>
            <label className="block">
              <span className="text-xs text-zinc-500">And have been on Crewbase this many days</span>
              <input type="number" min={0} value={cfg.auto.minAgeDays} onChange={(e) => setCfg({ ...cfg, auto: { ...cfg.auto, minAgeDays: Number(e.target.value) } })} className={num} />
            </label>
          </div>
        )}
        <p className="mt-3 text-xs text-zinc-500">The automatic check runs once a day. It only ever moves workspaces up, never down.</p>
      </Panel>

      <Panel title="What a workspace needs to request each plan">
        <div className="grid gap-4 text-sm md:grid-cols-2">
          {(["plus", "pro"] as const).map((id) => {
            const r = cfg.requirements?.[id] || { minGroupMembers: 0, minWorkspaceDays: 0 };
            const set = (patch: Partial<typeof r>) =>
              setCfg({ ...cfg, requirements: { ...(cfg.requirements as any), [id]: { ...r, ...patch } } });
            return (
              <div key={id} className="space-y-2">
                <PlanBadge name={cfg.plans[id].name} color={cfg.plans[id].color} />
                <label className="block"><span className="text-xs text-zinc-500">Minimum Roblox group members</span>
                  <input type="number" min={0} value={r.minGroupMembers} onChange={(e) => set({ minGroupMembers: Number(e.target.value) })} className={num} /></label>
                <label className="block"><span className="text-xs text-zinc-500">Minimum workspace age (days)</span>
                  <input type="number" min={0} value={r.minWorkspaceDays} onChange={(e) => set({ minWorkspaceDays: Number(e.target.value) })} className={num} /></label>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-zinc-500">Workspaces that don’t meet these can’t send a request yet, and see what they’re missing. Staff can still give any plan directly.</p>
      </Panel>

      <button disabled={saving} onClick={save} className={`${primaryButtonClass} h-10 px-5`}>{saving ? "Saving…" : "Save plan settings"}</button>
    </div>
  );
}

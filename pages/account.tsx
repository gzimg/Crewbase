import { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useRecoilState } from "recoil";
import { loginState } from "@/state";
import Topbar from "@/components/topbar";
import { Badge, buttonClass, primaryButtonClass, dangerButtonClass, reportCategoryLabels, timeAgo } from "@/components/sitebits";

type MyReport = { id: string; category: string; status: string; details: string; createdAt: string; resolution?: string };

/** The user's own account page: their data, privacy requests and reports. */
export default function AccountPage() {
  const [login] = useRecoilState(loginState);
  const [reports, setReports] = useState<MyReport[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadReports = useCallback(() => {
    axios.get("/api/reports").then((r) => setReports(r.data.reports)).catch(() => {});
  }, []);
  useEffect(loadReports, [loadReports]);

  const requestDeletion = async () => {
    setBusy(true);
    try {
      await axios.post("/api/reports", { category: "deletion", details: "" });
      toast.success("Deletion request sent. We’ll reply within 30 days.");
      setConfirmDelete(false);
      loadReports();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const [discordId, setDiscordId] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    axios.get("/api/discord/link").then((r) => setDiscordId(r.data.discordId)).catch(() => setDiscordId(null));
  }, []);

  const [passport, setPassport] = useState<{ passport: { token: string; groupIds: string[] } | null; workspaces: { groupId: string; groupName: string }[] } | null>(null);
  const [passportPick, setPassportPick] = useState<string[]>([]);
  const loadPassport = () =>
    axios.get("/api/me/passport").then((r) => { setPassport(r.data); setPassportPick(r.data.passport?.groupIds || r.data.workspaces.map((w: any) => w.groupId)); }).catch(() => {});
  useEffect(() => { loadPassport(); }, []);
  const savePassport = async (regenerate = false) => {
    try {
      await axios.post("/api/me/passport", { groupIds: passportPick, regenerate });
      toast.success(regenerate ? "New link created; the old one stops working" : "Passport saved");
      loadPassport();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Something went wrong");
    }
  };

  const openDeletion = reports.some((r) => r.category === "deletion" && r.status === "open");

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Head>
        <title>Crewbase - Your account</title>
      </Head>
      <Topbar />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <div className="flex items-center gap-4">
          <img src={login?.thumbnail || "/default-avatar.jpg"} alt="" className="h-14 w-14 rounded-full bg-zinc-200 object-cover dark:bg-zinc-700" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">{login?.displayname || "Your account"}</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">@{login?.username} · Roblox ID {login?.userId}</p>
          </div>
        </div>

        <Section title="Discord">
          {discordId === undefined ? (
            <p className="text-sm text-zinc-500">Loading…</p>
          ) : discordId ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-zinc-600 dark:text-zinc-300">Linked to Discord user ID <code>{discordId}</code>. Servers using the Crewbase bot can give you roles.</p>
              <button onClick={async () => { await axios.delete("/api/discord/link"); setDiscordId(null); toast.success("Discord unlinked"); }} className={buttonClass}>Unlink Discord</button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-zinc-600 dark:text-zinc-300">Not linked. Link Discord to log in with it, and to get roles in servers using the Crewbase bot.</p>
              <a href="/api/auth/discord/start?mode=link" className="inline-flex h-9 items-center rounded-lg bg-[#5865F2] px-3 text-sm font-medium text-white hover:bg-[#4752c4]">Link Discord</a>
            </div>
          )}
        </Section>

        <Section title="Staff Passport">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            A verified record of your staff experience, to share when you apply to another group: your roles, how long you’ve been on
            each team, certifications, kudos and Staff of the Month wins. It never includes warnings or HR records. It’s off until you
            turn it on, and only people with the link can see it.
          </p>
          {passport && passport.workspaces.length > 0 ? (
            <>
              <div className="mt-3 flex flex-wrap gap-2">
                {passport.workspaces.map((w) => (
                  <label key={w.groupId} className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
                    <input type="checkbox" checked={passportPick.includes(w.groupId)} onChange={(e) => setPassportPick(e.target.checked ? [...passportPick, w.groupId] : passportPick.filter((g) => g !== w.groupId))} className="h-4 w-4" />
                    {w.groupName}
                  </label>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button onClick={() => savePassport(false)} disabled={!passportPick.length} className={primaryButtonClass}>{passport.passport ? "Save changes" : "Turn on my passport"}</button>
                {passport.passport && (
                  <>
                    <button onClick={() => { const url = `${window.location.origin}/passport/${passport.passport!.token}`; navigator.clipboard?.writeText(url); toast.success("Link copied"); }} className={buttonClass}>Copy link</button>
                    <a href={`/passport/${passport.passport.token}`} target="_blank" rel="noopener noreferrer" className={buttonClass}>View</a>
                    <button onClick={() => savePassport(true)} className={buttonClass}>New link</button>
                    <button onClick={async () => { await axios.delete("/api/me/passport"); toast.success("Passport turned off"); loadPassport(); }} className={dangerButtonClass}>Turn off</button>
                  </>
                )}
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">Join a workspace first to build your passport.</p>
          )}
        </Section>

        <Section title="Your data">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Download a copy of the information Crewbase holds about you, including your workspace profiles, activity and records
            staff have made about you.
          </p>
          <a href="/api/me/export" className={`${primaryButtonClass} mt-4`}>Download my data</a>
        </Section>

        <Section title="Delete your account">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Ask Crewbase to delete your account and personal information. We’ll finish within 30 days. Docs and records you wrote
            for a workspace stay, credited to “Deleted user”. If you own a workspace, transfer it to someone else first. Our{" "}
            <Link href="/privacy" className="underline">Privacy Policy</Link> explains exactly what’s deleted and kept. Download your
            data first if you want a copy.
          </p>
          {openDeletion ? (
            <p className="mt-4 text-sm font-medium text-amber-700 dark:text-amber-300">Your deletion request is open. We’ll be in touch within 30 days.</p>
          ) : confirmDelete ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-zinc-700 dark:text-zinc-200">Send a deletion request to Crewbase staff?</span>
              <button disabled={busy} onClick={requestDeletion} className="inline-flex h-9 items-center rounded-lg bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40">
                Yes, request deletion
              </button>
              <button onClick={() => setConfirmDelete(false)} className={buttonClass}>Cancel</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className={`${dangerButtonClass} mt-4`}>Request account deletion</button>
          )}
        </Section>

        <Section title="Your reports" action={<Link href="/report" className={buttonClass}>New report</Link>}>
          {reports.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">You haven’t sent any reports.</p>
          ) : (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {reports.map((r) => (
                <li key={r.id} className="py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="zinc">{reportCategoryLabels[r.category] || r.category}</Badge>
                    <Badge tone={r.status === "open" ? "amber" : r.status === "resolved" ? "green" : "zinc"}>{r.status}</Badge>
                    <span className="text-xs text-zinc-500">{timeAgo(r.createdAt)}</span>
                  </div>
                  <p className="mt-1 truncate text-zinc-700 dark:text-zinc-300">{r.details}</p>
                  {r.resolution && <p className="mt-1 text-xs text-zinc-500">Staff reply: {r.resolution}</p>}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <p className="text-center text-xs text-zinc-500">
          <Link href="/terms" className="underline">Terms of Service</Link> · <Link href="/privacy" className="underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

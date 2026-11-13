import { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useRecoilState } from "recoil";
import { workspacestate } from "@/state";

/** Shared pieces for the Team tabs: navigation, data loading and small UI helpers. */

export const TEAM_TABS = [
  { slug: "announcements", label: "Announcements" },
  { slug: "chat", label: "Chat" },
  { slug: "events", label: "Events" },
  { slug: "swaps", label: "Shift swaps" },
  { slug: "trainings", label: "Trainings" },
  { slug: "reviews", label: "Reviews" },
  { slug: "polls", label: "Polls" },
  { slug: "kudos", label: "Kudos" },
  { slug: "tasks", label: "Tasks" },
  { slug: "ideas", label: "Ideas" },
  { slug: "onboarding", label: "Onboarding" },
  { slug: "spotlight", label: "Staff of the Month" },
  { slug: "links", label: "Links" },
];

export function TeamShell({ title, description, action, children }: { title: string; description: string; action?: React.ReactNode; children: React.ReactNode }) {
  const router = useRouter();
  const [ws] = useRecoilState(workspacestate);
  const id = router.query.id as string;
  const current = router.pathname.split("/").pop();
  const isManager = !!ws?.isAdmin || !!ws?.yourPermission?.includes("admin");
  const [hidden, setHidden] = useState<string[]>([]);
  useEffect(() => {
    if (!id) return;
    axios.get(`/api/workspace/${id}/team/features`).then((r) => setHidden(r.data.hiddenTabs || [])).catch(() => {});
  }, [id]);
  const visible = TEAM_TABS.filter((t) => !hidden.includes(t.slug));
  const tabs = isManager ? [...visible, { slug: "settings", label: "⚙ Settings" }] : visible;
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <Head>
        <title>{`${title} - Team`}</title>
      </Head>
      <nav className="-mx-1 mb-6 flex gap-1 overflow-x-auto pb-1 md:hidden" aria-label="Team sections">
        {tabs.map((t) => (
          <Link
            key={t.slug}
            href={`/workspace/${id}/team/${t.slug}`}
            aria-current={current === t.slug ? "page" : undefined}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              current === t.slug
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">{title}</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export type Item = { id: string; createdAt: string; createdBy: string | null; createdByName: string | null; [k: string]: any };

export const errorText = (e: any) => e?.response?.data?.error || "Something went wrong";

// Remembers recent results so pages open instantly when you come back to them
const teamCache = new Map<string, { items: Item[]; me: { id: string; isManager: boolean } }>();

/** Loads a Team collection and gives helpers to create, edit, delete and act on items. */
export function useTeam(collection: string) {
  const router = useRouter();
  const id = router.query.id as string;
  const base = `/api/workspace/${id}/team/${collection}`;
  const cached = id ? teamCache.get(base) : undefined;
  const [items, setItemsState] = useState<Item[]>(cached?.items || []);
  const [me, setMe] = useState<{ id: string; isManager: boolean }>(cached?.me || { id: "", isManager: false });
  const [loading, setLoading] = useState(!cached);
  const setItems: typeof setItemsState = (v) =>
    setItemsState((prev) => {
      const next = typeof v === "function" ? (v as any)(prev) : v;
      const c = teamCache.get(base);
      if (c) teamCache.set(base, { ...c, items: next });
      return next;
    });

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const r = await axios.get(base);
      teamCache.set(base, { items: r.data.items, me: r.data.me });
      setItemsState(r.data.items);
      setMe(r.data.me);
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setLoading(false);
    }
  }, [id, base]);
  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => Promise<any>, success?: string): Promise<boolean> => {
    try {
      await fn();
      if (success) toast.success(success);
      await load();
      return true;
    } catch (e) {
      toast.error(errorText(e));
      return false;
    }
  };

  return {
    id,
    items,
    setItems,
    me,
    loading,
    load,
    create: (data: any, success = "Saved") => run(() => axios.post(base, data), success),
    update: (itemId: string, data: any, success = "Saved") => run(() => axios.patch(`${base}/${itemId}`, data), success),
    remove: (itemId: string, success = "Deleted") => run(() => axios.delete(`${base}/${itemId}`), success),
    act: (itemId: string, action: string, data: any = {}, success?: string) => run(() => axios.post(`${base}/${itemId}`, { action, ...data }), success),
  };
}

export type Member = { userId: string; username: string; picture: string | null };

const membersCache = new Map<string, { at: number; members: Member[] }>();

export function useMembers() {
  const router = useRouter();
  const id = router.query.id as string;
  const [members, setMembers] = useState<Member[]>(() => (id && membersCache.get(id)?.members) || []);
  useEffect(() => {
    if (!id) return;
    const hit = membersCache.get(id);
    if (hit) setMembers(hit.members);
    if (hit && Date.now() - hit.at < 2 * 60_000) return;
    axios
      .get(`/api/workspace/${id}/team/members`)
      .then((r) => {
        membersCache.set(id, { at: Date.now(), members: r.data.members });
        setMembers(r.data.members);
      })
      .catch(() => {});
  }, [id]);
  return members;
}

export function MemberSelect({ members, value, onChange, id, label = "Member" }: { members: Member[]; value: string; onChange: (m: Member | null) => void; id: string; label?: string }) {
  return (
    <>
      <label htmlFor={id} className="sr-only">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(members.find((m) => m.userId === e.target.value) || null)} className={inputClass}>
        <option value="">Choose a member…</option>
        {members.map((m) => (
          <option key={m.userId} value={m.userId}>{m.username}</option>
        ))}
      </select>
    </>
  );
}

export const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white";
export const btn =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-700";
export const btnPrimary =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800 ${className}`}>{children}</div>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">{children}</p>;
}

export function ago(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString();
}

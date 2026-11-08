import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useRecoilState } from "recoil";
import { loginState } from "@/state";
import { IconSearch, IconCornerDownLeft } from "@tabler/icons-react";

type Item = { id: string; label: string; group: string; href: string; keywords?: string };

const WORKSPACE_PAGES: [string, string, string?][] = [
  ["", "Home", "dashboard overview"],
  ["/wall", "Wall", "posts feed"],
  ["/activity", "Activity", "hours quota tracking"],
  ["/sessions", "Sessions", "calendar shifts trainings"],
  ["/notices", "Notices", "inactivity leave away"],
  ["/quotas", "Quotas", "requirements"],
  ["/leaderboard", "Leaderboard", "top ranking"],
  ["/directory", "Directory", "members staff people"],
  ["/views", "Staff views", "members list filters"],
  ["/docs", "Docs", "guides handbook"],
  ["/policies", "Policies", "sign acknowledge"],
  ["/recommendations", "Recommendations", "promotion votes"],
  ["/applications", "Applications", "forms hiring"],
  ["/moderation", "Moderation", "cases bans evidence"],
  ["/alliances", "Alliances", "allies groups"],
  ["/team/announcements", "Announcements", "team news updates"],
  ["/team/chat", "Team chat", "messages talk"],
  ["/team/events", "Events", "calendar rsvp meetup"],
  ["/team/trainings", "Trainings & certifications", "certified training"],
  ["/team/reviews", "Reviews & feedback", "performance review feedback"],
  ["/team/polls", "Polls", "vote survey"],
  ["/team/kudos", "Kudos", "shoutout thanks recognition"],
  ["/settings", "Workspace settings", "config roles permissions"],
  ["/plan", "Plan & usage", "upgrade limits badge request"],
];

/**
 * Quick navigation for logged-in users. Open with Ctrl+K / ⌘K (or "/" when not typing).
 * Jumps to any workspace, any page in the current workspace, or account and help pages.
 */
export default function CommandPalette() {
  const [login] = useRecoilState(loginState);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const loggedIn = !!login?.username;

  useEffect(() => {
    if (!loggedIn) return;
    const onKey = (e: KeyboardEvent) => {
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName) || (e.target as HTMLElement)?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "/" && !typing && !open) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loggedIn, open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const list: Item[] = [];
    const currentId = router.pathname.startsWith("/workspace/") ? String(router.query.id || "") : "";
    if (currentId) {
      for (const [path, label, keywords] of WORKSPACE_PAGES) {
        list.push({ id: `page${path}`, label, group: "This workspace", href: `/workspace/${currentId}${path}`, keywords });
      }
    }
    for (const ws of login?.workspaces || []) {
      list.push({ id: `ws-${ws.groupId}`, label: ws.groupName || String(ws.groupId), group: "Workspaces", href: `/workspace/${ws.groupId}`, keywords: "switch group" });
    }
    list.push(
      { id: "all-ws", label: "All workspaces", group: "Go to", href: "/workspaces?home=true" },
      { id: "account", label: "Your account", group: "Go to", href: "/account", keywords: "profile data delete export" },
      { id: "report", label: "Report a problem", group: "Go to", href: "/report", keywords: "bug abuse help" },
      { id: "changelog", label: "What’s new", group: "Go to", href: "/changelog", keywords: "updates changelog" },
      { id: "plans", label: "Compare plans", group: "Go to", href: "/plans", keywords: "upgrade free" },
      { id: "help", label: "Help center", group: "Go to", href: "/help", keywords: "faq support questions" },
      { id: "status", label: "Site status", group: "Go to", href: "/status", keywords: "down outage" },
      { id: "home", label: "Crewbase homepage", group: "Go to", href: "/" }
    );
    if (login?.siteRole === "staff" || login?.siteRole === "admin") list.push({ id: "site-staff", label: "Site staff", group: "Crewbase team", href: "/site/staff", keywords: "reports users" });
    if (login?.siteRole === "admin") list.push({ id: "site-admin", label: "Site admin", group: "Crewbase team", href: "/site/admin", keywords: "settings health audit" });
    return list;
  }, [login, router.pathname, router.query.id]);

  const q = query.trim().toLowerCase();
  const results = q ? items.filter((i) => `${i.label} ${i.group} ${i.keywords || ""}`.toLowerCase().includes(q)) : items;

  useEffect(() => setActive(0), [q]);

  if (!open || !loggedIn) return null;

  const go = (item?: Item) => {
    if (!item) return;
    setOpen(false);
    router.push(item.href);
  };

  let lastGroup = "";

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 px-4 pt-[12vh]" onClick={() => setOpen(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick navigation"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-800"
      >
        <div className="flex items-center gap-3 border-b border-zinc-200 px-4 dark:border-zinc-700">
          <IconSearch className="h-5 w-5 text-zinc-400" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              if (e.key === "Enter") { e.preventDefault(); go(results[active]); }
            }}
            placeholder="Jump to a page or workspace…"
            aria-label="Search pages"
            className="h-14 flex-1 bg-transparent text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-white"
          />
          <kbd className="rounded border border-zinc-200 px-1.5 text-xs text-zinc-400 dark:border-zinc-600">Esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2" role="listbox">
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-zinc-500">No matches.</li>}
          {results.map((item, i) => {
            const header = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            return (
              <li key={item.id} role="option" aria-selected={i === active}>
                {header && <p className="px-3 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wider text-zinc-400">{header}</p>}
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                    i === active ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-700 dark:text-white" : "text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  {item.label}
                  {i === active && <IconCornerDownLeft className="h-4 w-4 text-zinc-400" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="border-t border-zinc-200 px-4 py-2 text-xs text-zinc-400 dark:border-zinc-700">
          ↑↓ to move · Enter to open · Ctrl+K or ⌘K anytime
        </p>
      </div>
    </div>
  );
}

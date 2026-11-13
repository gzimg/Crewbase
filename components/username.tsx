import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Crown, ShieldStar, ShieldCheck, Handshake, Plant, Flask, Bug, GitPullRequest, VideoCamera, DiscordLogo, IdentificationBadge,
} from "@phosphor-icons/react";

/**
 * A person’s name with their Crewbase badges. The workspace owner’s name is gold.
 * Badge data is fetched in small batches and shared across the page.
 */
const ICONS: Record<string, { Icon: any; color: string; label: string }> = {
  founder: { Icon: Crown, color: "#F2B428", label: "Crewbase founder" },
  site_admin: { Icon: ShieldStar, color: "#F28C28", label: "Crewbase site admin" },
  site_staff: { Icon: ShieldCheck, color: "#F28C28", label: "Crewbase staff" },
  partner: { Icon: Handshake, color: "#EAB308", label: "Crewbase partner" },
  early_supporter: { Icon: Plant, color: "#22C55E", label: "Early supporter" },
  beta_tester: { Icon: Flask, color: "#A855F7", label: "Beta tester" },
  bug_hunter: { Icon: Bug, color: "#EF4444", label: "Bug hunter" },
  contributor: { Icon: GitPullRequest, color: "#3B82F6", label: "Contributor" },
  content_creator: { Icon: VideoCamera, color: "#EC4899", label: "Content creator" },
  verified_discord: { Icon: DiscordLogo, color: "#5865F2", label: "Linked Discord" },
  passport: { Icon: IdentificationBadge, color: "#14B8A6", label: "Has a Staff Passport" },
};

type Store = { badges: Record<string, string[]>; owner: Record<string, string | null> };
const store: Store = { badges: {}, owner: {} };
let queue = new Set<string>();
let queueWorkspace = "";
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function request(id: string, workspace: string) {
  if (id in store.badges && workspace in store.owner) return;
  queue.add(id);
  queueWorkspace = workspace;
  if (timer) return;
  timer = setTimeout(async () => {
    const ids = Array.from(queue);
    const ws = queueWorkspace;
    queue = new Set();
    timer = null;
    try {
      const r = await fetch(`/api/badges?ids=${ids.join(",")}${ws ? `&workspace=${ws}` : ""}`).then((x) => x.json());
      Object.assign(store.badges, r.badges || {});
      if (ws) store.owner[ws] = r.ownerId;
    } catch {
      for (const id of ids) store.badges[id] = [];
    }
    listeners.forEach((l) => l());
  }, 30);
}

export function Badges({ userId, size = 14 }: { userId: string; size?: number }) {
  const router = useRouter();
  const ws = String(router.query.id || "");
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    if (userId) request(userId, ws);
    return () => { listeners.delete(l); };
  }, [userId, ws]);
  const list = store.badges[userId] || [];
  if (!list.length) return null;
  return (
    <span className="inline-flex items-center gap-0.5 align-middle">
      {list.map((b) => {
        const def = ICONS[b];
        if (!def) return null;
        const { Icon } = def;
        return (
          <span key={b} title={def.label} className="inline-flex">
            <Icon size={size} weight="fill" color={def.color} aria-label={def.label} role="img" />
          </span>
        );
      })}
    </span>
  );
}

/** A name, gold if they own this workspace, followed by their badges. */
export default function UserName({ userId, name, className = "" }: { userId?: string | null; name: string | null | undefined; className?: string }) {
  const router = useRouter();
  const ws = String(router.query.id || "");
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    if (userId) request(userId, ws);
    return () => { listeners.delete(l); };
  }, [userId, ws]);
  const isOwner = !!userId && !!ws && store.owner[ws] === userId;
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span className={isOwner ? "font-semibold text-[#E0A21B] dark:text-[#F2C14E]" : undefined} title={isOwner ? "Workspace owner" : undefined}>{name || "Someone"}</span>
      {userId && <Badges userId={userId} />}
    </span>
  );
}

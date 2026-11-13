import { createItem } from "@/utils/teamStore";
import type { Collection, TeamItem } from "@/utils/teamStore";

/**
 * The HR log: an automatic, permanent record of everything that happens in HR,
 * who did it and when. Only people with HR access can read it. It never names
 * the people behind anonymous complaints.
 */
const HR_COLLECTIONS: Collection[] = ["infractions", "complaints", "appeals", "pips", "resignations", "commendations", "investigations", "watchlist", "paths"];

const LABELS: Record<string, string> = {
  infractions: "Infraction", complaints: "Complaint", appeals: "Appeal", pips: "Improvement plan", resignations: "Resignation",
  commendations: "Commendation", investigations: "Investigation", watchlist: "Watchlist", paths: "Promotion path",
};

function subjectOf(item: TeamItem) {
  return item.username || item.toUsername || item.aboutUsername || (item.subjects || []).map((s: any) => s.username).join(", ") || item.title || item.fromRole || "";
}

export async function logHr(
  groupId: number,
  collection: Collection,
  action: string,
  item: TeamItem,
  actor: { id: string | null; name: string | null },
  detail = ""
) {
  if (!HR_COLLECTIONS.includes(collection)) return;
  const anonymous = (collection === "complaints" && item.anonymous && action === "created");
  try {
    await createItem(
      groupId,
      "hrlog",
      {
        type: collection,
        typeLabel: LABELS[collection],
        action,
        itemId: item.id,
        subject: collection === "complaints" ? item.aboutUsername || "" : subjectOf(item),
        subjectId: item.userId || item.aboutUserId || null,
        detail: String(detail || "").slice(0, 300),
        actorName: anonymous ? "Anonymous" : actor.name,
      },
      anonymous || !actor.id ? null : { id: actor.id, name: actor.name }
    );
  } catch (error) {
    console.error("[hr log] Couldn’t write log entry", error);
  }
}

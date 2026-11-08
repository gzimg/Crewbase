import type { Collection, TeamItem } from "@/utils/teamStore";

/**
 * Rules for each Team collection: who can see, create, change and delete items,
 * how input is checked, and the quick actions members can take (RSVP, vote, etc.).
 * "Managers" are workspace admins and anyone whose role has the Admin permission.
 */

export type Ctx = { id: string; name: string | null; isManager: boolean };
type Result = { data: Record<string, any> } | { error: string };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const bool = (v: unknown) => v === true;
const hex = (v: unknown, fallback = "#F28C28") => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback);
const userIdOf = (v: unknown) => (typeof v === "string" && /^\d{1,15}$/.test(v) ? v : typeof v === "number" ? String(v) : "");
const isoDate = (v: unknown) => {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
};
const clampInt = (v: unknown, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number(v) || 0)));

type Rule = {
  canCreate: (c: Ctx) => boolean;
  canEdit: (item: TeamItem, c: Ctx) => boolean;
  canDelete: (item: TeamItem, c: Ctx) => boolean;
  /** Returns what this person may see of the item, or null to hide it. */
  view: (item: TeamItem, c: Ctx) => TeamItem | null;
  validate: (body: any, c: Ctx, existing?: TeamItem) => Result;
  actions?: Record<string, (item: TeamItem, body: any, c: Ctx) => TeamItem | { error: string }>;
};

const managerOnly = (c: Ctx) => c.isManager;
const managerItem = (_item: TeamItem, c: Ctx) => c.isManager;
const authorOrManager = (item: TeamItem, c: Ctx) => c.isManager || item.createdBy === c.id;
const everyone = (item: TeamItem) => item;

export const RULES: Record<Collection, Rule> = {
  announcements: {
    canCreate: managerOnly,
    canEdit: managerItem,
    canDelete: managerItem,
    view: everyone,
    validate: (b) => {
      const title = str(b.title, 120);
      if (!title) return { error: "Add a title" };
      return { data: { title, body: str(b.body, 4000), pinned: bool(b.pinned), important: bool(b.important) } };
    },
    actions: {
      ack: (item, _b, c) => ({ ...item, readBy: Array.from(new Set([...(item.readBy || []), c.id])) }),
    },
  },

  chat: {
    canCreate: () => true,
    canEdit: (item, c) => item.createdBy === c.id,
    canDelete: authorOrManager,
    view: everyone,
    validate: (b) => {
      const text = str(b.text, 1000);
      if (!text) return { error: "Write a message" };
      return { data: { text } };
    },
  },

  events: {
    canCreate: managerOnly,
    canEdit: managerItem,
    canDelete: managerItem,
    view: everyone,
    validate: (b) => {
      const title = str(b.title, 120);
      const start = isoDate(b.start);
      const end = isoDate(b.end) || start;
      if (!title) return { error: "Add a title" };
      if (!start) return { error: "Pick a start time" };
      if (end && new Date(end) < new Date(start)) return { error: "The end must be after the start" };
      return { data: { title, description: str(b.description, 2000), start, end, location: str(b.location, 200), color: hex(b.color) } };
    },
    actions: {
      rsvp: (item, b, c) => {
        const answer = b?.answer;
        if (!["going", "maybe", "no", null].includes(answer)) return { error: "Invalid answer" };
        const rsvps = { ...(item.rsvps || {}) };
        if (answer === null) delete rsvps[c.id];
        else rsvps[c.id] = { answer, name: c.name };
        return { ...item, rsvps };
      },
    },
  },

  certifications: {
    canCreate: managerOnly,
    canEdit: managerItem,
    canDelete: managerItem,
    view: everyone,
    validate: (b) => {
      const name = str(b.name, 60);
      if (!name) return { error: "Name the certification" };
      return { data: { name, description: str(b.description, 500), color: hex(b.color, "#3B82F6"), validMonths: clampInt(b.validMonths, 0, 60) } };
    },
  },

  awards: {
    canCreate: managerOnly,
    canEdit: managerItem,
    canDelete: managerItem,
    view: everyone,
    validate: (b) => {
      const userId = userIdOf(b.userId);
      const certId = str(b.certId, 24);
      if (!userId || !certId) return { error: "Pick a member and a certification" };
      return {
        data: {
          userId,
          username: str(b.username, 50),
          certId,
          note: str(b.note, 300),
          awardedAt: isoDate(b.awardedAt) || new Date().toISOString(),
          expiresAt: isoDate(b.expiresAt),
        },
      };
    },
  },

  reviews: {
    canCreate: managerOnly,
    canEdit: managerItem,
    canDelete: managerItem,
    // Managers see every review. Members only see reviews about them that were shared with them.
    view: (item, c) => (c.isManager || (item.userId === c.id && item.shared) ? item : null),
    validate: (b) => {
      const userId = userIdOf(b.userId);
      if (!userId) return { error: "Pick a member" };
      const ratings: Record<string, number> = {};
      for (const k of ["reliability", "communication", "activity", "teamwork", "leadership"]) {
        const v = Number(b.ratings?.[k]);
        if (v >= 1 && v <= 5) ratings[k] = Math.round(v);
      }
      return {
        data: {
          userId,
          username: str(b.username, 50),
          period: str(b.period, 60) || new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
          ratings,
          strengths: str(b.strengths, 2000),
          improvements: str(b.improvements, 2000),
          goals: str(b.goals, 2000),
          shared: bool(b.shared),
        },
      };
    },
    actions: {
      acknowledge: (item, _b, c) => (item.userId === c.id ? { ...item, acknowledgedAt: new Date().toISOString() } : { error: "Only the reviewed member can do this" }),
    },
  },

  feedback: {
    canCreate: () => true,
    canEdit: () => false,
    canDelete: managerItem,
    // Feedback goes to managers. Senders can see their own (named) feedback.
    view: (item, c) => (c.isManager ? item : item.createdBy === c.id ? item : null),
    validate: (b) => {
      const text = str(b.text, 2000);
      if (text.length < 5) return { error: "Write a little more" };
      const category = ["idea", "concern", "praise", "other"].includes(b.category) ? b.category : "other";
      return { data: { text, category, anonymous: bool(b.anonymous), status: "new" } };
    },
    actions: {
      status: (item, b, c) => {
        if (!c.isManager) return { error: "Only managers can do this" };
        if (!["new", "seen", "done"].includes(b?.status)) return { error: "Invalid status" };
        return { ...item, status: b.status, reply: str(b.reply, 1000) || item.reply };
      },
    },
  },

  polls: {
    canCreate: managerOnly,
    canEdit: managerItem,
    canDelete: managerItem,
    // Anonymous polls only show totals to everyone
    view: (item, c) => {
      if (!item.anonymous || c.isManager) return item;
      const votes = item.votes || {};
      const mine = votes[c.id];
      const tally: Record<string, number> = {};
      for (const v of Object.values(votes) as any[]) tally[v.option] = (tally[v.option] || 0) + 1;
      return { ...item, votes: mine ? { [c.id]: mine } : {}, tally };
    },
    validate: (b) => {
      const question = str(b.question, 200);
      const options = Array.isArray(b.options) ? b.options.map((o: unknown) => str(o, 80)).filter(Boolean).slice(0, 8) : [];
      if (!question) return { error: "Ask a question" };
      if (options.length < 2) return { error: "Add at least two options" };
      return { data: { question, options, anonymous: bool(b.anonymous), closesAt: isoDate(b.closesAt) } };
    },
    actions: {
      vote: (item, b, c) => {
        if (item.closesAt && new Date(item.closesAt) < new Date()) return { error: "This poll has closed" };
        const option = Number(b?.option);
        if (!Number.isInteger(option) || option < 0 || option >= item.options.length) return { error: "Pick an option" };
        return { ...item, votes: { ...(item.votes || {}), [c.id]: { option, name: c.name } } };
      },
    },
  },

  kudos: {
    canCreate: () => true,
    canEdit: () => false,
    canDelete: authorOrManager,
    view: everyone,
    validate: (b, c) => {
      const toUserId = userIdOf(b.toUserId);
      const message = str(b.message, 500);
      if (!toUserId) return { error: "Pick who it’s for" };
      if (toUserId === c.id) return { error: "Kudos are for other people" };
      if (message.length < 3) return { error: "Say why they deserve it" };
      const emoji = ["⭐", "🔥", "🙌", "💪", "🏆", "❤️", "🎉", "🧠"].includes(b.emoji) ? b.emoji : "⭐";
      return { data: { toUserId, toUsername: str(b.toUsername, 50), message, emoji } };
    },
    actions: {
      cheer: (item, _b, c) => {
        const cheers: string[] = item.cheers || [];
        return { ...item, cheers: cheers.includes(c.id) ? cheers.filter((x) => x !== c.id) : [...cheers, c.id] };
      },
    },
  },
};

/** Strips who sent anonymous feedback before anyone sees it. */
export function finalize(collection: Collection, item: TeamItem): TeamItem {
  if (collection === "feedback" && item.anonymous) return { ...item, createdBy: null, createdByName: null };
  return item;
}

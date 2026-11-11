import type { Collection, TeamItem } from "@/utils/teamStore";

/**
 * Rules for each Team collection: who can see, create, change and delete items,
 * how input is checked, and the quick actions members can take (RSVP, vote, etc.).
 * "Managers" are workspace admins and anyone whose role has the Admin permission.
 */

export type Ctx = { id: string; name: string | null; isManager: boolean; perms?: string[] };

/* ---------- Human resources ---------- */
// HR permissions (set on roles in workspace settings). Workspace admins have all of them.
export const HR_PERMS = ["hr.view", "hr.infractions", "hr.cases", "hr.plans", "hr.resignations"] as const;
export const hasHR = (c: Ctx, perm: (typeof HR_PERMS)[number]) => c.isManager || !!c.perms?.includes(perm);
export const isHR = (c: Ctx) => c.isManager || HR_PERMS.some((p) => c.perms?.includes(p));

export const INFRACTION_LEVELS: Record<string, { label: string; points: number; days: number | null }> = {
  verbal: { label: "Verbal warning", points: 1, days: 30 },
  written: { label: "Written warning", points: 2, days: 60 },
  final: { label: "Final warning", points: 4, days: 90 },
  suspension: { label: "Suspension", points: 5, days: 120 },
  demotion: { label: "Demotion", points: 6, days: 180 },
  termination: { label: "Termination", points: 10, days: null },
};
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

  tasks: {
    canCreate: () => true,
    canEdit: (item, c) => c.isManager || item.createdBy === c.id || item.assigneeId === c.id,
    canDelete: authorOrManager,
    view: everyone,
    validate: (b) => {
      const title = str(b.title, 160);
      if (!title) return { error: "Name the task" };
      const status = ["todo", "doing", "done"].includes(b.status) ? b.status : "todo";
      const priority = ["low", "normal", "high"].includes(b.priority) ? b.priority : "normal";
      const assigneeId = userIdOf(b.assigneeId) || null;
      return {
        data: {
          title,
          description: str(b.description, 2000),
          status,
          priority,
          assigneeId,
          assigneeName: assigneeId ? str(b.assigneeName, 50) : null,
          due: isoDate(b.due),
        },
      };
    },
    actions: {
      move: (item, b, c) => {
        if (!(c.isManager || item.createdBy === c.id || item.assigneeId === c.id)) return { error: "Only the assignee, creator or a manager can move this" };
        if (!["todo", "doing", "done"].includes(b?.status)) return { error: "Invalid status" };
        return { ...item, status: b.status, completedAt: b.status === "done" ? new Date().toISOString() : null };
      },
      claim: (item, _b, c) => (item.assigneeId ? { error: "Someone already has this task" } : { ...item, assigneeId: c.id, assigneeName: c.name }),
    },
  },

  ideas: {
    canCreate: () => true,
    canEdit: (item, c) => item.createdBy === c.id && item.status === "open",
    canDelete: authorOrManager,
    view: everyone,
    validate: (b, _c, existing) => {
      const title = str(b.title, 140);
      if (!title) return { error: "Give your idea a title" };
      return { data: { title, details: str(b.details, 2000), status: existing?.status || "open", voters: existing?.voters || [] } };
    },
    actions: {
      upvote: (item, _b, c) => {
        const voters: string[] = item.voters || [];
        return { ...item, voters: voters.includes(c.id) ? voters.filter((v) => v !== c.id) : [...voters, c.id] };
      },
      status: (item, b, c) => {
        if (!c.isManager) return { error: "Only managers can change an idea’s status" };
        if (!["open", "planned", "done", "declined"].includes(b?.status)) return { error: "Invalid status" };
        return { ...item, status: b.status, response: str(b.response, 500) || item.response || "" };
      },
    },
  },

  checklists: {
    canCreate: managerOnly,
    canEdit: managerItem,
    canDelete: managerItem,
    view: everyone,
    validate: (b) => {
      const name = str(b.name, 80);
      const steps = Array.isArray(b.steps) ? b.steps.map((s: unknown) => str(s, 200)).filter(Boolean).slice(0, 30) : [];
      if (!name) return { error: "Name the checklist" };
      if (!steps.length) return { error: "Add at least one step" };
      return { data: { name, description: str(b.description, 500), steps } };
    },
  },

  onboarding: {
    canCreate: managerOnly,
    canEdit: managerItem,
    canDelete: managerItem,
    // Members see their own onboarding; managers see everyone’s
    view: (item, c) => (c.isManager || item.userId === c.id ? item : null),
    validate: (b) => {
      const userId = userIdOf(b.userId);
      const steps = Array.isArray(b.steps)
        ? b.steps
            .map((s: any) => (typeof s === "string" ? { text: str(s, 200), done: false } : { text: str(s?.text, 200), done: bool(s?.done), doneAt: s?.doneAt || null }))
            .filter((s: any) => s.text)
            .slice(0, 30)
        : [];
      if (!userId) return { error: "Pick a member" };
      if (!steps.length) return { error: "The checklist has no steps" };
      return { data: { userId, username: str(b.username, 50), name: str(b.name, 80) || "Onboarding", steps, due: isoDate(b.due) } };
    },
    actions: {
      toggle: (item, b, c) => {
        if (!(c.isManager || item.userId === c.id)) return { error: "This isn’t your checklist" };
        const i = Number(b?.step);
        if (!Number.isInteger(i) || i < 0 || i >= item.steps.length) return { error: "Invalid step" };
        const steps = item.steps.map((s: any, j: number) => (j === i ? { ...s, done: !s.done, doneAt: !s.done ? new Date().toISOString() : null } : s));
        const complete = steps.every((s: any) => s.done);
        return { ...item, steps, completedAt: complete ? item.completedAt || new Date().toISOString() : null };
      },
    },
  },

  links: {
    canCreate: managerOnly,
    canEdit: managerItem,
    canDelete: managerItem,
    view: everyone,
    validate: (b) => {
      const title = str(b.title, 100);
      const url = str(b.url, 500);
      if (!title) return { error: "Add a title" };
      try {
        const parsed = new URL(url);
        if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
      } catch {
        return { error: "Add a full link starting with https://" };
      }
      return { data: { title, url, description: str(b.description, 300), category: str(b.category, 40) || "General", pinned: bool(b.pinned) } };
    },
  },

  nominations: {
    canCreate: () => true,
    canEdit: () => false,
    canDelete: authorOrManager,
    view: everyone,
    validate: (b, c) => {
      const nomineeId = userIdOf(b.nomineeId);
      if (!nomineeId) return { error: "Pick who you’re nominating" };
      if (nomineeId === c.id) return { error: "You can’t nominate yourself" };
      const reason = str(b.reason, 600);
      if (reason.length < 10) return { error: "Tell us why (at least 10 characters)" };
      const month = new Date().toISOString().slice(0, 7);
      return { data: { nomineeId, nomineeName: str(b.nomineeName, 50), reason, month, voters: [], winner: false } };
    },
    actions: {
      upvote: (item, _b, c) => {
        if (item.month !== new Date().toISOString().slice(0, 7)) return { error: "Voting for that month has closed" };
        const voters: string[] = item.voters || [];
        return { ...item, voters: voters.includes(c.id) ? voters.filter((v) => v !== c.id) : [...voters, c.id] };
      },
      winner: (item, _b, c) => (c.isManager ? { ...item, winner: !item.winner } : { error: "Only managers can pick the winner" }),
    },
  },

  infractions: {
    canCreate: (c) => hasHR(c, "hr.infractions"),
    canEdit: (_i, c) => hasHR(c, "hr.infractions"),
    canDelete: (_i, c) => hasHR(c, "hr.infractions"),
    // Members always see infractions given to them; HR sees everyone’s
    view: (item, c) => (hasHR(c, "hr.view") || hasHR(c, "hr.infractions") || item.userId === c.id ? item : null),
    validate: (b, _c, existing) => {
      const userId = userIdOf(b.userId);
      const level = INFRACTION_LEVELS[b.level] ? b.level : null;
      const reason = str(b.reason, 200);
      if (!userId) return { error: "Pick a member" };
      if (!level) return { error: "Pick an infraction level" };
      if (!reason) return { error: "Give a reason" };
      const def = INFRACTION_LEVELS[level];
      const issued = existing?.issuedAt || new Date().toISOString();
      const expiresAt = isoDate(b.expiresAt) ?? (def.days ? new Date(new Date(issued).getTime() + def.days * 86_400_000).toISOString() : null);
      return {
        data: {
          userId,
          username: str(b.username, 50),
          level,
          points: clampInt(b.points ?? def.points, 0, 20),
          reason,
          details: str(b.details, 3000),
          issuedAt: issued,
          expiresAt,
          status: existing?.status || "active",
        },
      };
    },
    actions: {
      revoke: (item, b, c) =>
        hasHR(c, "hr.infractions") ? { ...item, status: "revoked", revokedReason: str(b?.reason, 300), revokedBy: c.name, revokedAt: new Date().toISOString() } : { error: "You can’t do this" },
      acknowledge: (item, _b, c) => (item.userId === c.id ? { ...item, acknowledgedAt: new Date().toISOString() } : { error: "Only the member can acknowledge this" }),
    },
  },

  complaints: {
    canCreate: () => true,
    canEdit: () => false,
    canDelete: (_i, c) => hasHR(c, "hr.cases"),
    // HR sees all; the person who raised it sees theirs, but never HR’s private notes
    view: (item, c) => {
      if (hasHR(c, "hr.cases") || hasHR(c, "hr.view")) return item;
      if (item.createdBy === c.id) return { ...item, notes: [] };
      return null;
    },
    validate: (b) => {
      const subject = str(b.subject, 140);
      const details = str(b.details, 4000);
      if (!subject) return { error: "Add a subject" };
      if (details.length < 20) return { error: "Please describe what happened (at least 20 characters)" };
      const category = ["conduct", "harassment", "unfair", "safety", "other"].includes(b.category) ? b.category : "other";
      return { data: { subject, details, category, aboutUserId: userIdOf(b.aboutUserId) || null, aboutUsername: str(b.aboutUsername, 50) || null, anonymous: bool(b.anonymous), status: "new", notes: [], outcome: "" } };
    },
    actions: {
      status: (item, b, c) => {
        if (!hasHR(c, "hr.cases")) return { error: "You can’t do this" };
        if (!["new", "investigating", "resolved", "closed"].includes(b?.status)) return { error: "Invalid status" };
        return { ...item, status: b.status, outcome: str(b.outcome, 1500) || item.outcome, handledBy: c.name };
      },
      note: (item, b, c) => {
        if (!hasHR(c, "hr.cases")) return { error: "You can’t do this" };
        const text = str(b?.text, 2000);
        if (!text) return { error: "Write a note" };
        return { ...item, notes: [...(item.notes || []), { by: c.name, at: new Date().toISOString(), text }].slice(-100) };
      },
    },
  },

  appeals: {
    canCreate: () => true,
    canEdit: () => false,
    canDelete: (_i, c) => hasHR(c, "hr.cases"),
    view: (item, c) => (hasHR(c, "hr.cases") || hasHR(c, "hr.view") || item.createdBy === c.id ? item : null),
    validate: (b) => {
      const infractionId = str(b.infractionId, 24);
      const reason = str(b.reason, 3000);
      if (!infractionId) return { error: "Pick the infraction you’re appealing" };
      if (reason.length < 20) return { error: "Explain why (at least 20 characters)" };
      return { data: { infractionId, infractionLabel: str(b.infractionLabel, 120), reason, status: "pending", decision: null, response: "" } };
    },
    actions: {
      decide: (item, b, c) => {
        if (!hasHR(c, "hr.cases")) return { error: "You can’t do this" };
        if (!["upheld", "overturned", "reduced"].includes(b?.decision)) return { error: "Pick a decision" };
        return { ...item, status: "decided", decision: b.decision, response: str(b.response, 1500), decidedBy: c.name, decidedAt: new Date().toISOString() };
      },
    },
  },

  pips: {
    canCreate: (c) => hasHR(c, "hr.plans"),
    canEdit: (_i, c) => hasHR(c, "hr.plans"),
    canDelete: (_i, c) => hasHR(c, "hr.plans"),
    view: (item, c) => (hasHR(c, "hr.plans") || hasHR(c, "hr.view") || item.userId === c.id ? item : null),
    validate: (b, _c, existing) => {
      const userId = userIdOf(b.userId);
      if (!userId) return { error: "Pick a member" };
      const goals = Array.isArray(b.goals)
        ? b.goals.map((g: any) => (typeof g === "string" ? { text: str(g, 200), done: false } : { text: str(g?.text, 200), done: bool(g?.done) })).filter((g: any) => g.text).slice(0, 15)
        : [];
      if (!goals.length) return { error: "Add at least one goal" };
      return {
        data: {
          userId,
          username: str(b.username, 50),
          concern: str(b.concern, 2000),
          goals,
          support: str(b.support, 2000),
          reviewDate: isoDate(b.reviewDate),
          status: existing?.status || "active",
          checkins: existing?.checkins || [],
        },
      };
    },
    actions: {
      goal: (item, b, c) => {
        if (!hasHR(c, "hr.plans")) return { error: "You can’t do this" };
        const i = Number(b?.index);
        if (!Number.isInteger(i) || i < 0 || i >= item.goals.length) return { error: "Invalid goal" };
        return { ...item, goals: item.goals.map((g: any, j: number) => (j === i ? { ...g, done: !g.done } : g)) };
      },
      checkin: (item, b, c) => {
        if (!hasHR(c, "hr.plans")) return { error: "You can’t do this" };
        const text = str(b?.text, 2000);
        if (!text) return { error: "Write a check-in note" };
        return { ...item, checkins: [...(item.checkins || []), { by: c.name, at: new Date().toISOString(), text }].slice(-50) };
      },
      outcome: (item, b, c) => {
        if (!hasHR(c, "hr.plans")) return { error: "You can’t do this" };
        if (!["active", "passed", "extended", "unsuccessful"].includes(b?.status)) return { error: "Invalid outcome" };
        return { ...item, status: b.status, closedAt: b.status === "active" ? null : new Date().toISOString() };
      },
      acknowledge: (item, _b, c) => (item.userId === c.id ? { ...item, acknowledgedAt: new Date().toISOString() } : { error: "Only the member can acknowledge this" }),
    },
  },

  resignations: {
    canCreate: () => true,
    canEdit: () => false,
    canDelete: (_i, c) => hasHR(c, "hr.resignations"),
    view: (item, c) => (hasHR(c, "hr.resignations") || hasHR(c, "hr.view") || item.createdBy === c.id ? item : null),
    validate: (b) => {
      const lastDay = isoDate(b.lastDay);
      if (!lastDay) return { error: "Pick your last day" };
      return {
        data: {
          lastDay,
          reason: ["time", "school", "other_group", "not_enjoying", "conflict", "personal", "other"].includes(b.reason) ? b.reason : "other",
          wentWell: str(b.wentWell, 2000),
          improve: str(b.improve, 2000),
          wouldReturn: ["yes", "maybe", "no"].includes(b.wouldReturn) ? b.wouldReturn : "maybe",
          status: "received",
        },
      };
    },
    actions: {
      process: (item, b, c) => {
        if (!hasHR(c, "hr.resignations")) return { error: "You can’t do this" };
        if (!["received", "processed", "withdrawn"].includes(b?.status)) return { error: "Invalid status" };
        return { ...item, status: b.status, hrMessage: str(b.message, 1000) || item.hrMessage, processedBy: c.name };
      },
      withdraw: (item, _b, c) => (item.createdBy === c.id && item.status === "received" ? { ...item, status: "withdrawn" } : { error: "You can’t withdraw this now" }),
    },
  },

  // Promotion paths: what it takes to move from one role to the next
  paths: {
    canCreate: managerOnly,
    canEdit: managerItem,
    canDelete: managerItem,
    view: everyone,
    validate: (b) => {
      const fromRole = str(b.fromRole, 60);
      const toRole = str(b.toRole, 60);
      if (!fromRole || !toRole) return { error: "Pick the current role and the next role" };
      const c = b.criteria || {};
      return {
        data: {
          fromRole,
          toRole,
          note: str(b.note, 500),
          criteria: {
            minHoursPerWeek: Math.min(168, Math.max(0, Number(c.minHoursPerWeek) || 0)),
            minDaysOnTeam: clampInt(c.minDaysOnTeam, 0, 3650),
            certIds: Array.isArray(c.certIds) ? c.certIds.map((x: unknown) => str(x, 24)).filter(Boolean).slice(0, 10) : [],
            noActiveInfractions: bool(c.noActiveInfractions),
            minKudos: clampInt(c.minKudos, 0, 1000),
            minReviewAverage: Math.min(5, Math.max(0, Number(c.minReviewAverage) || 0)),
          },
        },
      };
    },
  },
};

/** Strips who sent anonymous feedback before anyone sees it. */
export function finalize(collection: Collection, item: TeamItem): TeamItem {
  if ((collection === "feedback" || collection === "complaints") && item.anonymous) return { ...item, createdBy: null, createdByName: null };
  return item;
}

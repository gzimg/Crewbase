import prisma from "@/utils/database";

/**
 * Crewbase plans. Plans are free: workspaces get a higher plan by requesting
 * one (site staff approve), by staff assigning it, or automatically once they
 * qualify. Every workspace has a plan badge, and site staff can also add custom
 * badges to any workspace without changing its plan.
 *
 * Everything is stored in the instanceConfig table as JSON (no migration needed).
 */

export type PlanId = "starter" | "plus" | "pro";
export const PLAN_ORDER: PlanId[] = ["starter", "plus", "pro"];

export type PlanFeature = "discord" | "api" | "bloxlink" | "priority_support" | "custom_badges";

export const FEATURE_LABELS: Record<PlanFeature, string> = {
  discord: "Discord integration",
  api: "Public API keys",
  bloxlink: "Bloxlink integration",
  priority_support: "Priority support",
  custom_badges: "Eligible for custom badges",
};

export type PlanDefinition = {
  name: string;
  tagline: string;
  color: string; // badge colour (hex)
  limits: {
    members: number; // soft limit: shown as a warning
    evidenceFiles: number; // hard limit on stored moderation evidence files
    evidenceFileMb: number; // largest single evidence file
    apiKeys: number; // hard limit on API keys
  };
  features: PlanFeature[];
};

export type PlanConfig = {
  defaultPlan: PlanId;
  plans: Record<PlanId, PlanDefinition>;
  auto: { enabled: boolean; toPlan: PlanId; minMembers: number; minAgeDays: number };
  requests: { open: boolean };
  // What a workspace needs before it can request each plan
  requirements: Record<PlanId, { minGroupMembers: number; minWorkspaceDays: number }>;
};

export const DEFAULT_PLAN_CONFIG: PlanConfig = {
  defaultPlan: "starter",
  plans: {
    starter: {
      name: "Starter",
      tagline: "Everything a new staff team needs.",
      color: "#71717A",
      limits: { members: 50, evidenceFiles: 100, evidenceFileMb: 5, apiKeys: 1 },
      features: [],
    },
    plus: {
      name: "Plus",
      tagline: "For established groups with growing teams.",
      color: "#3B82F6",
      limits: { members: 250, evidenceFiles: 1000, evidenceFileMb: 15, apiKeys: 5 },
      features: ["discord", "api", "bloxlink"],
    },
    pro: {
      name: "Pro",
      tagline: "For large communities that run on Crewbase.",
      color: "#F28C28",
      limits: { members: 2000, evidenceFiles: 10000, evidenceFileMb: 25, apiKeys: 20 },
      features: ["discord", "api", "bloxlink", "priority_support", "custom_badges"],
    },
  },
  auto: { enabled: true, toPlan: "plus", minMembers: 25, minAgeDays: 14 },
  requests: { open: true },
  requirements: {
    starter: { minGroupMembers: 0, minWorkspaceDays: 0 },
    plus: { minGroupMembers: 50, minWorkspaceDays: 7 },
    pro: { minGroupMembers: 500, minWorkspaceDays: 30 },
  },
};

export type WorkspacePlan = {
  plan: PlanId;
  source: "default" | "request" | "staff" | "auto";
  since: string;
  by?: string;
  expiresAt?: string | null;
  note?: string;
};

export type WorkspaceBadge = { id: string; label: string; color: string; description?: string; by: string; at: string };

export type PlanRequest = {
  id: string;
  groupId: string;
  plan: PlanId;
  status: "pending" | "approved" | "declined" | "cancelled";
  requestedBy: string;
  reason: string;
  memberCount: number;
  groupMembers?: number | null;
  discordInvite?: string;
  staffCount?: number;
  createdAt: string;
  handledBy?: string;
  handledAt?: string;
  response?: string;
};

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.instanceConfig.findUnique({ where: { key } });
  return (row?.value as unknown as T) ?? fallback;
}
async function writeJson(key: string, value: unknown): Promise<void> {
  await prisma.instanceConfig.upsert({ where: { key }, update: { value: value as any }, create: { key, value: value as any } });
}

/* ---------- Config ---------- */

let configCache: { value: PlanConfig; at: number } | null = null;

export async function getPlanConfig(fresh = false): Promise<PlanConfig> {
  if (!fresh && configCache && Date.now() - configCache.at < 15_000) return configCache.value;
  const stored = await readJson<Partial<PlanConfig>>("site_plan_config", {});
  const value: PlanConfig = {
    defaultPlan: stored.defaultPlan && PLAN_ORDER.includes(stored.defaultPlan) ? stored.defaultPlan : DEFAULT_PLAN_CONFIG.defaultPlan,
    plans: Object.fromEntries(
      PLAN_ORDER.map((id) => {
        const base = DEFAULT_PLAN_CONFIG.plans[id];
        const s = (stored.plans as any)?.[id] || {};
        return [id, { ...base, ...s, limits: { ...base.limits, ...(s.limits || {}) }, features: Array.isArray(s.features) ? s.features : base.features }];
      })
    ) as Record<PlanId, PlanDefinition>,
    auto: { ...DEFAULT_PLAN_CONFIG.auto, ...(stored.auto || {}) },
    requests: { ...DEFAULT_PLAN_CONFIG.requests, ...(stored.requests || {}) },
    requirements: Object.fromEntries(
      PLAN_ORDER.map((id) => [id, { ...DEFAULT_PLAN_CONFIG.requirements[id], ...((stored as any).requirements?.[id] || {}) }])
    ) as PlanConfig["requirements"],
  };
  configCache = { value, at: Date.now() };
  return value;
}

export async function savePlanConfig(config: PlanConfig): Promise<void> {
  await writeJson("site_plan_config", config);
  configCache = { value: config, at: Date.now() };
}

/* ---------- Workspace plans ---------- */

export async function getAllWorkspacePlans(): Promise<Record<string, WorkspacePlan>> {
  return readJson<Record<string, WorkspacePlan>>("site_workspace_plans", {});
}

export async function getWorkspacePlan(groupId: string | number | bigint): Promise<WorkspacePlan> {
  const [all, config] = await Promise.all([getAllWorkspacePlans(), getPlanConfig()]);
  const stored = all[String(groupId)];
  if (stored && PLAN_ORDER.includes(stored.plan)) {
    // A plan past its end date falls back to the default
    if (stored.expiresAt && new Date(stored.expiresAt).getTime() < Date.now()) {
      return { plan: config.defaultPlan, source: "default", since: stored.expiresAt };
    }
    return stored;
  }
  return { plan: config.defaultPlan, source: "default", since: new Date(0).toISOString() };
}

export async function setWorkspacePlan(groupId: string, plan: WorkspacePlan | null): Promise<void> {
  const all = await getAllWorkspacePlans();
  if (plan) all[groupId] = plan;
  else delete all[groupId];
  await writeJson("site_workspace_plans", all);
  // Keep a short history of plan changes for the workspace’s Plan page
  const history = await readJson<Record<string, PlanHistoryEntry[]>>("site_plan_history", {});
  const config = await getPlanConfig();
  const entry: PlanHistoryEntry = { at: new Date().toISOString(), plan: plan?.plan || config.defaultPlan, source: plan?.source || "default", expiresAt: plan?.expiresAt ?? null };
  history[groupId] = [entry, ...(history[groupId] || [])].slice(0, 30);
  await writeJson("site_plan_history", history);
}

export type PlanHistoryEntry = { at: string; plan: PlanId; source: string; expiresAt: string | null };

export async function getPlanHistory(groupId: string): Promise<PlanHistoryEntry[]> {
  const history = await readJson<Record<string, PlanHistoryEntry[]>>("site_plan_history", {});
  return history[groupId] || [];
}

/** How a workspace measures up against each plan’s request requirements. */
export async function getEligibility(groupId: string) {
  const config = await getPlanConfig();
  const { getGroupInfo } = await import("@/utils/roblox");
  const [info, seenRow, firstMember] = await Promise.all([
    getGroupInfo(Number(groupId)).catch(() => null) as Promise<any>,
    prisma.instanceConfig.findUnique({ where: { key: "site_workspace_first_seen" } }),
    prisma.workspaceMember.findFirst({ where: { workspaceGroupId: BigInt(groupId) }, orderBy: { joinDate: "asc" }, select: { joinDate: true } }),
  ]);
  const groupMembers: number | null = typeof info?.memberCount === "number" ? info.memberCount : null;
  const firstSeen = (seenRow?.value as any)?.[groupId] || firstMember?.joinDate || null;
  const ageDays = firstSeen ? Math.floor((Date.now() - new Date(firstSeen).getTime()) / 86_400_000) : 0;
  const plans = Object.fromEntries(
    PLAN_ORDER.map((id) => {
      const r = config.requirements[id];
      const missing: string[] = [];
      if (r.minGroupMembers && (groupMembers ?? 0) < r.minGroupMembers) missing.push(`${r.minGroupMembers.toLocaleString()}+ members in your Roblox group`);
      if (r.minWorkspaceDays && ageDays < r.minWorkspaceDays) missing.push(`a workspace at least ${r.minWorkspaceDays} days old`);
      return [id, { eligible: missing.length === 0, missing, requirements: r }];
    })
  ) as Record<PlanId, { eligible: boolean; missing: string[]; requirements: { minGroupMembers: number; minWorkspaceDays: number } }>;
  return { groupMembers, ageDays, plans };
}

export async function getPlanDefinition(groupId: string | number | bigint): Promise<{ id: PlanId; def: PlanDefinition; record: WorkspacePlan }> {
  const [record, config] = await Promise.all([getWorkspacePlan(groupId), getPlanConfig()]);
  return { id: record.plan, def: config.plans[record.plan], record };
}

export async function workspaceHasFeature(groupId: string | number | bigint, feature: PlanFeature): Promise<boolean> {
  const { def } = await getPlanDefinition(groupId);
  return def.features.includes(feature);
}

/** Standard error body when a plan doesn't include something. */
export function planUpgradeError(what: string) {
  return {
    success: false,
    error: `${what} isn’t included in this workspace’s plan. A workspace admin can request a higher plan from the Plan page.`,
    code: "plan_limit",
  };
}

/* ---------- Badges ---------- */

export async function getAllWorkspaceBadges(): Promise<Record<string, WorkspaceBadge[]>> {
  return readJson<Record<string, WorkspaceBadge[]>>("site_workspace_badges", {});
}
export async function getWorkspaceBadges(groupId: string): Promise<WorkspaceBadge[]> {
  return (await getAllWorkspaceBadges())[groupId] ?? [];
}
export async function setWorkspaceBadges(groupId: string, badges: WorkspaceBadge[]): Promise<void> {
  const all = await getAllWorkspaceBadges();
  if (badges.length) all[groupId] = badges.slice(0, 10);
  else delete all[groupId];
  await writeJson("site_workspace_badges", all);
}

/* ---------- Requests ---------- */

export async function getPlanRequests(): Promise<PlanRequest[]> {
  const list = await readJson<PlanRequest[]>("site_plan_requests", []);
  return Array.isArray(list) ? list : [];
}
export async function savePlanRequests(list: PlanRequest[]): Promise<void> {
  const pending = list.filter((r) => r.status === "pending");
  const rest = list.filter((r) => r.status !== "pending");
  await writeJson("site_plan_requests", [...pending, ...rest].slice(0, Math.max(1000, pending.length)));
}

/* ---------- Usage ---------- */

export async function getWorkspaceUsage(groupId: string) {
  const id = BigInt(groupId);
  const [members, evidenceFiles, apiKeys] = await Promise.all([
    prisma.workspaceMember.count({ where: { workspaceGroupId: id } }),
    prisma.moderationEvidence
      .count({ where: { case: { workspaceGroupId: id }, NOT: { fileType: "external_link" } } })
      .catch(() => 0),
    prisma.apiKey.count({ where: { workspaceGroupId: id } }).catch(() => 0),
  ]);
  return { members, evidenceFiles, apiKeys };
}

export function isValidHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

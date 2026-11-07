/** Small shared UI pieces for the site staff and admin pages. */

export function Badge({ tone, children }: { tone: "amber" | "blue" | "red" | "green" | "zinc"; children: React.ReactNode }) {
  const tones = {
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
    red: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
    green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    zinc: "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200",
  };
  return <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}>{children}</span>;
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (id: T) => void }) {
  return (
    <div className="mb-6 flex gap-1 overflow-x-auto border-b border-zinc-200 dark:border-zinc-700" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium ${
            value === t.id
              ? "border-zinc-900 text-zinc-900 dark:border-white dark:text-white"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          {t.label}
          {typeof t.count === "number" && t.count > 0 && (
            <span className="rounded-full bg-zinc-900 px-1.5 text-[11px] text-white dark:bg-white dark:text-zinc-900">{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white";
export const buttonClass =
  "inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-700";
export const primaryButtonClass =
  "inline-flex h-9 items-center justify-center rounded-lg bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200";
export const dangerButtonClass =
  "inline-flex h-9 items-center justify-center rounded-lg border border-red-200 px-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-40 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950";

export const reportCategoryLabels: Record<string, string> = {
  user: "User",
  workspace: "Workspace",
  content: "Content",
  bug: "Bug",
  deletion: "Account deletion",
  other: "Other",
};

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "never";
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}

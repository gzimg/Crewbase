/** Badges shown for a workspace: its plan badge (every plan has one) and any custom badges from Crewbase staff. */

export function PlanBadge({ name, color, size = "sm" }: { name: string; color: string; size?: "sm" | "md" }) {
  const pad = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold ${pad}`}
      style={{ color, borderColor: `${color}66`, backgroundColor: `${color}1f` }}
      title={`${name} plan`}
    >
      <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true" fill="currentColor">
        <path d="M8 1.5l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.3l-3.8 2 .7-4.3-3.1-3 4.3-.6z" />
      </svg>
      {name}
    </span>
  );
}

export function CustomBadge({ label, color, description }: { label: string; color: string; description?: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
      style={{ backgroundColor: color }}
      title={description || label}
    >
      {label}
    </span>
  );
}

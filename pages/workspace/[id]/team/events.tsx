import { useMemo, useState } from "react";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));
import { TeamShell, useTeam, Card, Empty, inputClass, btn, btnPrimary } from "@/components/team/teamkit";

const COLORS = ["#F28C28", "#3B82F6", "#10B981", "#A855F7", "#EF4444", "#EAB308"];

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const Events: pageWithLayout = () => {
  const t = useTeam("events");
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"list" | "month">("list");
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [form, setForm] = useState({ title: "", description: "", start: "", end: "", location: "", color: COLORS[0] });

  const sorted = useMemo(() => [...t.items].sort((a, b) => a.start.localeCompare(b.start)), [t.items]);
  const now = Date.now();
  const upcoming = sorted.filter((e) => new Date(e.end || e.start).getTime() >= now);
  const past = sorted.filter((e) => new Date(e.end || e.start).getTime() < now).reverse().slice(0, 10);

  const save = async () => {
    const payload = { ...form, start: form.start ? new Date(form.start).toISOString() : "", end: form.end ? new Date(form.end).toISOString() : "" };
    if (await t.create(payload, "Event created")) {
      setForm({ title: "", description: "", start: "", end: "", location: "", color: COLORS[0] });
      setOpen(false);
    }
  };

  const EventCard = ({ e }: { e: any }) => {
    const rsvps = Object.values(e.rsvps || {}) as { answer: string; name: string }[];
    const mine = e.rsvps?.[t.me.id]?.answer;
    const going = rsvps.filter((r) => r.answer === "going");
    const start = new Date(e.start);
    return (
      <Card className="flex gap-4">
        <div className="w-14 shrink-0 rounded-xl py-2 text-center text-white" style={{ backgroundColor: e.color }}>
          <p className="text-[11px] font-semibold uppercase">{start.toLocaleDateString(undefined, { month: "short" })}</p>
          <p className="text-xl font-bold leading-none">{start.getDate()}</p>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-zinc-900 dark:text-white">{e.title}</h3>
          <p className="text-sm text-zinc-500">
            {start.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}
            {e.end && e.end !== e.start && ` – ${new Date(e.end).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`}
            {e.location && ` · ${e.location}`}
          </p>
          {e.description && <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{e.description}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {(["going", "maybe", "no"] as const).map((a) => (
              <button
                key={a}
                onClick={() => t.act(e.id, "rsvp", { answer: mine === a ? null : a })}
                aria-pressed={mine === a}
                className={mine === a ? btnPrimary : btn}
              >
                {a === "going" ? "Going" : a === "maybe" ? "Maybe" : "Can’t go"}
              </button>
            ))}
            <span className="text-xs text-zinc-500" title={going.map((g) => g.name).join(", ")}>
              {going.length} going{rsvps.filter((r) => r.answer === "maybe").length ? ` · ${rsvps.filter((r) => r.answer === "maybe").length} maybe` : ""}
            </span>
            {t.me.isManager && <button onClick={() => window.confirm("Delete this event?") && t.remove(e.id)} className={`${btn} ml-auto`}>Delete</button>}
          </div>
        </div>
      </Card>
    );
  };

  // Month grid
  const firstDay = (month.getDay() + 6) % 7; // Monday first
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, i) => {
    const day = i - firstDay + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });

  return (
    <TeamShell
      title="Events"
      description="Community events, game nights and team meetups, with RSVPs."
      action={
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-zinc-300 p-0.5 text-sm dark:border-zinc-600">
            {(["list", "month"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className={`rounded-md px-3 py-1 capitalize ${view === v ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-600 dark:text-zinc-300"}`}>{v}</button>
            ))}
          </div>
          {t.me.isManager && <button onClick={() => setOpen(!open)} className={btnPrimary}>{open ? "Close" : "New event"}</button>}
        </div>
      }
    >
      {open && (
        <Card className="mb-6 grid gap-3 sm:grid-cols-2">
          <input aria-label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} placeholder="Event name" className={`${inputClass} sm:col-span-2`} />
          <label className="text-xs text-zinc-500">Starts<input type="datetime-local" value={form.start} min={toLocalInput(new Date())} onChange={(e) => setForm({ ...form, start: e.target.value })} className={inputClass} /></label>
          <label className="text-xs text-zinc-500">Ends (optional)<input type="datetime-local" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className={inputClass} /></label>
          <input aria-label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} maxLength={200} placeholder="Where? (game, server, link)" className={inputClass} />
          <div className="flex items-center gap-2" role="radiogroup" aria-label="Colour">
            {COLORS.map((c) => (
              <button key={c} role="radio" aria-checked={form.color === c} aria-label={c} onClick={() => setForm({ ...form, color: c })} className={`h-7 w-7 rounded-full ring-offset-2 dark:ring-offset-zinc-800 ${form.color === c ? "ring-2 ring-zinc-900 dark:ring-white" : ""}`} style={{ backgroundColor: c }} />
            ))}
          </div>
          <textarea aria-label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} maxLength={2000} placeholder="Details (optional)" className={`${inputClass} sm:col-span-2`} />
          <div className="sm:col-span-2"><button disabled={!form.title.trim() || !form.start} onClick={save} className={btnPrimary}>Create event</button></div>
        </Card>
      )}

      {view === "list" ? (
        <>
          {!t.loading && upcoming.length === 0 && <Empty>No upcoming events.</Empty>}
          <div className="space-y-3">{upcoming.map((e) => <EventCard key={e.id} e={e} />)}</div>
          {past.length > 0 && (
            <>
              <h2 className="mb-3 mt-10 text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Recent</h2>
              <div className="space-y-3 opacity-70">{past.map((e) => <EventCard key={e.id} e={e} />)}</div>
            </>
          )}
        </>
      ) : (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className={btn} aria-label="Previous month">←</button>
            <h2 className="font-semibold text-zinc-900 dark:text-white">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2>
            <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className={btn} aria-label="Next month">→</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-zinc-500">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="py-1 font-medium">{d}</div>)}
            {cells.map((day, i) => {
              const dayEvents = day ? sorted.filter((e) => { const s = new Date(e.start); return s.getFullYear() === month.getFullYear() && s.getMonth() === month.getMonth() && s.getDate() === day; }) : [];
              const isToday = day && new Date().toDateString() === new Date(month.getFullYear(), month.getMonth(), day).toDateString();
              return (
                <div key={i} className={`min-h-[72px] rounded-lg p-1 text-left ${day ? "bg-zinc-50 dark:bg-zinc-900/50" : ""}`}>
                  {day && <p className={`text-xs ${isToday ? "font-bold text-zinc-900 dark:text-white" : ""}`}>{day}</p>}
                  {dayEvents.slice(0, 3).map((e) => (
                    <p key={e.id} className="mt-0.5 truncate rounded px-1 text-[11px] text-white" style={{ backgroundColor: e.color }} title={e.title}>{e.title}</p>
                  ))}
                  {dayEvents.length > 3 && <p className="text-[10px]">+{dayEvents.length - 3} more</p>}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </TeamShell>
  );
};
Events.layout = workspace;
export default Events;

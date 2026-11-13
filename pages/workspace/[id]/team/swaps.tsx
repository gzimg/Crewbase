import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import { TeamShell, Card, Empty, inputClass, btn, btnPrimary, errorText } from "@/components/team/teamkit";
import { useRouter } from "next/router";

export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));

const when = (d: string) => new Date(d).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

const Swaps: pageWithLayout = () => {
  const router = useRouter();
  const id = router.query.id as string;
  const [data, setData] = useState<any>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    if (!id) return;
    axios.get(`/api/workspace/${id}/swaps`).then((r) => setData(r.data)).catch((e) => toast.error(errorText(e)));
  }, [id]);
  useEffect(load, [load]);

  const offer = async (s: any) => {
    try {
      await axios.post(`/api/workspace/${id}/swaps`, { sessionId: s.sessionId, roleID: s.roleID, slot: s.slot, note: notes[s.sessionId] || "" });
      toast.success("Offered to the team");
      load();
    } catch (e) { toast.error(errorText(e)); }
  };
  const act = async (swapId: string, action: "take" | "cancel") => {
    try {
      await axios.post(`/api/workspace/${id}/swaps/${swapId}`, { action });
      toast.success(action === "take" ? "It’s yours. Thanks for covering!" : "Offer cancelled");
      load();
    } catch (e) { toast.error(errorText(e)); }
  };

  const open = (data?.swaps || []).filter((s: any) => s.status === "open");
  const recent = (data?.swaps || []).filter((s: any) => s.status === "taken").slice(0, 5);

  return (
    <TeamShell title="Shift swaps" description="Can’t make a shift? Offer it to the team, and a teammate can take it in one click.">
      {!data && <p className="text-sm text-zinc-500">Loading…</p>}
      {data && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Your upcoming shifts</h2>
            {data.myShifts.length === 0 && <Empty>You’re not signed up for any upcoming shifts.</Empty>}
            {data.myShifts.map((s: any) => (
              <Card key={`${s.sessionId}-${s.slot}`}>
                <p className="font-semibold text-zinc-900 dark:text-white">{s.name}</p>
                <p className="text-sm text-zinc-500">{when(s.date)}</p>
                {s.offered ? (
                  <p className="mt-3 text-sm font-medium text-amber-600 dark:text-amber-400">Offered to the team, waiting for someone to take it</p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input aria-label="Note" value={notes[s.sessionId] || ""} onChange={(e) => setNotes({ ...notes, [s.sessionId]: e.target.value })} maxLength={300} placeholder="Note (optional), e.g. school trip" className={`${inputClass} min-w-[160px] flex-1`} />
                    <button onClick={() => offer(s)} className={btnPrimary}>Offer swap</button>
                  </div>
                )}
              </Card>
            ))}
          </div>
          <div className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Open swaps</h2>
            {open.length === 0 && <Empty>No open swaps right now.</Empty>}
            {open.map((s: any) => {
              const mine = s.createdBy === data.me;
              return (
                <Card key={s.id}>
                  <p className="font-semibold text-zinc-900 dark:text-white">{s.name}</p>
                  <p className="text-sm text-zinc-500">{when(s.date)} · offered by {s.createdByName}</p>
                  {s.note && <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">“{s.note}”</p>}
                  <div className="mt-3">
                    {mine ? <button onClick={() => act(s.id, "cancel")} className={btn}>Cancel my offer</button> : <button onClick={() => act(s.id, "take")} className={btnPrimary}>Take this shift</button>}
                  </div>
                </Card>
              );
            })}
            {recent.length > 0 && (
              <>
                <h2 className="pt-4 text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Recently covered</h2>
                {recent.map((s: any) => <p key={s.id} className="text-sm text-zinc-600 dark:text-zinc-400">🔁 {s.takenByName} covered {s.createdByName}’s {s.name}</p>)}
              </>
            )}
          </div>
        </div>
      )}
    </TeamShell>
  );
};

Swaps.layout = workspace;
export default Swaps;

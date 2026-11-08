import { useState } from "react";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));
import { TeamShell, useTeam, useMembers, MemberSelect, Card, Empty, inputClass, btn, btnPrimary, Member } from "@/components/team/teamkit";

const Trainings: pageWithLayout = () => {
  const certs = useTeam("certifications");
  const awards = useTeam("awards");
  const members = useMembers();
  const isManager = certs.me.isManager;
  const [newCert, setNewCert] = useState({ name: "", description: "", color: "#3B82F6", validMonths: 0 });
  const [award, setAward] = useState<{ certId: string; member: Member | null; note: string }>({ certId: "", member: null, note: "" });
  const [filter, setFilter] = useState<"all" | "mine">("all");

  const now = Date.now();
  const certById = new Map(certs.items.map((c) => [c.id, c]));
  const shownAwards = awards.items.filter((a) => filter === "all" || a.userId === certs.me.id);

  const giveAward = async () => {
    const cert = certById.get(award.certId);
    if (!cert || !award.member) return;
    const expiresAt = cert.validMonths ? new Date(new Date().setMonth(new Date().getMonth() + cert.validMonths)).toISOString() : null;
    if (await awards.create({ certId: cert.id, userId: award.member.userId, username: award.member.username, note: award.note, expiresAt }, `${award.member.username} is now certified`)) {
      setAward({ certId: award.certId, member: null, note: "" });
    }
  };

  return (
    <TeamShell title="Trainings & certifications" description="Track who’s trained for what, and when certifications need renewing.">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4">
          <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Certifications</h2>
          {!certs.loading && certs.items.length === 0 && <Empty>No certifications yet.{isManager ? " Create your first one below." : ""}</Empty>}
          {certs.items.map((c) => {
            const holders = awards.items.filter((a) => a.certId === c.id && (!a.expiresAt || new Date(a.expiresAt).getTime() > now));
            return (
              <Card key={c.id}>
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: c.color }} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zinc-900 dark:text-white">{c.name}</p>
                    {c.description && <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{c.description}</p>}
                    <p className="mt-2 text-xs text-zinc-500">{holders.length} certified · {c.validMonths ? `renew every ${c.validMonths} month${c.validMonths === 1 ? "" : "s"}` : "never expires"}</p>
                  </div>
                  {isManager && <button onClick={() => window.confirm(`Delete ${c.name}?`) && certs.remove(c.id)} className={btn}>Delete</button>}
                </div>
              </Card>
            );
          })}
          {isManager && (
            <Card className="space-y-2">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">New certification</p>
              <input aria-label="Name" value={newCert.name} onChange={(e) => setNewCert({ ...newCert, name: e.target.value })} maxLength={60} placeholder="e.g. Trained moderator" className={inputClass} />
              <input aria-label="Description" value={newCert.description} onChange={(e) => setNewCert({ ...newCert, description: e.target.value })} maxLength={500} placeholder="What it covers (optional)" className={inputClass} />
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-zinc-500">Colour <input type="color" value={newCert.color} onChange={(e) => setNewCert({ ...newCert, color: e.target.value })} className="ml-1 h-8 w-10 align-middle" /></label>
                <label className="text-xs text-zinc-500">Renew after (months, 0 = never)
                  <input type="number" min={0} max={60} value={newCert.validMonths} onChange={(e) => setNewCert({ ...newCert, validMonths: Number(e.target.value) })} className={`${inputClass} w-24`} />
                </label>
              </div>
              <button disabled={!newCert.name.trim()} onClick={async () => { if (await certs.create(newCert, "Certification created")) setNewCert({ name: "", description: "", color: "#3B82F6", validMonths: 0 }); }} className={btnPrimary}>Create</button>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Certified members</h2>
            <div className="flex rounded-lg border border-zinc-300 p-0.5 text-xs dark:border-zinc-600">
              {(["all", "mine"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={`rounded-md px-2.5 py-1 ${filter === f ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-600 dark:text-zinc-300"}`}>{f === "all" ? "Everyone" : "Mine"}</button>
              ))}
            </div>
          </div>
          {isManager && certs.items.length > 0 && (
            <Card className="flex flex-wrap gap-2">
              <select aria-label="Certification" value={award.certId} onChange={(e) => setAward({ ...award, certId: e.target.value })} className={`${inputClass} sm:w-auto`}>
                <option value="">Certification…</option>
                {certs.items.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="min-w-[160px] flex-1"><MemberSelect id="award-member" members={members} value={award.member?.userId || ""} onChange={(m) => setAward({ ...award, member: m })} /></div>
              <input aria-label="Note" value={award.note} onChange={(e) => setAward({ ...award, note: e.target.value })} maxLength={300} placeholder="Note (optional)" className={`${inputClass} min-w-[160px] flex-1`} />
              <button disabled={!award.certId || !award.member} onClick={giveAward} className={btnPrimary}>Certify</button>
            </Card>
          )}
          {!awards.loading && shownAwards.length === 0 && <Empty>Nobody certified yet.</Empty>}
          <Card className="divide-y divide-zinc-200 p-0 dark:divide-zinc-700">
            {shownAwards.map((a) => {
              const cert = certById.get(a.certId);
              const expired = a.expiresAt && new Date(a.expiresAt).getTime() < now;
              const soon = !expired && a.expiresAt && new Date(a.expiresAt).getTime() - now < 14 * 86400000;
              return (
                <div key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                  <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: cert?.color || "#71717A" }}>{cert?.name || "Removed certification"}</span>
                  <span className="font-medium text-zinc-900 dark:text-white">{a.username || a.userId}</span>
                  <span className="text-zinc-500">since {new Date(a.awardedAt).toLocaleDateString()}{a.note ? ` · ${a.note}` : ""}</span>
                  {expired && <span className="text-xs font-medium text-red-600 dark:text-red-400">Expired</span>}
                  {soon && <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Expires {new Date(a.expiresAt).toLocaleDateString()}</span>}
                  {isManager && <button onClick={() => awards.remove(a.id, "Certification removed")} className={`${btn} ml-auto`}>Remove</button>}
                </div>
              );
            })}
          </Card>
        </div>
      </div>
    </TeamShell>
  );
};
Trainings.layout = workspace;
export default Trainings;

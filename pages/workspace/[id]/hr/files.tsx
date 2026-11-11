import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));
import { HrShell, useHrMe, LEVELS, escalation, isActiveInfraction, StatusPill } from "@/components/hr/hrkit";
import { useMembers, MemberSelect, Card, Empty, errorText } from "@/components/team/teamkit";
import { toast } from "react-hot-toast";

const StaffFiles: pageWithLayout = () => {
  const me = useHrMe();
  const members = useMembers();
  const [selected, setSelected] = useState("");
  const [file, setFile] = useState<any>(null);
  const router = useRouter();
  const id = router.query.id as string;

  useEffect(() => {
    if (!selected || !id) { setFile(null); return; }
    axios.get(`/api/workspace/${id}/hr/file`, { params: { userId: selected } }).then((r) => setFile(r.data)).catch((e) => toast.error(errorText(e)));
  }, [selected, id]);

  if (me && !me.isHR) return <HrShell title="Staff files" description=""><Empty>Only HR can view staff files.</Empty></HrShell>;
  const esc = file ? escalation(file.activePoints) : null;

  return (
    <HrShell title="Staff files" description="Everything about a staff member’s record in one place: discipline, plans, training, reviews and recognition.">
      <div className="mb-6 max-w-md"><MemberSelect id="file-member" label="Staff member" members={members} value={selected} onChange={(m) => setSelected(m?.userId || "")} /></div>
      {!file ? <Empty>Pick a staff member to open their file.</Empty> : (
        <div className="space-y-4">
          <Card className="flex flex-wrap items-center gap-4">
            <img src={file.member.picture || "/default-avatar.jpg"} alt="" className="h-14 w-14 rounded-full bg-zinc-200 object-cover dark:bg-zinc-700" />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold text-zinc-900 dark:text-white">{file.member.username}</p>
              <p className="text-sm text-zinc-500">{file.member.roles.join(", ") || "No roles"}{file.member.joinDate ? ` · joined ${new Date(file.member.joinDate).toLocaleDateString()}` : ""}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{file.activePoints} <span className="text-sm font-medium text-zinc-500">points</span></p>
              <p className={`text-sm font-medium ${esc!.tone}`}>{esc!.label}</p>
            </div>
            <a href={`/workspace/${id}/profile/${file.member.userId}`} className="text-sm underline text-zinc-600 dark:text-zinc-300">Full profile</a>
          </Card>
          <div className="grid gap-4 sm:grid-cols-4">
            {[["Certifications", file.certifications.length], ["Reviews", file.reviews.length], ["Kudos received", file.kudosReceived], ["Inactivity notices", file.notices]].map(([l, n]) => (
              <Card key={l as string}><p className="text-2xl font-bold text-zinc-900 dark:text-white">{n}</p><p className="text-xs text-zinc-500">{l}</p></Card>
            ))}
          </div>
          <Card>
            <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Infractions</h2>
            {file.infractions.length === 0 ? <p className="mt-2 text-sm text-zinc-500">None.</p> : (
              <ul className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-700">
                {file.infractions.map((i: any) => (
                  <li key={i.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${LEVELS[i.level]?.tone}`}>{LEVELS[i.level]?.label}</span>
                    <span className="text-zinc-800 dark:text-zinc-200">{i.reason}</span>
                    <span className="text-xs text-zinc-500">{new Date(i.issuedAt || i.createdAt).toLocaleDateString()} · {i.points} pts</span>
                    <span className="ml-auto"><StatusPill status={isActiveInfraction(i) ? "active" : i.status === "revoked" ? "revoked" : "expired"} /></span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Improvement plans</h2>
              {file.pips.length === 0 ? <p className="mt-2 text-sm text-zinc-500">None.</p> : file.pips.map((p: any) => (
                <p key={p.id} className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{new Date(p.createdAt).toLocaleDateString()} · {p.goals.filter((g: any) => g.done).length}/{p.goals.length} goals · <StatusPill status={p.status} /></p>
              ))}
            </Card>
            <Card>
              <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Complaints about them</h2>
              {file.complaintsAbout.length === 0 ? <p className="mt-2 text-sm text-zinc-500">None.</p> : file.complaintsAbout.map((c: any) => (
                <p key={c.id} className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{c.subject} · <StatusPill status={c.status} /></p>
              ))}
            </Card>
            <Card>
              <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Certifications</h2>
              {file.certifications.length === 0 ? <p className="mt-2 text-sm text-zinc-500">None.</p> : file.certifications.map((c: any) => (
                <p key={c.id} className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{c.certName} · since {new Date(c.awardedAt).toLocaleDateString()}</p>
              ))}
            </Card>
            <Card>
              <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Reviews</h2>
              {file.reviews.length === 0 ? <p className="mt-2 text-sm text-zinc-500">None.</p> : file.reviews.map((r: any) => (
                <p key={r.id} className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{r.period} · by {r.createdByName}</p>
              ))}
            </Card>
          </div>
          {file.resignations.length > 0 && <Card><p className="text-sm text-zinc-700 dark:text-zinc-300">Resignation: last day {new Date(file.resignations[0].lastDay).toLocaleDateString()} · <StatusPill status={file.resignations[0].status} /></p></Card>}
        </div>
      )}
    </HrShell>
  );
};
StaffFiles.layout = workspace;
export default StaffFiles;

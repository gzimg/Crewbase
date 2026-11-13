import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  ArrowLeft, Binoculars, BookOpen, Briefcase, Buildings, ChartLineUp, ChatsCircle, Check, Code, Confetti, Crown, Flag, Gavel, GraduationCap, Handshake, Headset, Heart, Key, Lifebuoy, Lightning, MagnifyingGlass, Megaphone, PaintBrush, PencilSimple, Plus, ShieldCheck, Sparkle, Star, Trash, Trophy, UsersThree, Wrench,
} from "@phosphor-icons/react";

// Only these icons are bundled, to keep the page light
const Ph = { ArrowLeft, Binoculars, BookOpen, Briefcase, Buildings, ChartLineUp, ChatsCircle, Check, Code, Confetti, Crown, Flag, Gavel, GraduationCap, Handshake, Headset, Heart, Key, Lifebuoy, Lightning, MagnifyingGlass, Megaphone, PaintBrush, PencilSimple, Plus, ShieldCheck, Sparkle, Star, Trash, Trophy, UsersThree, Wrench };
const DEPT_ICONS: Record<string, any> = { Briefcase, Crown, UsersThree, ShieldCheck, Megaphone, Headset, Code, PaintBrush, Confetti, Handshake, ChartLineUp, BookOpen, Gavel, Lifebuoy, Star, Lightning, Heart, Flag, Wrench, GraduationCap, Binoculars, ChatsCircle, Trophy, Sparkle };
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import UserName from "@/components/username";
import { inputClass, btn, btnPrimary, errorText } from "@/components/team/teamkit";

export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));

type Dept = { id: string; name: string; description: string; icon: string; color: string; permissions: string[]; autoRoleIds: string[]; memberIds: string[]; memberCount?: number };
type Person = { userId: string; username: string; displayName: string | null; picture: string | null; roleIds: string[] };

function DeptIcon({ name, color, size = 22 }: { name: string; color: string; size?: number }) {
  const Icon = DEPT_ICONS[name] || Briefcase;
  return <Icon size={size} weight="duotone" color={color} aria-hidden="true" />;
}

const Departments: pageWithLayout = () => {
  const router = useRouter();
  const id = router.query.id as string;
  const [data, setData] = useState<any>(null);
  const [editing, setEditing] = useState<Dept | null>(null);
  const [permSearch, setPermSearch] = useState("");
  const [peopleSearch, setPeopleSearch] = useState("");
  const [peopleFilter, setPeopleFilter] = useState<"all" | "in" | "out">("all");

  const load = () => {
    if (!id) return;
    axios.get(`/api/workspace/${id}/departments`).then((r) => setData(r.data)).catch((e) => toast.error(errorText(e)));
  };
  useEffect(load, [id]);

  const canManage = !!data?.canManage;
  const roleName = useMemo(() => new Map<string, string>((data?.roles || []).map((r: any) => [r.id, r.name])), [data]);

  const startNew = () => setEditing({ id: "", name: "", description: "", icon: "Briefcase", color: data.colors[0], permissions: [], autoRoleIds: [], memberIds: [] });

  const save = async () => {
    if (!editing) return;
    try {
      if (editing.id) await axios.patch(`/api/workspace/${id}/departments`, editing);
      else await axios.post(`/api/workspace/${id}/departments`, editing);
      toast.success("Department saved. Permissions apply within a minute.");
      setEditing(null);
      load();
    } catch (e) { toast.error(errorText(e)); }
  };
  const remove = async () => {
    if (!editing?.id || !window.confirm(`Delete ${editing.name}? Everyone in it loses its permissions.`)) return;
    try {
      await axios.delete(`/api/workspace/${id}/departments`, { params: { departmentId: editing.id } });
      toast.success("Department deleted");
      setEditing(null);
      load();
    } catch (e) { toast.error(errorText(e)); }
  };

  const isIn = (p: Person, d: Dept) => d.memberIds.includes(p.userId) || d.autoRoleIds.some((r) => p.roleIds.includes(r));
  const autoIn = (p: Person, d: Dept) => d.autoRoleIds.some((r) => p.roleIds.includes(r));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <Head><title>Departments</title></Head>
      <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F28C28]/10"><Ph.Buildings size={24} weight="duotone" color="#F28C28" aria-hidden="true" /></span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Departments</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Give groups of people extra permissions, on top of their role.</p>
          </div>
        </div>
        {canManage && !editing && <button onClick={startNew} className={btnPrimary}><Ph.Plus size={16} weight="bold" aria-hidden="true" /> New department</button>}
      </div>
      <p className="mb-6 max-w-3xl text-sm text-zinc-500 dark:text-zinc-400">
        Someone gets every permission from every department they’re in. People can join automatically through their role, which follows your
        Roblox group rank, or be added by hand. Workspace admins always keep full access, so a department can never lock you out.
      </p>

      {!data && <p className="text-sm text-zinc-500">Loading…</p>}

      {data && !editing && (
        data.departments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
            <Ph.Buildings size={32} weight="duotone" className="mx-auto text-zinc-400" aria-hidden="true" />
            <p className="mt-3 text-sm text-zinc-500">No departments yet.{canManage ? " Create one for each team, like Moderation or Events." : ""}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.departments.map((d: Dept) => (
              <button key={d.id} onClick={() => canManage && setEditing({ ...d })} disabled={!canManage}
                className="group rounded-2xl border border-zinc-200 bg-white p-5 text-left transition-colors hover:border-zinc-400 disabled:cursor-default dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-500">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${d.color}1A` }}><DeptIcon name={d.icon} color={d.color} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zinc-900 dark:text-white">{d.name}</p>
                    <p className="text-sm text-zinc-500">{d.memberCount} {d.memberCount === 1 ? "person" : "people"}</p>
                  </div>
                  {canManage && <Ph.PencilSimple size={18} className="text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />}
                </div>
                {d.description && <p className="mt-3 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{d.description}</p>}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"><Ph.Key size={12} aria-hidden="true" /> {d.permissions.length} permissions</span>
                  {d.autoRoleIds.slice(0, 4).map((r) => (
                    <span key={r} className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs" style={{ backgroundColor: `${d.color}1A`, color: d.color }}><Ph.Lightning size={12} weight="fill" aria-hidden="true" />{roleName.get(r) || "Removed role"}</span>
                  ))}
                  {d.autoRoleIds.length > 4 && <span className="text-xs text-zinc-500">+{d.autoRoleIds.length - 4}</span>}
                </div>
              </button>
            ))}
          </div>
        )
      )}

      {data && editing && (
        <div className="space-y-6">
          <button onClick={() => setEditing(null)} className={btn}><Ph.ArrowLeft size={16} aria-hidden="true" /> All departments</button>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
            <h2 className="font-semibold text-zinc-900 dark:text-white">About this department</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-zinc-500">Name<input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} maxLength={50} className={inputClass} /></label>
              <label className="text-xs text-zinc-500">Description<input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} maxLength={300} placeholder="What this department does" className={inputClass} /></label>
            </div>
            <p className="mt-4 text-xs text-zinc-500">Icon</p>
            <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Icon">
              {data.icons.map((ic: string) => (
                <button key={ic} role="radio" aria-checked={editing.icon === ic} aria-label={ic} onClick={() => setEditing({ ...editing, icon: ic })}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border ${editing.icon === ic ? "border-zinc-900 dark:border-white" : "border-zinc-200 dark:border-zinc-700"}`}>
                  <DeptIcon name={ic} color={editing.icon === ic ? editing.color : "#71717A"} size={20} />
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs text-zinc-500">Colour</p>
            <div className="mt-2 flex gap-2" role="radiogroup" aria-label="Colour">
              {data.colors.map((c: string) => (
                <button key={c} role="radio" aria-checked={editing.color === c} aria-label={c} onClick={() => setEditing({ ...editing, color: c })}
                  className={`h-8 w-8 rounded-full ring-offset-2 dark:ring-offset-zinc-800 ${editing.color === c ? "ring-2 ring-zinc-900 dark:ring-white" : ""}`} style={{ backgroundColor: c }} />
              ))}
            </div>
            <p className="mt-2 text-xs text-zinc-500">Icons by <a href="https://phosphoricons.com" target="_blank" rel="noopener noreferrer" className="underline">Phosphor</a> (MIT license).</p>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
            <h2 className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-white"><Ph.Lightning size={18} weight="fill" color={editing.color} aria-hidden="true" /> Join automatically by role</h2>
            <p className="mt-1 text-sm text-zinc-500">Anyone with one of these roles is in the department. Roles follow your Roblox group ranks, so promotions and demotions update it for you.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {data.roles.map((r: any) => {
                const on = editing.autoRoleIds.includes(r.id);
                return (
                  <label key={r.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${on ? "border-zinc-900 dark:border-white" : "border-zinc-200 dark:border-zinc-700"} text-zinc-800 dark:text-zinc-200`}>
                    <input type="checkbox" checked={on} onChange={() => setEditing({ ...editing, autoRoleIds: on ? editing.autoRoleIds.filter((x) => x !== r.id) : [...editing.autoRoleIds, r.id] })} className="h-4 w-4" />
                    {r.name}
                  </label>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-white"><Ph.Key size={18} weight="duotone" color={editing.color} aria-hidden="true" /> Permissions <span className="text-sm font-normal text-zinc-500">{editing.permissions.length} on</span></h2>
              <label className="relative w-full max-w-xs"><span className="sr-only">Search permissions</span>
                <Ph.MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
                <input value={permSearch} onChange={(e) => setPermSearch(e.target.value)} placeholder="Search permissions" className={`${inputClass} pl-9`} />
              </label>
            </div>
            <div className="mt-4 grid gap-5 md:grid-cols-2">
              {Object.entries(data.catalog as Record<string, Record<string, string>>).map(([cat, perms]) => {
                const entries = Object.entries(perms).filter(([label]) => !permSearch || label.toLowerCase().includes(permSearch.toLowerCase()));
                if (!entries.length) return null;
                const allOn = entries.every(([, key]) => editing.permissions.includes(key));
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{cat}</p>
                      <button onClick={() => {
                        const keys = entries.map(([, k]) => k);
                        setEditing({ ...editing, permissions: allOn ? editing.permissions.filter((p) => !keys.includes(p)) : Array.from(new Set([...editing.permissions, ...keys])) });
                      }} className="text-xs text-zinc-500 underline">{allOn ? "None" : "All"}</button>
                    </div>
                    <ul className="mt-2 divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-700 dark:border-zinc-700">
                      {entries.map(([label, key]) => {
                        const on = editing.permissions.includes(key);
                        return (
                          <li key={key}>
                            <label className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200">
                              {label}
                              <input type="checkbox" role="switch" checked={on} onChange={() => setEditing({ ...editing, permissions: on ? editing.permissions.filter((p) => p !== key) : [...editing.permissions, key] })} className="h-4 w-4 accent-[#F28C28]" />
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-white"><Ph.UsersThree size={18} weight="duotone" color={editing.color} aria-hidden="true" /> People</h2>
              <div className="flex gap-1 rounded-lg border border-zinc-300 p-0.5 text-xs dark:border-zinc-600">
                {(["all", "in", "out"] as const).map((f) => (
                  <button key={f} onClick={() => setPeopleFilter(f)} aria-pressed={peopleFilter === f} className={`rounded-md px-2.5 py-1 ${peopleFilter === f ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-600 dark:text-zinc-300"}`}>{f === "all" ? "Everyone" : f === "in" ? "In" : "Not in"}</button>
                ))}
              </div>
            </div>
            <label className="relative mt-3 block"><span className="sr-only">Search people</span>
              <Ph.MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
              <input value={peopleSearch} onChange={(e) => setPeopleSearch(e.target.value)} placeholder="Search by name" className={`${inputClass} pl-9`} />
            </label>
            <ul className="mt-3 max-h-[420px] divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-700">
              {(data.people as Person[])
                .filter((p) => !peopleSearch || `${p.username} ${p.displayName || ""}`.toLowerCase().includes(peopleSearch.toLowerCase()))
                .filter((p) => peopleFilter === "all" || (peopleFilter === "in" ? isIn(p, editing) : !isIn(p, editing)))
                .slice(0, 200)
                .map((p) => {
                  const inside = isIn(p, editing);
                  const auto = autoIn(p, editing);
                  return (
                    <li key={p.userId} className="flex items-center gap-3 py-2">
                      <img src={p.picture || "/default-avatar.jpg"} alt="" className="h-8 w-8 rounded-full bg-zinc-200 object-cover dark:bg-zinc-700" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-900 dark:text-white"><UserName userId={p.userId} name={p.displayName || p.username} /></p>
                        <p className="text-xs text-zinc-500">@{p.username}</p>
                      </div>
                      {auto ? (
                        <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs" style={{ backgroundColor: `${editing.color}1A`, color: editing.color }}><Ph.Lightning size={12} weight="fill" aria-hidden="true" /> By role</span>
                      ) : (
                        <button onClick={() => setEditing({ ...editing, memberIds: inside ? editing.memberIds.filter((x) => x !== p.userId) : [...editing.memberIds, p.userId] })} className={inside ? btnPrimary : btn}>
                          {inside ? <><Ph.Check size={14} weight="bold" aria-hidden="true" /> In</> : "Add"}
                        </button>
                      )}
                    </li>
                  );
                })}
            </ul>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <button disabled={!editing.name.trim()} onClick={save} className={btnPrimary}>Save department</button>
            <button onClick={() => setEditing(null)} className={btn}>Cancel</button>
            {editing.id && <button onClick={remove} className={`${btn} ml-auto text-red-600 dark:text-red-400`}><Ph.Trash size={16} aria-hidden="true" /> Delete department</button>}
          </div>
        </div>
      )}
    </div>
  );
};

Departments.layout = workspace;
export default Departments;

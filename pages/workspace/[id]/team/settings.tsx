import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { toast } from "react-hot-toast";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));
import { TeamShell, Card, inputClass, btn, btnPrimary, errorText } from "@/components/team/teamkit";

const TAB_LABELS: Record<string, string> = {
  chat: "Team chat", events: "Events", tasks: "Tasks", polls: "Polls", trainings: "Trainings", onboarding: "Onboarding",
  reviews: "Reviews & feedback", ideas: "Ideas", kudos: "Kudos", spotlight: "Staff of the Month", links: "Links",
};

type Settings = {
  hiddenTabs?: string[];
  shifts?: { enabled: boolean; via: "bot" | "webhook"; channelId: string | null; pingRoleId: string | null; leadMinutes: number };
  hasWebhook: boolean;
  postAnnouncements: boolean; postEvents: boolean; postKudos: boolean;
  notifyAnnouncements: boolean; notifyEvents: boolean; notifyPolls: boolean;
};

const TeamSettings: pageWithLayout = () => {
  const router = useRouter();
  const id = router.query.id as string;
  const [s, setS] = useState<Settings | null>(null);
  const [webhook, setWebhook] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [bot, setBot] = useState<{ available: boolean; inviteUrl: string | null; servers: { guildId: string; at: string }[] } | null>(null);
  const [code, setCode] = useState<string | null>(null);

  const loadBot = () => {
    if (!id) return;
    axios.get(`/api/workspace/${id}/team/bot`).then((r) => setBot(r.data)).catch(() => {});
  };
  useEffect(loadBot, [id]);

  useEffect(() => {
    if (!id) return;
    axios.get(`/api/workspace/${id}/team/settings`).then((r) => setS(r.data.settings)).catch((e) => setError(errorText(e)));
  }, [id]);

  const save = async (patch: Record<string, any>, msg = "Saved") => {
    try {
      const r = await axios.post(`/api/workspace/${id}/team/settings`, patch);
      setS(r.data.settings);
      toast.success(msg);
      return true;
    } catch (e) {
      toast.error(errorText(e));
      return false;
    }
  };

  const Toggle = ({ k, label }: { k: keyof Settings; label: string }) => (
    <label className="flex items-center justify-between gap-4 py-2 text-sm text-zinc-700 dark:text-zinc-300">
      {label}
      <input type="checkbox" checked={!!s?.[k]} onChange={(e) => save({ [k]: e.target.checked })} className="h-4 w-4" />
    </label>
  );

  return (
    <TeamShell title="Team settings" description="Choose what your team gets notified about, and connect a Discord channel.">
      {error && <Card><p className="text-sm text-zinc-600 dark:text-zinc-300">{error}</p></Card>}
      {s && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Notify everyone in the bell when</h2>
            <div className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-700">
              <Toggle k="notifyAnnouncements" label="A new announcement is posted" />
              <Toggle k="notifyEvents" label="A new event is created" />
              <Toggle k="notifyPolls" label="A new poll is created" />
            </div>
            <p className="mt-3 text-xs text-zinc-500">People are always notified about kudos, certifications, shared reviews, @mentions, feedback replies and event reminders meant for them.</p>
          </Card>
          <Card>
            <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Discord</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              {s.hasWebhook ? "✓ A Discord channel is connected." : "Post Team updates to a Discord channel using a webhook."}
            </p>
            <div className="mt-3 flex gap-2">
              <label htmlFor="webhook" className="sr-only">Discord webhook URL</label>
              <input id="webhook" type="password" value={webhook} onChange={(e) => setWebhook(e.target.value)} placeholder={s.hasWebhook ? "Paste a new webhook to replace it" : "https://discord.com/api/webhooks/…"} autoComplete="off" className={inputClass} />
              <button disabled={!webhook.trim()} onClick={async () => { if (await save({ discordWebhook: webhook }, "Discord connected")) setWebhook(""); }} className={btnPrimary}>Save</button>
            </div>
            <p className="mt-1 text-xs text-zinc-500">In Discord: channel settings → Integrations → Webhooks → New Webhook → Copy Webhook URL. It’s stored encrypted.</p>
            {s.hasWebhook && (
              <>
                <div className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-700">
                  <Toggle k="postAnnouncements" label="Post announcements" />
                  <Toggle k="postEvents" label="Post new events" />
                  <Toggle k="postKudos" label="Post kudos" />
                </div>
                <button onClick={() => save({ discordWebhook: null }, "Discord disconnected")} className={`${btn} mt-3`}>Disconnect Discord</button>
              </>
            )}
          </Card>
          <Card className="lg:col-span-2">
            <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Shift announcements</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              Post upcoming shifts and trainings (from Sessions) to Discord before they start, with who’s hosting and how many have signed up.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={!!s.shifts?.enabled} onChange={(e) => save({ shifts: { enabled: e.target.checked } }, e.target.checked ? "Shift announcements on" : "Shift announcements off")} className="h-4 w-4" />
                Announce shifts
              </label>
              <label className="flex items-center gap-2">
                Post using
                <select value={s.shifts?.via || "bot"} onChange={(e) => save({ shifts: { via: e.target.value } })} className="rounded-lg border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900">
                  <option value="bot">the Crewbase bot</option>
                  <option value="webhook">your Discord webhook</option>
                </select>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="number"
                  min={5}
                  max={1440}
                  defaultValue={s.shifts?.leadMinutes || 30}
                  onBlur={(e) => save({ shifts: { leadMinutes: Number(e.target.value) } })}
                  className="w-20 rounded-lg border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-600 dark:bg-zinc-900"
                />
                minutes before
              </label>
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              {s.shifts?.via === "webhook"
                ? s.hasWebhook ? "Posts go to the Discord webhook saved above." : "Save a Discord webhook above first."
                : s.shifts?.channelId
                  ? `Posting in the channel picked with /shifts setup (channel ID ${s.shifts.channelId}).`
                  : "In your Discord server, run /shifts setup and pick a channel (and a role to ping, if you like)."}
            </p>
          </Card>
          <Card className="lg:col-span-2">
            <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Customise Team</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Choose which Team tabs your workspace uses. Hidden tabs disappear from the menu for everyone; nothing is deleted.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {Object.entries(TAB_LABELS).map(([slug, label]) => {
                const shown = !(s.hiddenTabs || []).includes(slug);
                return (
                  <label key={slug} className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={shown}
                      onChange={() => {
                        const hidden = new Set(s.hiddenTabs || []);
                        if (shown) hidden.add(slug); else hidden.delete(slug);
                        save({ hiddenTabs: Array.from(hidden) }, shown ? `${label} hidden` : `${label} shown`);
                      }}
                      className="h-4 w-4"
                    />
                    {label}
                  </label>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-zinc-500">Changes show in the menu after a page refresh.</p>
          </Card>
          <Card className="lg:col-span-2">
            <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Crewbase bot</h2>
            {!bot ? (
              <p className="mt-2 text-sm text-zinc-500">Loading…</p>
            ) : !bot.available ? (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">The Crewbase bot isn’t switched on for this site yet.</p>
            ) : (
              <>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                  Add the bot to your Discord server so staff can check their activity, the leaderboard, sessions and events with slash commands.
                </p>
                <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
                  <li>Add the bot to your server.</li>
                  <li>Get a link code here.</li>
                  <li>In your server, run <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-700">/link</code> with the code (needs Manage Server).</li>
                </ol>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {bot.inviteUrl && <a href={bot.inviteUrl} target="_blank" rel="noopener noreferrer" className={btnPrimary}>Add to Discord</a>}
                  <button
                    onClick={async () => {
                      try {
                        const r = await axios.post(`/api/workspace/${id}/team/bot`);
                        setCode(r.data.code);
                      } catch (e) {
                        toast.error(errorText(e));
                      }
                    }}
                    className={btn}
                  >
                    {code ? "Get a new code" : "Get link code"}
                  </button>
                  {code && (
                    <span className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
                      <code className="rounded-lg bg-zinc-100 px-3 py-1.5 font-mono text-base tracking-widest dark:bg-zinc-700">{code}</code>
                      <button onClick={() => { navigator.clipboard?.writeText(`/link code:${code}`); toast.success("Copied"); }} className={btn}>Copy</button>
                      <span className="text-xs text-zinc-500">Works once, for 15 minutes</span>
                    </span>
                  )}
                </div>
                <p className="mt-4 text-xs text-zinc-500">
                  For <code>/activity</code> and <code>/profile</code> to find someone, they need their Discord ID in their Crewbase workspace profile.
                </p>
                {bot.servers.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">Connected servers</p>
                    <ul className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-700">
                      {bot.servers.map((s) => (
                        <li key={s.guildId} className="flex items-center justify-between py-2 text-sm text-zinc-700 dark:text-zinc-300">
                          <span>Server ID {s.guildId} · linked {new Date(s.at).toLocaleDateString()}</span>
                          <button
                            onClick={async () => {
                              try {
                                await axios.delete(`/api/workspace/${id}/team/bot`, { params: { guildId: s.guildId } });
                                toast.success("Disconnected");
                                loadBot();
                              } catch (e) {
                                toast.error(errorText(e));
                              }
                            }}
                            className={btn}
                          >
                            Disconnect
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      )}
    </TeamShell>
  );
};
TeamSettings.layout = workspace;
export default TeamSettings;

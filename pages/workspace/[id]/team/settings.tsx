import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { toast } from "react-hot-toast";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));
import { TeamShell, Card, inputClass, btn, btnPrimary, errorText } from "@/components/team/teamkit";

type Settings = {
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
        </div>
      )}
    </TeamShell>
  );
};
TeamSettings.layout = workspace;
export default TeamSettings;

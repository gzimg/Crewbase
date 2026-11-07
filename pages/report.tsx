import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import axios from "axios";
import { toast } from "react-hot-toast";
import Topbar from "@/components/topbar";
import { inputClass, primaryButtonClass } from "@/components/sitebits";

const categories = [
  { id: "user", label: "A user breaking the rules" },
  { id: "workspace", label: "A workspace breaking the rules" },
  { id: "content", label: "Harmful or illegal content" },
  { id: "bug", label: "Something isn’t working" },
  { id: "other", label: "Something else" },
];

/** Lets any logged-in user report a problem to Crewbase site staff. */
export default function ReportPage() {
  const router = useRouter();
  const [category, setCategory] = useState("user");
  const [targetUsername, setTargetUsername] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (typeof router.query.workspace === "string") setWorkspaceId(router.query.workspace);
  }, [router.query.workspace]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await axios.post("/api/reports", { category, targetUsername, workspaceId, details });
      setSent(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Something went wrong");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Head>
        <title>Crewbase - Report a problem</title>
      </Head>
      <Topbar />
      <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Report a problem</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Reports go to Crewbase site staff, not to your workspace’s leadership. If someone is in immediate danger, contact
          local emergency services first.
        </p>

        {sent ? (
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
            <p className="font-semibold text-zinc-900 dark:text-white">Thanks, your report was sent.</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">You can check its status on your account page.</p>
            <div className="mt-4 flex gap-2">
              <Link href="/account" className={primaryButtonClass}>Go to your account</Link>
              <button onClick={() => { setSent(false); setDetails(""); setTargetUsername(""); }} className="text-sm underline text-zinc-600 dark:text-zinc-300">
                Send another
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
            <div>
              <label htmlFor="r-cat" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">What’s this about?</label>
              <select id="r-cat" value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputClass} mt-1`}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            {category === "user" && (
              <div>
                <label htmlFor="r-user" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Their Roblox username</label>
                <input id="r-user" value={targetUsername} onChange={(e) => setTargetUsername(e.target.value)} maxLength={50} className={`${inputClass} mt-1`} />
              </div>
            )}
            {(category === "workspace" || category === "user" || category === "content") && (
              <div>
                <label htmlFor="r-ws" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Workspace (Roblox group ID, optional)</label>
                <input id="r-ws" value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value.replace(/\D/g, ""))} inputMode="numeric" maxLength={15} className={`${inputClass} mt-1`} />
              </div>
            )}
            <div>
              <label htmlFor="r-details" className="text-sm font-medium text-zinc-700 dark:text-zinc-200">What happened?</label>
              <textarea
                id="r-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={5}
                maxLength={2000}
                placeholder="Include what happened, when, and where. Don’t include passwords or anyone’s private information."
                className={`${inputClass} mt-1`}
              />
              <p className="mt-1 text-right text-xs text-zinc-400">{details.length}/2000</p>
            </div>
            <button type="submit" disabled={sending || details.trim().length < 10} className={`${primaryButtonClass} w-full h-10`}>
              {sending ? "Sending…" : "Send report"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

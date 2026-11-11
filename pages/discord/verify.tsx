import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import PublicLayout from "@/components/publiclayout";
import { fetchMe } from "@/lib/me";

/** Finishes /verify from Discord: links the Discord account to the logged-in Crewbase account. */
export default function DiscordVerify() {
  const [state, setState] = useState<"checking" | "login" | "ready" | "done" | "error">("checking");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [code, setCode] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("code") || sessionStorage.getItem("crewbase_discord_code") || "";
    if (!c) { setState("error"); setMessage("This link is missing its code. Run /verify again in Discord."); return; }
    setCode(c);
    fetchMe()
      .then((r) => { setName(r.data?.user?.username || ""); setState("ready"); })
      .catch(() => { sessionStorage.setItem("crewbase_discord_code", c); setState("login"); });
  }, []);

  const confirm = async () => {
    try {
      const r = await axios.post("/api/discord/link", { code });
      sessionStorage.removeItem("crewbase_discord_code");
      setMessage(
        r.data.problem === "no_binds"
          ? "Your account is linked. That server hasn’t set up automatic roles yet, so ask its staff to add them with /bind add."
          : r.data.failed
            ? "Your account is linked, but some roles couldn’t be given. The server’s staff need to move the Crewbase bot’s role above those roles."
            : r.data.added
              ? `You got ${r.data.added} role${r.data.added === 1 ? "" : "s"}${r.data.nickname ? ` and your nickname is now ${r.data.nickname}` : ""}.`
              : "Your account is linked. Run /update in the server to refresh your roles."
      );
      setState("done");
    } catch (e: any) {
      setMessage(e?.response?.data?.error || "Something went wrong.");
      setState("error");
    }
  };

  return (
    <PublicLayout title="Verify with Discord">
      <div className="max-w-lg rounded-2xl border border-zinc-700/70 bg-zinc-800 p-6">
        {state === "checking" && <p className="text-zinc-400">Checking…</p>}
        {state === "login" && (
          <>
            <p className="text-zinc-300">Log in to Crewbase with your Roblox account first. Then come back to this tab, or click your Discord link again.</p>
            <Link href="/login" className="mt-4 inline-block rounded-lg bg-[#F28C28] px-5 py-2.5 font-semibold text-zinc-900">Log in</Link>
          </>
        )}
        {state === "ready" && (
          <>
            <p className="text-zinc-300">Link your Discord account to the Roblox account <strong className="text-white">{name}</strong>?</p>
            <p className="mt-2 text-sm text-zinc-500">Servers using the Crewbase bot will be able to see your Roblox username and give you roles. You can unlink any time with /unverify or from your account page.</p>
            <button onClick={confirm} className="mt-5 rounded-lg bg-[#5865F2] px-5 py-2.5 font-semibold text-white hover:bg-[#4752c4]">Yes, link my account</button>
          </>
        )}
        {state === "done" && <p className="text-zinc-300">✅ Verified! {message} You can close this tab.</p>}
        {state === "error" && <p className="text-zinc-300">{message}</p>}
      </div>
    </PublicLayout>
  );
}

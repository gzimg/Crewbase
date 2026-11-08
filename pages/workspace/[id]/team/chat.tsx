import { useEffect, useRef, useState } from "react";
import axios from "axios";
import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
export const getServerSideProps = withPermissionCheckSsr(async () => ({ props: {} }));
import { TeamShell, useTeam, Item, inputClass, btnPrimary, errorText } from "@/components/team/teamkit";
import { toast } from "react-hot-toast";

const Chat: pageWithLayout = () => {
  const t = useTeam("chat");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const messages: Item[] = [...t.items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  // Check for new messages every 5 seconds while the tab is visible
  useEffect(() => {
    if (!t.id) return;
    const timer = setInterval(async () => {
      if (document.hidden) return;
      const newest = t.items[0]?.createdAt;
      try {
        const r = await axios.get(`/api/workspace/${t.id}/team/chat`, { params: newest ? { since: newest } : { take: 100 } });
        if (r.data.items.length) {
          t.setItems((prev) => {
            const seen = new Set(prev.map((p) => p.id));
            return [...r.data.items.filter((i: Item) => !seen.has(i.id)), ...prev];
          });
        }
      } catch {}
    }, 5000);
    return () => clearInterval(timer);
  }, [t.id, t.items, t.setItems]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const r = await axios.post(`/api/workspace/${t.id}/team/chat`, { text });
      t.setItems((prev) => [r.data.item, ...prev]);
      setText("");
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <TeamShell title="Team chat" description="A shared space for your whole staff team. Messages update every few seconds.">
      <div className="flex h-[60vh] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
          {!t.loading && messages.length === 0 && <p className="py-10 text-center text-sm text-zinc-500">No messages yet. Say hi!</p>}
          {messages.map((m) => {
            const mine = m.createdBy === t.me.id;
            return (
              <div key={m.id} className={`group flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${mine ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "bg-zinc-100 text-zinc-900 dark:bg-zinc-700 dark:text-white"}`}>
                  {!mine && <p className="mb-0.5 text-xs font-semibold opacity-70">{m.createdByName || "Member"}</p>}
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  <p className="mt-1 flex items-center gap-2 text-[10px] opacity-60">
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {(mine || t.me.isManager) && (
                      <button onClick={() => t.remove(m.id, "Message deleted")} className="underline opacity-0 group-hover:opacity-100 focus:opacity-100">delete</button>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottom} />
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="flex gap-2 border-t border-zinc-200 p-3 dark:border-zinc-700"
        >
          <label htmlFor="chat-input" className="sr-only">Message</label>
          <input id="chat-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Write a message…" autoComplete="off" className={inputClass} />
          <button type="submit" disabled={sending || !text.trim()} className={btnPrimary}>Send</button>
        </form>
      </div>
      <p className="mt-2 text-xs text-zinc-500">Type @username to notify someone. Keep it friendly. The latest 1,000 messages are kept, and managers can remove any message.</p>
    </TeamShell>
  );
};
Chat.layout = workspace;
export default Chat;

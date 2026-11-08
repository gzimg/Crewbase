import { useEffect, useState } from "react";
import axios from "axios";
import { IconX, IconSpeakerphone } from "@tabler/icons-react";

let publicStatus: { at: number; request: Promise<any> } | null = null;

type Announcement = { text: string; tone: "info" | "warning" | "success"; updatedAt: string | null };

/** Site-wide announcement set by Crewbase site admins. Each new announcement can be dismissed once. */
export default function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    // Share one request across page changes for a minute
    if (!publicStatus || Date.now() - publicStatus.at > 60_000) {
      publicStatus = { at: Date.now(), request: axios.get("/api/site/public") };
    }
    publicStatus.request
      .then((r) => {
        const a: Announcement | null = r.data?.announcement;
        if (!a) return;
        setAnnouncement(a);
        let dismissed: string | null = null;
        try {
          dismissed = localStorage.getItem("crewbase_dismissed_announcement");
        } catch {}
        setHidden(dismissed === (a.updatedAt || a.text));
      })
      .catch(() => {});
  }, []);

  if (!announcement || hidden) return null;

  const tones = {
    info: "bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950 dark:text-blue-100 dark:border-blue-900",
    warning: "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-900",
    success: "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-900",
  };

  return (
    <div role="status" className={`flex items-center gap-3 border-b px-4 py-2 text-sm ${tones[announcement.tone] || tones.info}`}>
      <IconSpeakerphone className="h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="flex-1">{announcement.text}</p>
      <button
        onClick={() => {
          try {
            localStorage.setItem("crewbase_dismissed_announcement", announcement.updatedAt || announcement.text);
          } catch {}
          setHidden(true);
        }}
        className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/10"
        aria-label="Dismiss announcement"
      >
        <IconX className="h-4 w-4" />
      </button>
    </div>
  );
}

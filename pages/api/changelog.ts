import type { NextApiRequest, NextApiResponse } from "next";
import { getChangelog } from "@/utils/siteSettings";

/**
 * The in-app changelog panels (sidebar and help widget) read this.
 * It used to load Firefli's feed, which no longer exists; now it serves
 * Crewbase's own What's new entries in the format those panels expect.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const entries = await getChangelog();
    res.setHeader("Cache-Control", "public, max-age=60");
    return res.status(200).json(
      entries.slice(0, 30).map((e) => ({
        title: e.title,
        pubDate: e.at,
        content: e.body ? `${e.body}` : "",
        link: "/changelog",
      }))
    );
  } catch {
    return res.status(200).json([]);
  }
}

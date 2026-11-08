/**
 * Details shown on the Terms of Service and Privacy Policy pages.
 * Set these in your hosting environment variables (on Vercel: Settings > Environment Variables).
 */
export const LEGAL = {
  siteName: "Crewbase",
  /** The site's main address. */
  siteUrl: "https://crewbase.dev",
  /** Email people can use for privacy requests, account deletion, copyright notices and questions. */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "",
  /** Link to this site's source code, as offered under the GPL-3.0 license. */
  sourceUrl: process.env.NEXT_PUBLIC_SOURCE_URL || "https://github.com/TeamFirefli/firefli",
  /** Update this date whenever you change the Terms or Privacy Policy. */
  effectiveDate: "November 7, 2026",
  governingState: "New York",
};

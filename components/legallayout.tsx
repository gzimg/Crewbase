import Head from "next/head";
import Link from "next/link";
import { LEGAL } from "@/utils/legal";

const SANS = "'Geist', 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";

/** Shared layout for the Terms of Service and Privacy Policy pages. */
export default function LegalLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-300 antialiased" style={{ fontFamily: SANS }}>
      <Head>
        <title>{`${title} - Crewbase`}</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap" />
      </Head>
      <header className="border-b border-white/[0.06]">
        <nav className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link href="/" aria-label="Crewbase home">
            <img src="/wlogo.svg" alt="Crewbase" className="h-6 w-auto" />
          </Link>
          <div className="flex gap-5 text-sm">
            <Link href="/terms" className="text-zinc-400 hover:text-white">Terms</Link>
            <Link href="/privacy" className="text-zinc-400 hover:text-white">Privacy</Link>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-14">
        <h1 className="text-4xl font-semibold tracking-[-0.03em] text-white">{title}</h1>
        <p className="mt-3 text-sm text-zinc-500">Effective {LEGAL.effectiveDate}</p>
        <div className="legal-body mt-10 space-y-5 text-[15px] leading-relaxed [&_a]:text-white [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mt-12 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-white [&_h3]:mt-6 [&_h3]:font-medium [&_h3]:text-white [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_strong]:text-white [&_ul]:space-y-2">
          {children}
        </div>
      </main>
      <footer className="border-t border-white/[0.06]">
        <p className="mx-auto max-w-3xl px-6 py-8 text-xs text-zinc-500">
          Crewbase is an independent hobby project. It is not affiliated with, endorsed by or sponsored by Roblox Corporation
          or Discord Inc.
        </p>
      </footer>
    </div>
  );
}

/** The contact email as a link, or a clear notice if it hasn't been set. */
export function ContactEmail() {
  if (!LEGAL.contactEmail) return <strong>the contact email listed by the site operator</strong>;
  return <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>;
}

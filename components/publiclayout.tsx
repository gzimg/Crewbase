import Head from "next/head";
import Link from "next/link";

/** Shared frame for public pages (help, status, what's new), matching the homepage. */
export default function PublicLayout({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-900 text-white antialiased">
      <Head>
        <title>{`${title} - Crewbase`}</title>
      </Head>
      <header className="sticky top-0 z-20 bg-zinc-800/90 backdrop-blur">
        <nav className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Crewbase home" className="flex items-center gap-3">
            <img src="/crewbase.png" alt="" aria-hidden="true" className="h-8 w-8 rounded-lg" />
            <span className="text-[15px] font-medium text-zinc-100">Crewbase</span>
          </Link>
          <div className="flex items-center gap-1 text-sm">
            <Link href="/plans" className="rounded-lg px-3 py-2 text-zinc-300 hover:bg-zinc-700">Plans</Link>
            <Link href="/help" className="rounded-lg px-3 py-2 text-zinc-300 hover:bg-zinc-700">Help</Link>
            <Link href="/changelog" className="hidden rounded-lg px-3 py-2 text-zinc-300 hover:bg-zinc-700 sm:block">What’s new</Link>
            <Link href="/status" className="hidden rounded-lg px-3 py-2 text-zinc-300 hover:bg-zinc-700 sm:block">Status</Link>
            <Link href="/workspaces" className="rounded-lg px-3 py-2 font-medium text-zinc-100 hover:bg-zinc-700">Open app</Link>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
        <div className="mt-5 h-1.5 w-20 rounded-full bg-[#F28C28]" />
        {intro && <p className="mt-5 max-w-2xl text-lg text-zinc-400">{intro}</p>}
        <div className="mt-10">{children}</div>
      </main>
      <footer className="border-t border-zinc-800">
        <div className="mx-auto flex max-w-4xl flex-wrap gap-4 px-4 py-8 text-sm text-zinc-500 sm:px-6">
          <span className="text-zinc-300">© {new Date().getFullYear()} Crewbase</span>
          <Link href="/terms" className="hover:text-zinc-300">Terms</Link>
          <Link href="/privacy" className="hover:text-zinc-300">Privacy</Link>
          <Link href="/status" className="hover:text-zinc-300">Status</Link>
        </div>
      </footer>
    </div>
  );
}

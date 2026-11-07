import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useRecoilState } from "recoil";
import { loginState } from "@/state";
import Topbar from "@/components/topbar";

type Props = {
  title: string;
  description: string;
  minRole: "staff" | "admin";
  children: React.ReactNode;
};

/** Shared frame for the site staff and site admin pages. */
export default function SiteShell({ title, description, minRole, children }: Props) {
  const [login] = useRecoilState(loginState);
  const router = useRouter();
  const role = login?.siteRole ?? null;
  const allowed = minRole === "staff" ? role === "staff" || role === "admin" : role === "admin";

  const tabs = [
    { href: "/site/staff", label: "Site staff", show: role === "staff" || role === "admin" },
    { href: "/site/admin", label: "Site admin", show: role === "admin" },
  ].filter((t) => t.show);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Head>
        <title>{`Crewbase - ${title}`}</title>
      </Head>
      <Topbar />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {!allowed ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-800">
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">You don’t have access to this page</h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              This area is for Crewbase {minRole === "admin" ? "site admins" : "site staff"} only.
            </p>
            <Link href="/workspaces?home=true" className="mt-5 inline-block text-sm font-medium text-zinc-900 underline dark:text-white">
              Back to your workspaces
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">{title}</h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
              </div>
              {tabs.length > 1 && (
                <nav className="flex rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-800" aria-label="Site areas">
                  {tabs.map((t) => (
                    <Link
                      key={t.href}
                      href={t.href}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                        router.pathname === t.href
                          ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                          : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
                      }`}
                    >
                      {t.label}
                    </Link>
                  ))}
                </nav>
              )}
            </div>
            {children}
          </>
        )}
      </div>
    </div>
  );
}

export function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-3 dark:border-zinc-700">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function StatGrid({ stats }: { stats: { label: string; value: number | string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{s.label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-white">{s.value}</p>
        </div>
      ))}
    </div>
  );
}

import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import axios from "axios";

/** Shown to regular users while a site admin has maintenance mode turned on. */
export default function MaintenancePage() {
  const [message, setMessage] = useState("Crewbase is down for maintenance. We’ll be back soon.");

  useEffect(() => {
    axios
      .get("/api/site/public")
      .then((r) => {
        if (r.data?.maintenance?.message) setMessage(r.data.maintenance.message);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900 px-6 text-white">
      <Head>
        <title>Crewbase - Maintenance</title>
      </Head>
      <div className="max-w-md rounded-2xl border border-zinc-700/70 bg-zinc-800 p-8 text-center">
        <img src="/crewbase.png" alt="" aria-hidden="true" className="mx-auto h-14 w-14 rounded-2xl" />
        <p className="mt-6 text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">Maintenance</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">We’ll be right back</h1>
        <p className="mt-3 leading-relaxed text-zinc-400">{message}</p>
        <div className="mt-6 flex justify-center gap-3 text-sm">
          <button
            onClick={() => window.location.assign("/workspaces")}
            className="h-10 rounded-xl px-4 font-semibold text-zinc-900"
            style={{ backgroundColor: "#F28C28" }}
          >
            Try again
          </button>
          <Link href="/" className="flex h-10 items-center rounded-xl border border-zinc-700 px-4 text-zinc-200 hover:bg-zinc-700">
            Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}

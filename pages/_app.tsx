"use client";

import type React from "react";

import "@/styles/tailwind.css";
import "@/styles/globals.scss";
import "@/styles/grid-layout.css";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import type { AppProps } from "next/app";
import { workspacestate } from "@/state";
import { RecoilRoot, useRecoilState } from "recoil";
import type { pageWithLayout } from "@/layoutTypes";
import { useEffect, useState, useRef } from "react";
import Head from "next/head";
import Router, { useRouter } from "next/router";

// Pages anyone can see: shown straight away instead of waiting for the login check
const PUBLIC_PAGES = ["/", "/terms", "/privacy", "/help", "/status", "/changelog", "/plans", "/maintenance", "/forgot-password", "/login", "/bot", "/credits"];
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
} from "chart.js";
import { themeState } from "@/state/theme";
import AuthProvider from "./AuthProvider";
import HelpWidget from "@/components/helpwidget";
import CommandPalette from "@/components/commandpalette";
import axios from "axios";
import { loginState } from "@/state";
import { SWRConfig } from 'swr';
import { swrConfig } from '@/lib/swr-config';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST;
const POSTHOG_API = process.env.NEXT_PUBLIC_POSTHOG_API;
const INTERCOM_APP_ID = process.env.NEXT_PUBLIC_INTERCOM_APP_ID;

type AppPropsWithLayout = AppProps & {
  Component: pageWithLayout;
};

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement
);

function ThemeHandler() {
  const [theme, setTheme] = useRecoilState(themeState);

  useEffect(() => {
    if (!theme) return;
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme as string);
  }, [theme]);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored) return; // user has an explicit preference, don't override
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setTheme(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [setTheme]);

  return null;
}

function ColorThemeHandler() {
  const [workspace] = useRecoilState(workspacestate);

  useEffect(() => {
    const defaultColor = "52, 152, 219";

    if (
      workspace &&
      workspace.groupTheme &&
      typeof workspace.groupTheme === "string"
    ) {
      const rgbValue = getRGBFromTailwindColor(workspace.groupTheme);
      document.documentElement.style.setProperty("--group-theme", rgbValue);
    } else {
      document.documentElement.style.setProperty("--group-theme", defaultColor);
    }
  }, [workspace]);

  return null;
}

function getRGBFromTailwindColor(tw: any): string {
  const fallback = "52, 152, 219"; // firefli blue

  if (!tw || typeof tw !== "string") {
    if (tw !== null && tw !== undefined) {
      console.warn("Invalid color value:", tw);
    }
    return fallback;
  }

  const colorName = tw.replace("bg-", "");

  if (colorName === "firefli") {
    return "52, 152, 219";
  }

  const colorMap: Record<string, string> = {
    "firefli": "52, 152, 219",
    "blue-500": "59, 130, 246",
    "red-500": "239, 68, 68",
    "red-700": "185, 28, 28",
    "green-500": "34, 197, 94",
    "green-600": "22, 163, 74",
    "yellow-500": "234, 179, 8",
    "orange-500": "249, 115, 22",
    "purple-500": "168, 85, 247",
    "pink-500": "236, 72, 153",
    black: "0, 0, 0",
    "gray-500": "107, 114, 128",
  };

  return colorMap[colorName] || fallback;
}

function InstanceError({ missing }: { missing: string[] }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-900 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Instance Not Available</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Contact an administrator - this instance has not been configured correctly.
          </p>
        </div>
        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4 text-left">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Missing environment variables:</p>
          <ul className="space-y-1">
            {missing.map((v) => (
              <li key={v} className="text-sm font-mono text-red-600 dark:text-red-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                {v}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          Add the missing keys to your <code className="px-1 py-0.5 bg-zinc-200 dark:bg-zinc-700 rounded font-mono">.env</code> file and restart the server.
        </p>
      </div>
    </div>
  );
}

function MyApp({ Component, pageProps }: AppPropsWithLayout) {
  const [loading, setLoading] = useState(true);
  const [instanceError, setInstanceError] = useState<string[] | null>(null);
  const router = useRouter();
  const Layout =
    Component.layout ||
    (({ children }: { children: React.ReactNode }) => <>{children}</>);

  // Check instance configuration on mount
  useEffect(() => {
    // Only needs checking once per browser session
    try {
      if (sessionStorage.getItem("crewbase_instance_ok") === "1") return;
    } catch {}
    fetch("/api/instance-check")
      .then((r) => r.json())
      .then((data) => {
        if (!data.configured) {
          setInstanceError(data.missing || ["Unknown"]);
        } else {
          try {
            sessionStorage.setItem("crewbase_instance_ok", "1");
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // Scroll to top on route change
  useEffect(() => {
    const handleRouteChange = () => {
      window.scrollTo(0, 0);
    };
    Router.events.on("routeChangeComplete", handleRouteChange);
    return () => {
      Router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, []);

  if (instanceError) {
    return (
      <>
        <Head>
          <title>Crewbase - Instance Error</title>
        </Head>
        <InstanceError missing={instanceError} />
      </>
    );
  }

  return (
    <RecoilRoot>
      <SWRConfig value={swrConfig}>
        <Head>
          <title>Crewbase</title>
          <script
            dangerouslySetInnerHTML={{
              __html: `console.info('%cCrewbase%c - Home base for your staff team\n\nUnder no circumstances should you paste anything into this console.', 'font-weight: bold; font-size: 16px;', '');`,
            }}
          />
        </Head>

        <AuthProvider loading={loading} setLoading={setLoading} />
        <Initializer />
        <ThemeHandler />
        <ColorThemeHandler />
        <HelpWidget />
        <CommandPalette />

        {!loading || PUBLIC_PAGES.includes(router.pathname) ? (
          <Layout>
            <Component {...pageProps} />
          </Layout>
        ) : (
          <div className="flex h-screen dark:bg-zinc-900">
            <svg
              aria-hidden="true"
              className="w-24 h-24 text-zinc-200 animate-spin dark:text-zinc-600 fill-firefli my-auto mx-auto"
              viewBox="0 0 100 101"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                fill="currentColor"
              />
              <path
                d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                fill="currentFill"
              />
            </svg>
          </div>
        )}
      </SWRConfig>
    </RecoilRoot>
  );
}

function Initializer() {
  const [login] = useRecoilState(loginState);
  const posthogRef = useRef<any>(null);
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Service worker registration failed:', err);
      });
    }
  }, []);

  useEffect(() => {
    if (!POSTHOG_KEY) return;
    let mounted = true;
    (async () => {
      try {
        const posthog = (await import("posthog-js")).default;
        if (!mounted) return;
        posthog.init(POSTHOG_KEY as string, {
            ui_host: POSTHOG_HOST,
            api_host: POSTHOG_API
		});
        posthogRef.current = posthog;
      } catch (e) {
        console.error("Failed to init PostHog:", e);
      }
    })();
    return () => {
      mounted = false;
      try {
        posthogRef.current?.reset();
      } catch (e) {}
    };
  }, []);

  useEffect(() => {
    try {
      const ph = posthogRef.current;
      if (ph) {
        if (login) {
          try {
            ph.identify(String(login.username), {
              userid: String(login.userId),
              username: login.username,
            });
          } catch (e) {
            console.error("PostHog identify error:", e);
          }
        } else {
          try {
            ph.reset();
          } catch (e) {}
        }
      }
    } catch (e) {
      console.error("PostHog identify error", e);
    }
  }, [login]);

  useEffect(() => {
    (async () => {
      if (INTERCOM_APP_ID === undefined) return;

      try {
        const cfgResp = await fetch("/api/intercom/config");
        const cfg = cfgResp.ok ? await cfgResp.json() : { configured: false };
        if (!cfg.configured) {
          console.warn(
            "Intercom server-side JWT not configured; skipping Intercom load."
          );
          return;
        }

        const Intercom = (await import("@intercom/messenger-js-sdk")).default;

        const avatar = `${window.location.origin}/avatars/${login.userId}.png`;
        const userId = String(login.userId);
        const payload: any = {
          app_id: INTERCOM_APP_ID,
          name: login.username,
          user_id: userId,
          avatar: { type: "image", image_url: avatar },
        };

        try {
          const r = await fetch("/api/intercom/token", {
            credentials: "same-origin",
          });
          if (r.ok) {
            const j = await r.json();
            if (j.intercom_user_hash) {
              payload.user_hash = j.intercom_user_hash;
            }
          }
        } catch (e) {}

        try {
          Intercom(payload);
        } catch (e) {
          console.error("Failed to initialize Intercom:", e);
        }
      } catch (e) {
        console.error("Intercom init error", e);
      }
    })();
  }, [login]);

  return null;
}

export default MyApp;

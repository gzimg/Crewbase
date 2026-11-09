import { Html, Head, Main, NextScript } from "next/document";

const PSSTLY_SITE_ID = process.env.NEXT_PUBLIC_PSSTLY_SITE_ID || "NkYm08mvSgYrENQY4r1i";

export default function Document() {
  return (
    <Html lang="en" className="dark">
      <Head>
        <meta
          httpEquiv="Content-Security-Policy"
          content={
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' https://m.firefli.net https://cdn.posthog.com https://js.posthog.com https://cdn.intercom.com https://uploads.intercomcdn.com https://js.intercomcdn.com https://widget.intercom.io https://psstly.app; " +
            "script-src-elem 'self' 'unsafe-inline' https://static.cloudflareinsights.com/ https://*.posthog.com https://m.firefli.net https://cdn.posthog.com https://js.posthog.com https://cdn.intercom.com https://uploads.intercomcdn.com https://js.intercomcdn.com https://widget.intercom.io https://psstly.app; " +
            "script-src-attr 'self' 'unsafe-inline'; " +
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://psstly.app; " +
            "font-src 'self' https://fonts.gstatic.com https://fonts.intercomcdn.com https://psstly.app; " +
            "img-src 'self' data: https: blob:; " +
            "connect-src 'self' https://m.firefli.net https://events.posthog.com https://app.posthog.com https://eu.i.posthog.com https://eu-assets.i.posthog.com https://us.i.posthog.com https://us-assets.i.posthog.com https://apis.roblox.com https://thumbnails.roblox.com https://users.roblox.com https://api-iam.intercom.io https://api-iam.eu.intercom.io https://api-iam.au.intercom.io wss://nexus-websocket-a.intercom.io wss://nexus-websocket-b.intercom.io wss://*.intercom.io https://psstly.app https://*.psstly.app wss://psstly.app wss://*.psstly.app; " +
            "media-src 'self' https://*.blob.vercel-storage.com https://audio-ssl.itunes.apple.com https://cdn.freesound.org; " +
            "manifest-src 'self' https://firefli.cloudflareaccess.com; " +
            "frame-src 'self' https://www.youtube.com https://psstly.app https://*.psstly.app; " +
            "worker-src 'self' blob:; " +
            "base-uri 'self'; form-action 'self';"
          }
        />
        {/* Prevent MIME type sniffing */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        {/* Additional XSS protection */}
        <meta httpEquiv="X-XSS-Protection" content="0" />
        {/* Control referrer information */}
        <meta
          httpEquiv="Referrer-Policy"
          content="strict-origin-when-cross-origin"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Crewbase" />
        <meta name="theme-color" content="#14213D" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/apple-touch-icon-167x167.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180x180.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
        {/* Psstly support chat, on every page. Set NEXT_PUBLIC_PSSTLY_SITE_ID to change the site, or "off" to remove it. */}
        {PSSTLY_SITE_ID !== "off" && <script src="https://psstly.app/embed.js" data-site={PSSTLY_SITE_ID} async />}
      </body>
    </Html>
  );
}

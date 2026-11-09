/** @type {import('next').NextConfig} */
const packageJson = require('./package.json');
const nextConfig = {
	reactStrictMode: true,
	images: {
	  remotePatterns: [
		{
		  protocol: 'https',
		  hostname: 'tr.rbxcdn.com',
		},
	  ],
	},
	env: {
	  NEXT_PUBLIC_DATABASE_CHECK: process.env.DATABASE_URL ? 'true' : '',
	  NEXT_PUBLIC_EZ_BUGS_ENABLED: process.env.EZ_BUGS ? 'true' : '',
	  NEXT_PUBLIC_APP_VERSION: packageJson.version,
	},
	async headers() {
	  return [

		{
		  // Apply these headers to all routes
		  source: '/:path*',
		  headers: [
			{
			  key: 'X-DNS-Prefetch-Control',
			  value: 'on',
			},
			{
			  key: 'X-XSS-Protection',
			  value: '0',
			},
			{
			  key: 'X-Content-Type-Options',
			  value: 'nosniff',
			},
			{
			  key: 'Referrer-Policy',
			  value: 'strict-origin-when-cross-origin',
			},
			{
			  key: 'X-Frame-Options',
			  value: 'SAMEORIGIN',
			},
			{
			  key: 'Content-Security-Policy',
			  value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://m.firefli.net https://cdn.posthog.com https://js.posthog.com https://cdn.intercom.com https://uploads.intercomcdn.com https://js.intercomcdn.com https://widget.intercom.io https://psstly.app; script-src-elem 'self' 'unsafe-inline' https://static.cloudflareinsights.com/ https://*.posthog.com https://m.firefli.net https://cdn.posthog.com https://js.posthog.com https://cdn.intercom.com https://uploads.intercomcdn.com https://js.intercomcdn.com https://widget.intercom.io https://psstly.app; script-src-attr 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://psstly.app; font-src 'self' https://fonts.gstatic.com https://fonts.intercomcdn.com https://psstly.app; img-src 'self' data: https: blob:; connect-src 'self' https://m.firefli.net https://events.posthog.com https://app.posthog.com https://eu.i.posthog.com https://eu-assets.i.posthog.com https://us.i.posthog.com https://us-assets.i.posthog.com https://apis.roblox.com https://thumbnails.roblox.com https://users.roblox.com https://api-iam.intercom.io https://api-iam.eu.intercom.io https://api-iam.au.intercom.io wss://nexus-websocket-a.intercom.io wss://nexus-websocket-b.intercom.io wss://*.intercom.io https://psstly.app https://*.psstly.app wss://psstly.app wss://*.psstly.app; media-src 'self' https://*.blob.vercel-storage.com https://audio-ssl.itunes.apple.com https://cdn.freesound.org; manifest-src 'self' https://firefli.cloudflareaccess.com; frame-src 'self' https://www.youtube.com https://psstly.app https://*.psstly.app; worker-src 'self' blob:; frame-ancestors 'self'; base-uri 'self'; form-action 'self';",
			},
		  ],
		},
	  ];
	},
  };
  
  module.exports = nextConfig;

<div>
  <img height="48px" src="public/logo.svg#gh-light-mode-only" alt="Crewbase">
  <img height="48px" src="public/wlogo.svg#gh-dark-mode-only" alt="Crewbase">
</div>

# Crewbase

**Live at [crewbase.dev](https://crewbase.dev)**

Crewbase is a staff management platform for Roblox groups: a home base for your staff team's roles, activity, sessions, moderation and promotions.

Crewbase is a fork of [Firefli](https://github.com/TeamFirefli/firefli) by Cloudysatrn & Max Croft, which itself continues the open source Tovy and Orbit projects. Huge thanks to everyone who built them.

## Features

- Create custom roles and invite users, or sync roles from your Roblox group
- Bulk manage your group members
- Track your members' in-game activity and set activity requirements
- Host and schedule sessions, and announce them in your Discord community
- Manage in-game bans and punishments with moderation cases and evidence
- Warn, promote and demote members, and recommend members for promotion
- Track inactivity with notices
- Host staff docs, and create policies for members to sign
- Communicate with your members directly in Crewbase

Built with TypeScript, Next.js, Tailwind CSS, Prisma and PostgreSQL.

## Hosting

Crewbase can run on Vercel (with a Neon Postgres database and Vercel Blob storage) or anywhere that runs Docker.

**Required environment variables**

- `DATABASE_URL` - your PostgreSQL connection string
- `SESSION_SECRET` - a strong random string (`openssl rand -base64 32`)
- `ENCRYPTION_KEY` - encrypts your Discord integration (`openssl rand -base64 64`)
- `NEXTAUTH_URL` - your site address, e.g. `https://crewbase.dev` (no `/` at the end)
- `CRON_SECRET` - protects the scheduled jobs in `/api/cron`

**Optional environment variables**

- `BLOB_READ_WRITE_TOKEN` - Vercel Blob token for moderation evidence (added automatically when you connect a Blob store on Vercel)
- `STALE_SESSION_HOURS` - on Vercel, activity sessions open longer than this are closed automatically (default 6)
- `ROBLOX_CLIENT_ID`, `ROBLOX_CLIENT_SECRET`, `ROBLOX_REDIRECT_URI` - Roblox OAuth login
- `ROBLOX_OAUTH_ONLY` - force Roblox OAuth as the only login method (`true`/`false`)
- `NEXT_MULTI` - set to `true` to optimise group sync if you're being rate limited

See `.env.example` for the full list. Firefli's [self-hosting documentation](https://docs.firefli.net) also applies to most of the setup.

## License

Crewbase is licensed under the [GNU General Public License v3.0](./LICENSE), the same license as Firefli. The original Firefli, Orbit and Tovy copyright notices are kept in the app.

If you'd like to support the developers of the project Crewbase is based on, you can [buy the Firefli team a coffee](https://buymeacoffee.com/teamfirefli).

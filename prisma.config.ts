import "dotenv/config";
import { defineConfig } from "prisma/config";

// Use a direct (non-pooled) connection for migrations when one is available.
// Also accepts the POSTGRES_* names some Vercel database integrations create.
const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL;

if (!databaseUrl) {
  console.warn(
    "[Crewbase] No database URL found. Set DATABASE_URL in your environment " +
      "(on Vercel: Settings > Environment Variables, or connect a database in the Storage tab)."
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // An empty value lets `prisma generate` run; `prisma migrate deploy` will
    // still stop with an error until a real database URL is set.
    url: databaseUrl ?? "",
  },
});

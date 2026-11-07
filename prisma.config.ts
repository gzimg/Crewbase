import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations need a direct (non-pooled) connection when one is available,
    // e.g. the DATABASE_URL_UNPOOLED variable added by the Neon integration on Vercel.
    url: process.env.DATABASE_URL_UNPOOLED || env("DATABASE_URL"),
  },
});

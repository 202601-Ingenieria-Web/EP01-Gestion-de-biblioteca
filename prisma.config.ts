// Prisma 7 config file.
//
// IMPORTANT — two URLs for Supabase:
//   • DATABASE_URL → transaction pooler (port 6543, pgbouncer=true). The app
//     runtime uses this via PrismaPg in src/lib/prisma.ts. Optimized for
//     short-lived queries.
//   • DIRECT_URL  → session pooler (port 5432). The Prisma CLI (this file)
//     uses this for `migrate dev`, `migrate deploy`, `db push`, `studio`,
//     etc. Those operations require advisory locks and prepared statements
//     that the transaction pooler does not support.
//
// If only DATABASE_URL is set, the CLI silently hangs trying to take an
// advisory lock through pgbouncer — that's the "stuck at Datasource ..."
// you might have seen.
import "dotenv/config";
import { defineConfig } from "prisma/config";

const migrationsUrl =
  process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"];

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: migrationsUrl,
  },
});

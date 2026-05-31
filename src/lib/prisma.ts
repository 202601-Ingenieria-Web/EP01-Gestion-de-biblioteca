// Instancia única de PrismaClient para toda la app.
//
// El adaptador PrismaPg es obligatorio: el generador `prisma-client` de Prisma 7
// no trae motor binario nativo, así que las conexiones van por el driver `pg`.
// El singleton se guarda en `globalThis` en desarrollo para que el hot-reload
// de Next.js no abra una conexión nueva en cada cambio.
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;

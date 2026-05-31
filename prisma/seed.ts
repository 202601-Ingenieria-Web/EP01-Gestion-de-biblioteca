// Seed de la base de datos. Crea 2 usuarios (ADMIN/USER) en Supabase Auth y su
// espejo en public.User, 2 Maestros de ejemplo, 2 movimientos (para que la
// gráfica no quede vacía) y 2 préstamos demo (uno activo, uno devuelto).
// Las credenciales son las del README. Ejecutar con: npm run db:seed
import "dotenv/config";

import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Para el seed preferimos el pooler de sesión (más fiable con prepared
// statements); si no, caemos a DATABASE_URL.
const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!supabaseUrl || !serviceRoleKey || !databaseUrl) {
  console.error(
    "Missing env vars. Required: DATABASE_URL (or DIRECT_URL), NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const SEED_USERS = [
  {
    email: "admin@biblioteca.com",
    name: "Administrator",
    password: "Admin123!",
    role: "ADMIN" as const,
  },
  {
    email: "user@biblioteca.com",
    name: "Reader",
    password: "User123!",
    role: "USER" as const,
  },
];

/** Crea (o recupera, si ya existe) un usuario en Supabase Auth de forma
 * idempotente, para poder correr el seed varias veces sin error. */
async function ensureAuthUser(input: {
  email: string;
  password: string;
  name: string;
}): Promise<{ id: string; email: string }> {
  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { name: input.name },
  });

  if (!error && created.user) {
    return { id: created.user.id, email: created.user.email! };
  }

  // Si el email ya existe (422), lo buscamos en la lista de usuarios.
  if (error && /already (registered|been registered|exists)/i.test(error.message)) {
    let page = 1;
    while (true) {
      const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (listErr) throw listErr;
      const match = list.users.find((u) => u.email?.toLowerCase() === input.email);
      if (match) return { id: match.id, email: match.email! };
      if (list.users.length < 200) break;
      page += 1;
    }
  }

  throw error ?? new Error(`Could not create or find user ${input.email}`);
}

async function main() {
  console.log("→ Seeding users (Supabase Auth + public.User mirror)…");
  const mirrored = await Promise.all(
    SEED_USERS.map(async (u) => {
      const authUser = await ensureAuthUser(u);
      const dbUser = await prisma.user.upsert({
        where: { id: authUser.id },
        update: {
          name: u.name,
          email: authUser.email,
          role: u.role,
          enabled: true,
          deleted: false,
        },
        create: {
          id: authUser.id,
          name: u.name,
          email: authUser.email,
          role: u.role,
        },
      });
      return dbUser;
    })
  );
  console.log(`  Created/updated ${mirrored.length} users.`);

  const admin = mirrored.find((u) => u.role === "ADMIN")!;
  const reader = mirrored.find((u) => u.role === "USER")!;

  console.log("→ Seeding demo books…");
  const seedBooks = [
    {
      id: "seed-book-cien-anios",
      title: "Cien años de soledad",
      author: "Gabriel García Márquez",
      description: "Foundational work of magical realism.",
      totalCopies: 5,
    },
    {
      id: "seed-book-amor-colera",
      title: "El amor en los tiempos del cólera",
      author: "Gabriel García Márquez",
      description: "Epic romance set in the Colombian Caribbean.",
      totalCopies: 3,
    },
  ];

  const books = await Promise.all(
    seedBooks.map((book) =>
      prisma.book.upsert({
        where: { id: book.id },
        update: {},
        create: {
          id: book.id,
          title: book.title,
          author: book.author,
          description: book.description,
          totalCopies: book.totalCopies,
          createdById: admin.id,
        },
      })
    )
  );
  console.log(`  Created/updated ${books.length} books.`);

  console.log("→ Seeding demo inventory movements…");
  const firstBook = books[0];
  // Dos movimientos en el primer libro para que la gráfica tenga contenido.
  const seedMovements = [
    { type: "INCOMING" as const, quantity: 3 },
    { type: "OUTGOING" as const, quantity: 1 },
  ];
  for (const m of seedMovements) {
    await prisma.movement.create({
      data: {
        bookId: firstBook.id,
        userId: admin.id,
        type: m.type,
        quantity: m.quantity,
      },
    });
  }
  // Sincroniza `totalCopies` con los movimientos sembrados.
  const movementsDelta = 3 - 1; // INCOMING - OUTGOING
  await prisma.book.update({
    where: { id: firstBook.id },
    data: { totalCopies: { increment: movementsDelta } },
  });
  console.log(`  Created ${seedMovements.length} demo movements.`);

  console.log("→ Seeding demo loans (one active, one returned)…");
  // Si el lector ya tiene préstamos, no los duplicamos al re-correr el seed.
  const existingLoans = await prisma.loan.count({ where: { userId: reader.id } });
  if (existingLoans === 0) {
    await prisma.loan.create({
      data: {
        bookId: firstBook.id,
        userId: reader.id,
        notes: "Active demo loan.",
      },
    });
    await prisma.loan.create({
      data: {
        bookId: books[1].id,
        userId: reader.id,
        returnedAt: new Date(),
        returnCondition: "GOOD",
        notes: "Returned demo loan in good condition.",
      },
    });
    console.log("  Created 2 demo loans.");
  } else {
    console.log(`  Reader already has ${existingLoans} loan(s); skipping.`);
  }

  console.log("\n✔ Seed complete. README credentials:");
  console.log("  • ADMIN → admin@biblioteca.com / Admin123!");
  console.log("  • USER  → user@biblioteca.com  / User123!");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

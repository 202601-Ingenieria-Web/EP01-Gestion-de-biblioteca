# 📚 Sistema de Gestión de Biblioteca — La Casa de las Palabras

Aplicación web para la **gestión integral de una biblioteca**: administración del
catálogo de libros, control de inventario, registro de préstamos y devoluciones,
y gestión de usuarios con distintos roles de acceso.

El sistema permite:

- **Catálogo de libros** — crear, consultar, editar y dar de baja libros.
- **Inventario** — controlar las copias disponibles mediante movimientos de
  entrada (`INCOMING`) y salida (`OUTGOING`). *(Acceso solo para administradores.)*
- **Préstamos** — registrar préstamos a lectores y gestionar sus devoluciones,
  con cálculo automático de la disponibilidad de cada libro.
- **Usuarios y roles** — autenticación con dos perfiles: **administrador** (acceso
  total) y **lector** (acceso al catálogo y sus préstamos).

---

## 👩‍💻 Autores

- **Ana Granada** — [@ana2002granada](https://github.com/ana2002granada)
- **Juan Pablo Ramos** — [@JuanPablo-Ramos](https://github.com/JuanPablo-Ramos)

---

## 🌐 Proyecto desplegado

La aplicación está disponible en línea en:

🔗 **https://ep01gestiondebiblioteca.vercel.app/login**

### Usuarios de acceso

| Rol           | Correo                  | Contraseña  | Permisos                                   |
| ------------- | ----------------------- | ----------- | ------------------------------------------ |
| Administrador | `admin@biblioteca.com`  | `Admin123!` | Acceso total (catálogo, inventario, usuarios, préstamos) |
| Lector        | `user@biblioteca.com`   | `User123!`  | Catálogo y sus propios préstamos           |

---

## 🛠️ Tecnologías

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4**
- **Prisma 7** (ORM) sobre **PostgreSQL**
- **Supabase** (base de datos, autenticación y almacenamiento de imágenes)
- **Zod** (validación)

---

## 🚀 Instalación local

### Requisitos previos

- **Node.js 20+** y **npm**
- Un proyecto en [Supabase](https://supabase.com) (base de datos PostgreSQL + Auth)

### Pasos

1. **Clonar el repositorio**

   ```bash
   git clone <url-del-repositorio>
   cd gestion-de-biblioteca
   ```

2. **Instalar dependencias**

   ```bash
   npm install
   ```

3. **Configurar las variables de entorno**

   Copia el archivo de ejemplo y completa los valores con los datos de tu
   proyecto de Supabase:

   ```bash
   cp .env.example .env
   ```

   Debes definir:

   | Variable                        | Dónde obtenerla (Supabase)                                  |
   | ------------------------------- | ---------------------------------------------------------- |
   | `DATABASE_URL`                  | Database → Connection string → **Transaction pooler** (puerto 6543, `?pgbouncer=true`) |
   | `DIRECT_URL`                    | Database → Connection string → **Session pooler** (puerto 5432) |
   | `NEXT_PUBLIC_SUPABASE_URL`      | Project Settings → API → Project URL                       |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon public key                   |
   | `SUPABASE_SERVICE_ROLE_KEY`     | Project Settings → API → service_role key *(secreta)*      |

4. **Aplicar las migraciones a la base de datos**

   ```bash
   npx prisma migrate deploy
   ```

5. **Cargar los datos de ejemplo** (usuarios admin/lector, libros y préstamos demo)

   ```bash
   npm run db:seed
   ```

6. **Levantar el servidor de desarrollo**

   ```bash
   npm run dev
   ```

   Abre [http://localhost:3000](http://localhost:3000) e inicia sesión con
   cualquiera de los [usuarios de acceso](#usuarios-de-acceso).

### Scripts disponibles

| Script                   | Descripción                                       |
| ------------------------ | ------------------------------------------------- |
| `npm run dev`            | Servidor de desarrollo                            |
| `npm run build`          | Compila la app para producción                    |
| `npm run start`          | Sirve la build de producción                      |
| `npm run db:seed`        | Carga los datos de ejemplo                        |
| `npm run prisma:studio`  | Abre Prisma Studio para inspeccionar la BD        |
</content>
</invoke>

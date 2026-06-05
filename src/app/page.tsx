import { redirect } from "next/navigation";

// La raíz redirige al catálogo. El middleware se encarga de redirigir al
// login si el usuario no está autenticado.
export default function RootPage() {
  redirect("/books");
}

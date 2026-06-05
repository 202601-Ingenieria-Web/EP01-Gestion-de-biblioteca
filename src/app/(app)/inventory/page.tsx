"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getBooksApi, getMovementsApi, createMovementApi } from "@/lib/client-api";
import { useAuth } from "@/context/AuthContext";
import type { BookSummary, Movement } from "@/types";
import { PageSpinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";

// ─── Modal de movimiento ──────────────────────────────────────────────────────

function MovementModal({
  book,
  onClose,
  onCreated,
}: {
  book: BookSummary;
  onClose: () => void;
  onCreated: (m: Movement, newTotal: number) => void;
}) {
  const [type,     setType]     = useState<"INCOMING" | "OUTGOING">("INCOMING");
  const [quantity, setQuantity] = useState("1");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const q = parseInt(quantity, 10);
    if (isNaN(q) || q <= 0) { setError("La cantidad debe ser un número positivo."); return; }
    setLoading(true);
    try {
      const { movement } = await createMovementApi({ bookId: book.id, type, quantity: q });
      const delta = type === "INCOMING" ? q : -q;
      onCreated(movement, (book.totalCopies ?? 0) + delta);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el movimiento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`Registrar movimiento — ${book.title}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex gap-3 p-3 bg-parchment rounded-lg text-sm">
          <div className="flex flex-col">
            <span className="font-semibold text-ink">{book.totalCopies}</span>
            <span className="text-xs text-stone-500">Total actual</span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-success">{book.availableCopies}</span>
            <span className="text-xs text-stone-500">Disponibles</span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-danger">{book.activeLoans}</span>
            <span className="text-xs text-stone-500">Prestadas</span>
          </div>
        </div>

        {/* Tipo */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-soft">Tipo de movimiento *</span>
          <div className="flex gap-3">
            {(["INCOMING", "OUTGOING"] as const).map((v) => (
              <label
                key={v}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer text-sm transition-all flex-1 justify-center
                  ${type === v
                    ? v === "INCOMING"
                      ? "border-success bg-green-50 text-green-800"
                      : "border-amber-400 bg-amber-50 text-amber-800"
                    : "border-border bg-cream text-ink-soft hover:bg-parchment-dark"
                  }`}
              >
                <input
                  type="radio" name="type" value={v}
                  checked={type === v} onChange={() => setType(v)}
                  className="sr-only"
                />
                {v === "INCOMING" ? "↑ Ingreso" : "↓ Salida"}
              </label>
            ))}
          </div>
        </div>

        <Input
          id="quantity" label="Cantidad *"
          type="number" min="1" value={quantity}
          onChange={e => setQuantity(e.target.value)} required
        />

        {error && (
          <p className="text-sm text-danger bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3 justify-end pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={loading}>Registrar</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Fila de libro ────────────────────────────────────────────────────────────

function BookInventoryRow({
  book,
  movements,
  onMove,
}: {
  book: BookSummary;
  movements: Movement[];
  onMove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className="hover:bg-parchment/50 transition-colors border-b border-border cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-4 py-3">
          <div>
            <p className="font-medium text-ink text-sm">{book.title}</p>
            {book.author && <p className="text-xs text-stone-400">{book.author}</p>}
          </div>
        </td>
        <td className="px-4 py-3 text-center font-mono text-sm font-semibold">{book.totalCopies}</td>
        <td className="px-4 py-3 text-center">
          {(() => {
            const available = book.availableCopies ?? 0;
            const variant = available === 0 ? "danger" : available <= 2 ? "warning" : "success";
            return <Badge variant={variant}>{available}</Badge>;
          })()}
        </td>
        <td className="px-4 py-3 text-center font-mono text-sm text-danger">{book.activeLoans}</td>
        <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
          <Button size="sm" variant="secondary" onClick={onMove}>
            Movimiento
          </Button>
        </td>
        <td className="px-4 py-3 text-stone-400 text-sm text-center">
          {expanded ? "▲" : "▼"}
        </td>
      </tr>

      {/* Movimientos del libro expandidos */}
      {expanded && (
        <tr className="bg-parchment/30 border-b border-border">
          <td colSpan={6} className="px-8 py-4">
            {movements.length === 0 ? (
              <p className="text-sm text-stone-400">Sin movimientos registrados.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-stone-500 border-b border-border">
                    <th className="pb-1 pr-4 font-semibold">Tipo</th>
                    <th className="pb-1 pr-4 font-semibold">Cantidad</th>
                    <th className="pb-1 pr-4 font-semibold">Responsable</th>
                    <th className="pb-1 font-semibold">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {movements.map((m) => (
                    <tr key={m.id} className="hover:bg-parchment/50">
                      <td className="py-1.5 pr-4">
                        <Badge variant={m.type === "INCOMING" ? "success" : "warning"}>
                          {m.type === "INCOMING" ? "↑ Ingreso" : "↓ Salida"}
                        </Badge>
                      </td>
                      <td className="py-1.5 pr-4 font-mono">
                        {m.type === "INCOMING" ? "+" : "−"}{m.quantity}
                      </td>
                      <td className="py-1.5 pr-4 text-stone-600">{m.user.name}</td>
                      <td className="py-1.5 text-stone-500">
                        {new Date(m.createdAt).toLocaleDateString("es-AR", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === "ADMIN";

  const [books,     setBooks]     = useState<BookSummary[]>([]);
  const [movements, setMovements] = useState<Record<string, Movement[]>>({});
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [active,    setActive]    = useState<BookSummary | null>(null);

  const load = useCallback(async () => {
    // El inventario es solo para ADMIN; nunca pedimos movimientos como USER.
    if (!isAdmin) return;
    try {
      const { books } = await getBooksApi();
      setBooks(books);
      // Cargamos movimientos de todos los libros en paralelo.
      const entries = await Promise.all(
        books.map(async (b) => {
          const { movements } = await getMovementsApi(b.id);
          return [b.id, movements] as [string, Movement[]];
        })
      );
      setMovements(Object.fromEntries(entries));
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (authLoading) return;
    // Sin permisos: fuera del inventario.
    if (!isAdmin) {
      router.replace("/books");
      return;
    }
    load();
  }, [authLoading, isAdmin, load, router]);

  function handleCreated(bookId: string, m: Movement, newTotal: number) {
    setMovements((prev) => ({
      ...prev,
      [bookId]: [m, ...(prev[bookId] ?? [])],
    }));
    setBooks((prev) =>
      prev.map((b) =>
        b.id === bookId ? { ...b, totalCopies: newTotal, availableCopies: newTotal - (b.activeLoans ?? 0) } : b
      )
    );
  }

  const filtered = books.filter(
    (b) =>
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      (b.author ?? "").toLowerCase().includes(search.toLowerCase())
  );

  // Mientras resolvemos la sesión o redirigimos a un USER, no mostramos el inventario.
  if (authLoading || !user) return <PageSpinner />;
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-32 gap-4">
        <p className="text-stone-500">No tienes permiso para ver el inventario.</p>
        <Link href="/books">
          <Button variant="secondary">Ir al catálogo</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold text-ink" style={{ fontFamily: "Georgia, serif" }}>
          Inventario
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Registrá ingresos y salidas de copias por libro.
        </p>
      </div>

      <div className="max-w-sm">
        <Input
          placeholder="Buscar por título o autor…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <PageSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState image title="Sin libros" description="No hay libros que coincidan con la búsqueda." />
      ) : (
        <div className="bg-card-bg border border-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-parchment border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-ink-soft">Libro</th>
                <th className="text-center px-4 py-3 font-semibold text-ink-soft">Total</th>
                <th className="text-center px-4 py-3 font-semibold text-ink-soft">Disponibles</th>
                <th className="text-center px-4 py-3 font-semibold text-ink-soft">Prestadas</th>
                <th className="px-4 py-3" />
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((book) => (
                <BookInventoryRow
                  key={book.id}
                  book={book}
                  movements={movements[book.id] ?? []}
                  onMove={() => setActive(book)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {active && (
        <MovementModal
          book={active}
          onClose={() => setActive(null)}
          onCreated={(m, newTotal) => {
            handleCreated(active.id, m, newTotal);
            setActive(null);
          }}
        />
      )}
    </div>
  );
}

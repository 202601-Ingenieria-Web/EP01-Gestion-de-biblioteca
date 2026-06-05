"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { getBooksApi, createBookApi } from "@/lib/client-api";
import { useAuth } from "@/context/AuthContext";
import type { BookSummary } from "@/types";
import { PageSpinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";

// ─── Card de libro ────────────────────────────────────────────────────────────

function BookCard({ book }: { book: BookSummary }) {
  // Los datos de stock solo llegan para ADMIN; el USER ve la card sin inventario.
  const hasStock  = book.availableCopies !== undefined && book.totalCopies !== undefined;
  const available = book.availableCopies ?? 0;
  const total     = book.totalCopies ?? 0;
  const ratio     = total > 0 ? available / total : 0;

  const badge =
    available === 0
      ? <Badge variant="danger">Sin copias disponibles</Badge>
      : available <= 1
      ? <Badge variant="warning">{available} copia disponible</Badge>
      : <Badge variant="success">{available} copias disponibles</Badge>;

  return (
    <Link href={`/books/${book.id}`}>
      <article className="group relative flex flex-col bg-card-bg border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full">
        {/* Imagen / placeholder */}
        <div className="relative h-44 bg-parchment-dark overflow-hidden">
          <Image
            src="/images/book-placeholder.png"
            alt={book.title}
            fill
            className="object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-300"
          />
          {/* Barra de disponibilidad (solo si hay datos de stock) */}
          {hasStock && (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/20">
              <div
                className={`h-full transition-all duration-500 ${
                  ratio === 0 ? "bg-danger" : ratio < 0.3 ? "bg-amber-400" : "bg-success"
                }`}
                style={{ width: `${Math.round(ratio * 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Contenido */}
        <div className="flex flex-col gap-2 p-4 flex-1">
          <div className="flex-1">
            <h2
              className="text-sm font-semibold text-ink leading-snug line-clamp-2 group-hover:text-wood transition-colors"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {book.title}
            </h2>
            {book.author && (
              <p className="text-xs text-stone-500 mt-1 truncate">{book.author}</p>
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            {hasStock ? (
              <>
                {badge}
                <span className="text-xs text-stone-400">{total} en total</span>
              </>
            ) : (
              <span className="text-xs text-wood font-medium">Ver detalle →</span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}

// ─── Modal: crear libro ───────────────────────────────────────────────────────

function CreateBookModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (book: BookSummary) => void;
}) {
  const [title,       setTitle]       = useState("");
  const [author,      setAuthor]      = useState("");
  const [description, setDescription] = useState("");
  const [copies,      setCopies]      = useState("1");
  const [error,       setError]       = useState<string | null>(null);
  const [loading,     setLoading]     = useState(false);

  function reset() {
    setTitle(""); setAuthor(""); setDescription(""); setCopies("1"); setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const n = parseInt(copies, 10);
    if (isNaN(n) || n < 0) { setError("El total de copias debe ser un número positivo."); return; }
    setLoading(true);
    try {
      const { book } = await createBookApi({
        title,
        author: author.trim() || null,
        description: description.trim() || null,
        totalCopies: n,
      });
      onCreated(book);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el libro.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="Agregar libro al catálogo">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input id="title" label="Título *" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Cien años de soledad" />
        <Input id="author" label="Autor" value={author} onChange={e => setAuthor(e.target.value)} placeholder="Gabriel García Márquez" />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className="text-sm font-medium text-ink-soft">Descripción</label>
          <textarea
            id="description"
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Sinopsis breve..."
            className="w-full rounded-lg border border-border bg-cream px-3 py-2 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-wood-muted focus:border-wood resize-none"
          />
        </div>
        <Input id="copies" label="Número de copias *" type="number" min="0" value={copies} onChange={e => setCopies(e.target.value)} required />
        {error && <p className="text-sm text-danger bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={() => { reset(); onClose(); }}>Cancelar</Button>
          <Button type="submit" loading={loading}>Agregar libro</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function BooksPage() {
  const { user } = useAuth();
  const [books,   setBooks]   = useState<BookSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { books } = await getBooksApi();
      setBooks(books);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = books.filter(
    (b) =>
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      (b.author ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 p-8">
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-2xl font-bold text-ink"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Catálogo de libros
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            {books.length} {books.length === 1 ? "libro registrado" : "libros registrados"}
          </p>
        </div>
        {user?.role === "ADMIN" && (
          <Button onClick={() => setShowCreate(true)}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar libro
          </Button>
        )}
      </div>

      {/* Buscador */}
      <div className="max-w-sm">
        <Input
          placeholder="Buscar por título o autor…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Contenido */}
      {loading ? (
        <PageSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          image
          title={search ? "Sin resultados" : "El catálogo está vacío"}
          description={
            search
              ? `No se encontraron libros con "${search}".`
              : "Aún no hay libros en el catálogo."
          }
          action={
            user?.role === "ADMIN" && !search ? (
              <Button onClick={() => setShowCreate(true)}>Agregar el primer libro</Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {filtered.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}

      {/* Modal crear */}
      <CreateBookModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(book) => setBooks((prev) => [book, ...prev])}
      />
    </div>
  );
}

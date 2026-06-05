"use client";

import { useEffect, useState, useCallback, use } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  getBookApi,
  getBookAvailabilityApi,
  getMovementsApi,
  getLoansApi,
  createLoanApi,
} from "@/lib/client-api";
import { useAuth } from "@/context/AuthContext";
import type { BookSummary, AvailabilitySeries, Movement, Loan } from "@/types";
import { PageSpinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

// ─── Mini gráfica de disponibilidad ──────────────────────────────────────────

function AvailabilityChart({ series }: { series: AvailabilitySeries["series"] }) {
  if (!series.length) return <p className="text-sm text-stone-400">Sin datos</p>;

  const max = Math.max(...series.map((d) => d.totalCopies), 1);
  const width = 600;
  const height = 120;
  const pad = { top: 10, right: 16, bottom: 24, left: 24 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const x = (i: number) => pad.left + (i / Math.max(series.length - 1, 1)) * innerW;
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;

  const linePath = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");

  const totalVals    = series.map((d) => d.totalCopies);
  const availVals    = series.map((d) => d.availableCopies);
  const activeVals   = series.map((d) => d.activeLoans);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ minWidth: 320 }}
        aria-label="Gráfica de disponibilidad"
      >
        {/* Líneas de guía */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
          <line
            key={pct}
            x1={pad.left} y1={y(pct * max)}
            x2={pad.left + innerW} y2={y(pct * max)}
            stroke="#d6c4a0" strokeWidth={0.5} strokeDasharray="4 3"
          />
        ))}

        {/* Líneas de datos */}
        <path d={linePath(totalVals)}  fill="none" stroke="#6b3f1e" strokeWidth={1.5} />
        <path d={linePath(availVals)}  fill="none" stroke="#2d6a4f" strokeWidth={1.5} />
        <path d={linePath(activeVals)} fill="none" stroke="#9b2335" strokeWidth={1.5} />

        {/* Puntos */}
        {series.map((d, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(d.totalCopies)}    r={2.5} fill="#6b3f1e" />
            <circle cx={x(i)} cy={y(d.availableCopies)} r={2.5} fill="#2d6a4f" />
            <circle cx={x(i)} cy={y(d.activeLoans)}    r={2.5} fill="#9b2335" />
          </g>
        ))}

        {/* Etiquetas eje X */}
        {series
          .filter((_, i) => i === 0 || i === series.length - 1 || i % Math.max(1, Math.floor(series.length / 5)) === 0)
          .map((d, _, arr) => {
            const origIdx = series.findIndex((s) => s.date === d.date);
            return (
              <text
                key={d.date}
                x={x(origIdx)} y={height - 4}
                fontSize={8} fill="#a0622b" textAnchor="middle"
              >
                {d.date.slice(5)}
              </text>
            );
          })
        }
      </svg>

      {/* Leyenda */}
      <div className="flex gap-5 mt-2 text-xs text-stone-500 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-wood inline-block" /> Total copias
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-success inline-block" /> Disponibles
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-danger inline-block" /> Prestadas
        </span>
      </div>
    </div>
  );
}

// ─── Tabla de movimientos ─────────────────────────────────────────────────────

function MovementsTable({ movements }: { movements: Movement[] }) {
  if (!movements.length) {
    return <p className="text-sm text-stone-400 py-4 text-center">Sin movimientos registrados.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="pb-2 font-semibold text-ink-soft pr-4">Tipo</th>
            <th className="pb-2 font-semibold text-ink-soft pr-4">Cantidad</th>
            <th className="pb-2 font-semibold text-ink-soft pr-4">Responsable</th>
            <th className="pb-2 font-semibold text-ink-soft">Fecha</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {movements.map((m) => (
            <tr key={m.id} className="hover:bg-parchment/50 transition-colors">
              <td className="py-2 pr-4">
                <Badge variant={m.type === "INCOMING" ? "success" : "warning"}>
                  {m.type === "INCOMING" ? "↑ Ingreso" : "↓ Salida"}
                </Badge>
              </td>
              <td className="py-2 pr-4 font-mono">
                {m.type === "INCOMING" ? "+" : "−"}{m.quantity}
              </td>
              <td className="py-2 pr-4 text-stone-600">{m.user.name}</td>
              <td className="py-2 text-stone-500">
                {new Date(m.createdAt).toLocaleDateString("es-AR", {
                  day: "2-digit", month: "short", year: "numeric",
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tabla de préstamos ───────────────────────────────────────────────────────

function LoansTable({ loans }: { loans: Loan[] }) {
  if (!loans.length) {
    return <p className="text-sm text-stone-400 py-4 text-center">Sin préstamos registrados.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="pb-2 font-semibold text-ink-soft pr-4">Usuario</th>
            <th className="pb-2 font-semibold text-ink-soft pr-4">Estado</th>
            <th className="pb-2 font-semibold text-ink-soft pr-4">Prestado</th>
            <th className="pb-2 font-semibold text-ink-soft">Devuelto</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {loans.map((l) => (
            <tr key={l.id} className="hover:bg-parchment/50 transition-colors">
              <td className="py-2 pr-4 text-stone-600">{l.user.name}</td>
              <td className="py-2 pr-4">
                {l.returnedAt
                  ? <Badge variant={l.returnCondition === "DAMAGED" ? "danger" : "success"}>
                      Devuelto{l.returnCondition === "DAMAGED" ? " (dañado)" : ""}
                    </Badge>
                  : <Badge variant="gold">Activo</Badge>
                }
              </td>
              <td className="py-2 pr-4 text-stone-500">
                {new Date(l.loanedAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
              </td>
              <td className="py-2 text-stone-500">
                {l.returnedAt
                  ? new Date(l.returnedAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
                  : "—"
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [book,         setBook]         = useState<BookSummary | null>(null);
  const [availability, setAvailability] = useState<AvailabilitySeries | null>(null);
  const [movements,    setMovements]    = useState<Movement[]>([]);
  const [loans,        setLoans]        = useState<Loan[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [notFound,     setNotFound]     = useState(false);

  const [showLoan,   setShowLoan]   = useState(false);
  const [loanNotes,  setLoanNotes]  = useState("");
  const [loanLoading, setLoanLoading] = useState(false);
  const [loanError,  setLoanError]  = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      // Catálogo + préstamos los ve cualquier usuario (el USER solo los suyos).
      const [bookRes, loansRes] = await Promise.all([
        getBookApi(id),
        getLoansApi({ bookId: id }),
      ]);
      setBook(bookRes.book);
      setLoans(loansRes.loans);

      // Inventario (disponibilidad + movimientos): solo ADMIN. Para el USER
      // estos endpoints devuelven 403, así que no los pedimos.
      if (isAdmin) {
        const [availRes, movRes] = await Promise.all([
          getBookAvailabilityApi(id),
          getMovementsApi(id),
        ]);
        setAvailability(availRes);
        setMovements(movRes.movements);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("no encontrado") || msg.includes("NOT_FOUND")) setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id, isAdmin]);

  // load depende de isAdmin: mientras el rol no esté resuelto se piden solo
  // catálogo y préstamos; al confirmarse ADMIN se vuelve a correr y trae el
  // inventario. Así un USER nunca llega a pedir los endpoints de inventario.
  useEffect(() => { load(); }, [load]);

  async function handleLoan(e: React.FormEvent) {
    e.preventDefault();
    setLoanError(null);
    setLoanLoading(true);
    try {
      await createLoanApi({ bookId: id, notes: loanNotes || null });
      setLoanNotes("");
      setShowLoan(false);
      load();
    } catch (err) {
      setLoanError(err instanceof Error ? err.message : "No se pudo crear el préstamo.");
    } finally {
      setLoanLoading(false);
    }
  }

  if (loading) return <PageSpinner />;
  if (notFound || !book) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-32 gap-4">
        <p className="text-stone-500">Libro no encontrado.</p>
        <Link href="/books"><Button variant="secondary">Volver al catálogo</Button></Link>
      </div>
    );
  }

  // Para USER estos campos no llegan; solo se usan en las secciones de ADMIN.
  const available = book.availableCopies ?? 0;
  const total     = book.totalCopies ?? 0;

  return (
    <div className="flex flex-col gap-8 p-8 max-w-5xl mx-auto w-full">
      {/* Breadcrumb */}
      <nav className="text-sm text-stone-500 flex items-center gap-2">
        <Link href="/books" className="hover:text-wood transition-colors">Catálogo</Link>
        <span>/</span>
        <span className="text-ink truncate">{book.title}</span>
      </nav>

      {/* Hero del libro */}
      <div className="flex gap-7 bg-card-bg border border-border rounded-xl p-6 shadow-sm">
        <div className="relative w-28 h-40 rounded-lg overflow-hidden flex-shrink-0 shadow-md">
          <Image
            src="/images/book-placeholder.png"
            alt={book.title}
            fill
            className="object-cover"
          />
        </div>
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          <div>
            <h1
              className="text-2xl font-bold text-ink leading-tight"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {book.title}
            </h1>
            {book.author && (
              <p className="text-stone-500 text-sm mt-1">{book.author}</p>
            )}
          </div>
          {book.description && (
            <p className="text-sm text-stone-600 leading-relaxed line-clamp-3">
              {book.description}
            </p>
          )}
          {/* Stats de copias: inventario, solo ADMIN */}
          {isAdmin && (
            <div className="flex gap-4 flex-wrap mt-1">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-ink">{available}</span>
                <span className="text-xs text-stone-500">disponibles</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-wood">{book.activeLoans ?? 0}</span>
                <span className="text-xs text-stone-500">prestadas</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-stone-400">{total}</span>
                <span className="text-xs text-stone-500">total</span>
              </div>
            </div>
          )}
          {/* Botón préstamo. El ADMIN ve el estado de stock; el USER no conoce
              la disponibilidad, así que siempre puede intentarlo y el back valida. */}
          {isAdmin ? (
            <>
              {available > 0 && (
                <div className="mt-auto">
                  <Button onClick={() => setShowLoan(true)} size="sm">
                    Solicitar préstamo
                  </Button>
                </div>
              )}
              {available === 0 && (
                <Badge variant="danger">Sin copias disponibles</Badge>
              )}
            </>
          ) : (
            <div className="mt-auto">
              <Button onClick={() => setShowLoan(true)} size="sm">
                Solicitar préstamo
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Gráfica de disponibilidad: inventario, solo ADMIN */}
      {isAdmin && (
        <section className="bg-card-bg border border-border rounded-xl p-6 shadow-sm">
          <h2
            className="text-base font-semibold text-ink mb-4"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Evolución de disponibilidad
          </h2>
          {availability && <AvailabilityChart series={availability.series} />}
        </section>
      )}

      {/* Movimientos (solo ADMIN) + Préstamos */}
      <div className={`grid grid-cols-1 gap-6 ${isAdmin ? "lg:grid-cols-2" : ""}`}>
        {isAdmin && (
          <section className="bg-card-bg border border-border rounded-xl p-6 shadow-sm">
            <h2
              className="text-base font-semibold text-ink mb-4"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Movimientos de inventario
            </h2>
            <MovementsTable movements={movements} />
          </section>
        )}

        <section className="bg-card-bg border border-border rounded-xl p-6 shadow-sm">
          <h2
            className="text-base font-semibold text-ink mb-4"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Historial de préstamos
          </h2>
          <LoansTable loans={loans} />
        </section>
      </div>

      {/* Modal préstamo */}
      <Modal open={showLoan} onClose={() => { setShowLoan(false); setLoanNotes(""); setLoanError(null); }} title="Solicitar préstamo">
        <form onSubmit={handleLoan} className="flex flex-col gap-4">
          <p className="text-sm text-stone-600">
            Estás solicitando un préstamo de <strong>{book.title}</strong>.
          </p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="loan-notes" className="text-sm font-medium text-ink-soft">Notas (opcional)</label>
            <textarea
              id="loan-notes"
              rows={3}
              value={loanNotes}
              onChange={e => setLoanNotes(e.target.value)}
              placeholder="Alguna observación..."
              className="w-full rounded-lg border border-border bg-cream px-3 py-2 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-wood-muted focus:border-wood resize-none"
            />
          </div>
          {loanError && <p className="text-sm text-danger bg-red-50 border border-red-200 rounded-lg px-3 py-2">{loanError}</p>}
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={() => setShowLoan(false)}>Cancelar</Button>
            <Button type="submit" loading={loanLoading}>Confirmar préstamo</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

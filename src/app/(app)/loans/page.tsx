"use client";

import { useEffect, useState } from "react";
import { getLoansApi, returnLoanApi } from "@/lib/client-api";
import { useAuth } from "@/context/AuthContext";
import type { Loan, ReturnCondition } from "@/types";
import { PageSpinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";

type StatusFilter = "all" | "active" | "returned";

// ─── Modal devolver ───────────────────────────────────────────────────────────

function ReturnModal({
  loan,
  onClose,
  onReturned,
}: {
  loan: Loan;
  onClose: () => void;
  onReturned: (updated: Loan) => void;
}) {
  const [condition, setCondition] = useState<ReturnCondition>("GOOD");
  const [notes,     setNotes]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { loan: updated } = await returnLoanApi(loan.id, {
        returnCondition: condition,
        notes: notes.trim() || null,
      });
      onReturned(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la devolución.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Registrar devolución">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-stone-600">
          Devolviendo: <strong>{loan.book.title}</strong>
        </p>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-soft">Estado de devolución *</span>
          <div className="flex gap-3">
            {(["GOOD", "DAMAGED"] as ReturnCondition[]).map((v) => (
              <label
                key={v}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer text-sm transition-all
                  ${condition === v
                    ? v === "GOOD"
                      ? "border-success bg-green-50 text-green-800"
                      : "border-danger bg-red-50 text-red-800"
                    : "border-border bg-cream text-ink-soft hover:bg-parchment-dark"
                  }`}
              >
                <input
                  type="radio"
                  name="condition"
                  value={v}
                  checked={condition === v}
                  onChange={() => setCondition(v)}
                  className="sr-only"
                />
                {v === "GOOD" ? "✓ Buen estado" : "⚠ Con daños"}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="return-notes" className="text-sm font-medium text-ink-soft">
            Notas de devolución (opcional)
          </label>
          <textarea
            id="return-notes"
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Observaciones sobre el estado del libro..."
            className="w-full rounded-lg border border-border bg-cream px-3 py-2 text-sm text-ink placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-wood-muted focus:border-wood resize-none"
          />
        </div>

        {error && (
          <p className="text-sm text-danger bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={loading}>Confirmar devolución</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Fila de préstamo ─────────────────────────────────────────────────────────

function LoanRow({
  loan,
  showUser,
  onReturn,
}: {
  loan: Loan;
  showUser: boolean;
  onReturn: (loan: Loan) => void;
}) {
  const isActive = !loan.returnedAt;

  return (
    <tr className="hover:bg-parchment/50 transition-colors border-b border-border last:border-0">
      <td className="py-3 pr-4">
        <div>
          <p className="font-medium text-ink text-sm">{loan.book.title}</p>
          {loan.book.author && (
            <p className="text-xs text-stone-400">{loan.book.author}</p>
          )}
        </div>
      </td>
      {showUser && (
        <td className="py-3 pr-4 text-sm text-stone-600">{loan.user.name}</td>
      )}
      <td className="py-3 pr-4">
        {isActive
          ? <Badge variant="gold">Activo</Badge>
          : <Badge variant={loan.returnCondition === "DAMAGED" ? "danger" : "success"}>
              Devuelto{loan.returnCondition === "DAMAGED" ? " (dañado)" : ""}
            </Badge>
        }
      </td>
      <td className="py-3 pr-4 text-sm text-stone-500">
        {new Date(loan.loanedAt).toLocaleDateString("es-AR", {
          day: "2-digit", month: "short", year: "numeric",
        })}
      </td>
      <td className="py-3 text-sm text-stone-500">
        {loan.returnedAt
          ? new Date(loan.returnedAt).toLocaleDateString("es-AR", {
              day: "2-digit", month: "short", year: "numeric",
            })
          : "—"
        }
      </td>
      <td className="py-3 text-right">
        {isActive && (
          <Button size="sm" variant="secondary" onClick={() => onReturn(loan)}>
            Devolver
          </Button>
        )}
      </td>
    </tr>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function LoansPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [loans,    setLoans]    = useState<Loan[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<StatusFilter>("all");
  const [returning, setReturning] = useState<Loan | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = filter === "all" ? undefined : filter;
        const { loans } = await getLoansApi({ status });
        if (!cancelled) setLoans(loans);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [filter]);

  function handleReturned(updated: Loan) {
    setLoans((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }

  const FILTERS: { value: StatusFilter; label: string }[] = [
    { value: "all",      label: "Todos" },
    { value: "active",   label: "Activos" },
    { value: "returned", label: "Devueltos" },
  ];

  return (
    <div className="flex flex-col gap-6 p-8">
      {/* Encabezado */}
      <div>
        <h1
          className="text-2xl font-bold text-ink"
          style={{ fontFamily: "Georgia, serif" }}
        >
          {isAdmin ? "Préstamos" : "Mis préstamos"}
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          {loans.length} {loans.length === 1 ? "préstamo" : "préstamos"}
        </p>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all
              ${filter === f.value
                ? "bg-wood text-parchment border-wood shadow-sm"
                : "bg-cream text-ink-soft border-border hover:bg-parchment-dark"
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tabla */}
      {loading ? (
        <PageSpinner />
      ) : loans.length === 0 ? (
        <EmptyState
          title="Sin préstamos"
          description="No hay préstamos que coincidan con el filtro seleccionado."
        />
      ) : (
        <div className="bg-card-bg border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-parchment border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-ink-soft">Libro</th>
                  {isAdmin && <th className="text-left px-4 py-3 font-semibold text-ink-soft">Usuario</th>}
                  <th className="text-left px-4 py-3 font-semibold text-ink-soft">Estado</th>
                  <th className="text-left px-4 py-3 font-semibold text-ink-soft">Prestado</th>
                  <th className="text-left px-4 py-3 font-semibold text-ink-soft">Devuelto</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border px-4">
                {loans.map((loan) => (
                  <tr
                    key={loan.id}
                    className="hover:bg-parchment/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-ink">{loan.book.title}</p>
                        {loan.book.author && (
                          <p className="text-xs text-stone-400">{loan.book.author}</p>
                        )}
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-stone-600">{loan.user.name}</td>
                    )}
                    <td className="px-4 py-3">
                      {!loan.returnedAt
                        ? <Badge variant="gold">Activo</Badge>
                        : <Badge variant={loan.returnCondition === "DAMAGED" ? "danger" : "success"}>
                            Devuelto{loan.returnCondition === "DAMAGED" ? " (dañado)" : ""}
                          </Badge>
                      }
                    </td>
                    <td className="px-4 py-3 text-stone-500">
                      {new Date(loan.loanedAt).toLocaleDateString("es-AR", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-stone-500">
                      {loan.returnedAt
                        ? new Date(loan.returnedAt).toLocaleDateString("es-AR", {
                            day: "2-digit", month: "short", year: "numeric",
                          })
                        : "—"
                      }
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!loan.returnedAt && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setReturning(loan)}
                        >
                          Devolver
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal devolver */}
      {returning && (
        <ReturnModal
          loan={returning}
          onClose={() => setReturning(null)}
          onReturned={handleReturned}
        />
      )}
    </div>
  );
}

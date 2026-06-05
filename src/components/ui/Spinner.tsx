export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = { sm: "w-4 h-4", md: "w-8 h-8", lg: "w-12 h-12" }[size];
  return (
    <div
      className={`${s} border-4 border-border border-t-wood rounded-full animate-spin`}
      role="status"
      aria-label="Cargando"
    />
  );
}

export function PageSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-stone-500">Cargando…</p>
      </div>
    </div>
  );
}

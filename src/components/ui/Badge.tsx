import type { ReactNode } from "react";

type Variant = "success" | "danger" | "warning" | "muted" | "gold";

const styles: Record<Variant, string> = {
  success: "bg-green-100 text-green-800 border-green-200",
  danger:  "bg-red-100 text-red-800 border-red-200",
  warning: "bg-amber-100 text-amber-800 border-amber-200",
  muted:   "bg-stone-100 text-stone-600 border-stone-200",
  gold:    "bg-amber-50 text-amber-800 border-amber-300",
};

export function Badge({
  variant = "muted",
  children,
}: {
  variant?: Variant;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${styles[variant]}`}
    >
      {children}
    </span>
  );
}

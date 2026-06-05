import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, id, className = "", ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-ink-soft"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={`
          w-full rounded-lg border border-border bg-cream px-3 py-2 text-sm text-ink
          placeholder:text-stone-400 transition-colors
          focus:outline-none focus:ring-2 focus:ring-wood-muted focus:border-wood
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? "border-danger focus:ring-danger/30" : ""}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

import Image from "next/image";
import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  image?: boolean;
  action?: ReactNode;
}

export function EmptyState({ title, description, image = false, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
      {image && (
        <div className="relative w-48 h-40 opacity-60 rounded-xl overflow-hidden">
          <Image
            src="/images/empty-shelf.jpg"
            alt="Estante vacío"
            fill
            className="object-cover"
          />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <h3 className="text-base font-semibold text-ink-soft" style={{ fontFamily: "Georgia, serif" }}>
          {title}
        </h3>
        {description && (
          <p className="text-sm text-stone-500 max-w-xs">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

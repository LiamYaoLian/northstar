"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { useLocale } from "@/lib/i18n/context";

type CalendarTaskEditModalProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function CalendarTaskEditModal({
  open,
  onClose,
  children,
}: CalendarTaskEditModalProps) {
  const { t } = useLocale();

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label={t.common.close}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.calendar.editTask}
        className="relative z-10 w-full max-w-3xl rounded-lg border border-border bg-background p-4 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t.calendar.editTask}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border p-1.5 hover:bg-neutral-50"
            aria-label={t.common.close}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

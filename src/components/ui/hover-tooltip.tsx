"use client";

import {
  useCallback,
  useEffect,
  useState,
  type HTMLAttributes,
} from "react";
import { createPortal } from "react-dom";

type UseHoverTooltipOptions = {
  disabled?: boolean;
};

export function useHoverTooltip(
  label: string,
  { disabled = false }: UseHoverTooltipOptions = {},
) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({
    x: 0,
    y: 0,
    placement: "top" as "top" | "bottom",
  });

  const hide = useCallback(() => {
    setOpen(false);
  }, []);

  const show = useCallback(
    (target: HTMLElement) => {
      if (disabled || !label.trim()) return;
      const rect = target.getBoundingClientRect();
      const above = rect.top > 40;
      setCoords({
        x: rect.left + rect.width / 2,
        y: above ? rect.top - 8 : rect.bottom + 8,
        placement: above ? "top" : "bottom",
      });
      setOpen(true);
    },
    [disabled, label],
  );

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (!open) return;
    const onDismiss = () => hide();
    window.addEventListener("scroll", onDismiss, true);
    window.addEventListener("resize", onDismiss);
    return () => {
      window.removeEventListener("scroll", onDismiss, true);
      window.removeEventListener("resize", onDismiss);
    };
  }, [hide, open]);

  const bind = {
    onMouseEnter: (event: React.MouseEvent<HTMLElement>) => {
      show(event.currentTarget);
    },
    onMouseLeave: hide,
    onFocus: (event: React.FocusEvent<HTMLElement>) => {
      show(event.currentTarget);
    },
    onBlur: hide,
  } satisfies Pick<
    HTMLAttributes<HTMLElement>,
    "onMouseEnter" | "onMouseLeave" | "onFocus" | "onBlur"
  >;

  const tooltip =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            role="tooltip"
            className={
              coords.placement === "top"
                ? "pointer-events-none fixed z-[200] max-w-[16rem] -translate-x-1/2 -translate-y-full rounded-md border border-border bg-card px-2 py-1 text-xs leading-snug text-foreground shadow-md"
                : "pointer-events-none fixed z-[200] max-w-[16rem] -translate-x-1/2 translate-y-0 rounded-md border border-border bg-card px-2 py-1 text-xs leading-snug text-foreground shadow-md"
            }
            style={{ left: coords.x, top: coords.y }}
          >
            {label}
          </div>,
          document.body,
        )
      : null;

  return { bind, tooltip };
}

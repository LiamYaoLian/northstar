import { cn } from "@/lib/utils";

type TomatoIconProps = {
  className?: string;
};

export function TomatoIcon({ className }: TomatoIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <path d="M12 20.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z" />
      <path d="M12 5.5V3.5" />
      <path d="M8.5 6.5c-.8-1.8 1-3 3.5-3s4.3 1.2 3.5 3" />
      <path d="M7.5 8.5c-1.3-.5-2.2-1.2-2.2-2" />
      <path d="M16.5 8.5c1.3-.5 2.2-1.2 2.2-2" />
    </svg>
  );
}

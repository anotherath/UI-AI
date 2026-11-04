import { cn } from "@/lib/utils";

/** Compact monogram mark for Another Intelligence — single continuous path. */
export function AiMark({
  className,
  title = "Another Intelligence",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      role="img"
      aria-label={title}
      fill="none"
      className={cn("size-7 shrink-0", className)}
    >
      <title>{title}</title>
      <path
        d="M 64 416 L 196 96 L 264 96 L 380 376 L 380 96 L 448 96 L 448 416 L 332 416 L 230 168 L 168 320 L 260 320 L 284 378 L 144 378 L 128 416 Z"
        fill="currentColor"
      />
    </svg>
  );
}

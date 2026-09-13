import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/src/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-[3px] border px-1.5 py-0 text-[10px] font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#007acc]/20 text-[#007acc] dark:text-[#38bdf8]",
        secondary:
          "border-[var(--border-color)] bg-[rgba(128,128,128,0.15)] text-[var(--foreground)]",
        outline:
          "border-[var(--border-color)] text-[var(--text-muted)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type BadgeProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

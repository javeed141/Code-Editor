import type { ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/src/lib/cn";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[3px] text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#007acc] disabled:pointer-events-none disabled:opacity-40 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[#0e639c] text-white hover:bg-[#1177bb] active:bg-[#007acc]",
        secondary:
          "bg-[rgba(128,128,128,0.2)] text-[var(--foreground)] hover:bg-[rgba(128,128,128,0.3)]",
        ghost:
          "text-[var(--foreground)] hover:bg-[rgba(128,128,128,0.15)]",
        outline:
          "border border-[var(--border-color)] bg-transparent text-[var(--foreground)] hover:bg-[rgba(128,128,128,0.1)]",
      },
      size: {
        default: "h-7 px-3",
        sm: "h-6 px-2 text-[11px]",
        icon: "size-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({
  className,
  variant = "default",
  size = "sm",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        buttonVariants({ variant, size }),
        className,
      )}
      {...props}
    />
  );
}

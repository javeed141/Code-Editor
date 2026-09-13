import type { ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/src/lib/cn";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0b0e12] disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default: " text-white hover:bg-blue-400",
        secondary: "bg-slate-800 text-slate-200 hover:bg-slate-700",
        ghost: "text-slate-400 hover:bg-slate-800/80 hover:text-slate-100",
        outline:
          "border border-slate-700 bg-transparent text-slate-300 hover:border-slate-600 hover:bg-slate-800/70 hover:text-slate-100",
      },
      size: {
        default: "h-8 px-3",
        sm: "h-7 px-2.5",
        icon: "size-7",
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

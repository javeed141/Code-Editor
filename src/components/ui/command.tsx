import type { HTMLAttributes, ButtonHTMLAttributes } from "react";
import { Search } from "lucide-react";
import { cn } from "@/src/lib/cn";
import { Input } from "@/src/components/ui/input";

export function Command({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("overflow-hidden rounded-md border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--foreground)] shadow-2xl", className)} {...props} />;
}

export function CommandInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  return (
    <div className="flex items-center gap-2 border-b border-[var(--border-color)] px-3">
      <Search className="size-3.5 text-[var(--text-muted)]" />
      <Input className={cn("h-9 border-0 bg-transparent px-0 focus:ring-0", className)} {...props} />
    </div>
  );
}

export function CommandList({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("max-h-64 overflow-y-auto p-1.5", className)} {...props} />;
}

export function CommandEmpty({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-2 py-5 text-center text-xs text-[var(--text-muted)]", className)} {...props} />;
}

export function CommandGroup({ heading, className, children, ...props }: HTMLAttributes<HTMLDivElement> & { heading?: string }) {
  return <div className={cn("mb-1", className)} {...props}><p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{heading}</p>{children}</div>;
}

export function CommandItem({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center rounded-[3px] px-2.5 py-1.5 text-left text-xs text-[var(--foreground)] hover:bg-[var(--list-hover)] focus-visible:outline-none focus-visible:bg-[var(--list-active)] focus-visible:text-[var(--list-active-fg)] cursor-pointer transition-colors",
        className,
      )}
      {...props}
    />
  );
}

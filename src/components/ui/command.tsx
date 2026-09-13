import type { HTMLAttributes, ButtonHTMLAttributes } from "react";
import { Search } from "lucide-react";
import { cn } from "@/src/lib/cn";
import { Input } from "@/src/components/ui/input";

export function Command({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("overflow-hidden rounded-lg border border-slate-700 bg-[#11161d] shadow-2xl", className)} {...props} />;
}

export function CommandInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-800 px-3">
      <Search className="size-3.5 text-slate-500" />
      <Input className={cn("h-10 border-0 bg-transparent px-0 focus:ring-0", className)} {...props} />
    </div>
  );
}

export function CommandList({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("max-h-64 overflow-y-auto p-1.5", className)} {...props} />;
}

export function CommandEmpty({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-2 py-5 text-center text-xs text-slate-500", className)} {...props} />;
}

export function CommandGroup({ heading, className, children, ...props }: HTMLAttributes<HTMLDivElement> & { heading?: string }) {
  return <div className={cn("mb-1", className)} {...props}><p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">{heading}</p>{children}</div>;
}

export function CommandItem({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={cn("flex w-full items-center rounded-md px-2 py-2 text-left text-xs text-slate-300 hover:bg-slate-800 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/70", className)} {...props} />;
}

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/src/lib/cn";

export function Breadcrumb({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <nav aria-label="Breadcrumb" className={cn("flex min-w-0 items-center", className)} {...props} />;
}

export function BreadcrumbList({ className, ...props }: React.HTMLAttributes<HTMLOListElement>) {
  return <ol className={cn("flex min-w-0 items-center gap-1 text-xs text-slate-500", className)} {...props} />;
}

export function BreadcrumbItem({ className, ...props }: React.LiHTMLAttributes<HTMLLIElement>) {
  return <li className={cn("flex min-w-0 items-center gap-1", className)} {...props} />;
}

export function BreadcrumbLink({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("truncate hover:text-slate-200", className)} {...props} />;
}

export function BreadcrumbPage({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span aria-current="page" className={cn("truncate text-slate-300", className)} {...props} />;
}

export function BreadcrumbSeparator({ children, className, ...props }: React.HTMLAttributes<HTMLLIElement> & { children?: ReactNode }) {
  return <li aria-hidden="true" className={cn("text-slate-700", className)} {...props}>{children ?? <ChevronRight className="size-3" />}</li>;
}

import { AlertTriangle } from "lucide-react";
import { Button } from "@/src/components/ui/button";

interface ConflictBannerProps {
  message: string | null;
  onRefresh: () => void;
}

export function ConflictBanner({ message, onRefresh }: ConflictBannerProps) {
  if (!message) return null;

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-t border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
      <span className="flex items-center gap-2">
        <AlertTriangle className="size-3.5" />
        {message}
      </span>
      <Button variant="outline" size="sm" onClick={onRefresh}>
        Refresh repository
      </Button>
    </div>
  );
}


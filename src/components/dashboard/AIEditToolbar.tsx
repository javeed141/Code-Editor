"use client";

import { useMemo } from "react";
import { Check, X, GitCompare, ChevronLeft, ChevronRight, CheckCheck, Trash2, FileCode2 } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/cn";
import type { AIPendingEdit } from "@/src/types/editor";

interface AIEditToolbarProps {
  pendingEdits: AIPendingEdit[];
  currentPath: string | null;
  onSelectPath: (path: string) => void;
  onAcceptCurrent: (path?: string) => void;
  onRejectCurrent: (path?: string) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
}

function computeDiffStat(original: string, proposed: string): { added: number; removed: number } {
  const originalLines = original.split("\n");
  const proposedLines = proposed.split("\n");
  const originalSet = new Set(originalLines);
  const proposedSet = new Set(proposedLines);
  const added = proposedLines.filter((line) => !originalSet.has(line)).length;
  const removed = originalLines.filter((line) => !proposedSet.has(line)).length;
  return { added, removed };
}

export function AIEditToolbar({
  pendingEdits,
  currentPath,
  onSelectPath,
  onAcceptCurrent,
  onRejectCurrent,
  onAcceptAll,
  onRejectAll,
}: AIEditToolbarProps) {
  const currentIndex = useMemo(() => {
    if (!currentPath) return 0;
    const idx = pendingEdits.findIndex((e) => e.path === currentPath);
    return idx >= 0 ? idx : 0;
  }, [pendingEdits, currentPath]);

  const currentEdit = pendingEdits[currentIndex] ?? pendingEdits[0];

  const currentStat = useMemo(() => {
    if (!currentEdit) return { added: 0, removed: 0 };
    return computeDiffStat(currentEdit.originalContent, currentEdit.proposedContent);
  }, [currentEdit]);

  if (pendingEdits.length === 0) return null;

  const handlePrev = () => {
    const prevIdx = (currentIndex - 1 + pendingEdits.length) % pendingEdits.length;
    onSelectPath(pendingEdits[prevIdx].path);
  };

  const handleNext = () => {
    const nextIdx = (currentIndex + 1) % pendingEdits.length;
    onSelectPath(pendingEdits[nextIdx].path);
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 border-b select-none",
        "bg-gradient-to-r from-[#181926] via-[#151624] to-[#11121c]",
        "border-[var(--border-color)] shadow-md",
      )}
      role="region"
      aria-label="AI proposed file edit queue"
    >
      {/* Left: Queue Title + File Pills */}
      <div className="flex items-center gap-2 min-w-0 flex-1 overflow-x-auto py-0.5 scrollbar-thin">
        <div className="flex items-center gap-1.5 shrink-0 bg-fuchsia-500/15 border border-fuchsia-500/30 rounded-md px-2 py-1">
          <GitCompare className="size-3.5 text-fuchsia-400" />
          <span className="text-xs font-semibold text-fuchsia-200">
            AI Proposals ({pendingEdits.length})
          </span>
        </div>

        {/* File Pills navigation */}
        <div className="flex items-center gap-1 min-w-0">
          {pendingEdits.map((edit, idx) => {
            const isActive = edit.path === currentPath;
            return (
              <button
                key={edit.path}
                type="button"
                onClick={() => onSelectPath(edit.path)}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono transition-all duration-150 shrink-0 border",
                  isActive
                    ? "bg-fuchsia-500/20 border-fuchsia-400/50 text-fuchsia-200 shadow-sm"
                    : "bg-white/[0.04] border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/[0.08]",
                )}
                title={edit.path}
              >
                <FileCode2 className={cn("size-3", isActive ? "text-fuchsia-300" : "text-slate-500")} />
                <span className="truncate max-w-[120px]">{edit.name}</span>
                <span className="text-[10px] text-slate-500 font-sans">
                  #{idx + 1}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Prev/Next + File Actions + Accept All / Reject All */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Navigation buttons for multiple proposals */}
        {pendingEdits.length > 1 && (
          <div className="flex items-center gap-0.5 bg-black/40 border border-white/10 rounded-md p-0.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={handlePrev}
              className="h-6 w-6 p-0 text-slate-400 hover:text-white"
              title="Previous proposal"
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <span className="text-[11px] font-mono text-slate-400 px-1">
              {currentIndex + 1}/{pendingEdits.length}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleNext}
              className="h-6 w-6 p-0 text-slate-400 hover:text-white"
              title="Next proposal"
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        )}

        {/* Diff stat badge for current file */}
        {currentEdit && (
          <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono font-semibold">
            {currentStat.added > 0 && (
              <span className="text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded px-1.5 py-0.5">
                +{currentStat.added}
              </span>
            )}
            {currentStat.removed > 0 && (
              <span className="text-rose-400 bg-rose-400/10 border border-rose-400/20 rounded px-1.5 py-0.5">
                -{currentStat.removed}
              </span>
            )}
          </div>
        )}

        {/* Single File Actions */}
        {currentEdit && (
          <div className="flex items-center gap-1 border-r border-white/10 pr-2 mr-0.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onRejectCurrent(currentEdit.path)}
              id="ai-edit-reject-file-btn"
              className={cn(
                "h-6.5 gap-1 rounded-md px-2 text-xs font-medium",
                "text-rose-300 hover:bg-rose-500/20 hover:text-rose-200",
                "transition-all duration-150",
              )}
              aria-label="Reject current file proposal"
              title={`Reject changes to ${currentEdit.name}`}
            >
              <X className="size-3" />
              <span className="hidden md:inline">Reject File</span>
            </Button>

            <Button
              size="sm"
              onClick={() => onAcceptCurrent(currentEdit.path)}
              id="ai-edit-accept-file-btn"
              className={cn(
                "h-6.5 gap-1 rounded-md px-2.5 text-xs font-semibold",
                "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30",
                "transition-all duration-150",
              )}
              aria-label="Accept current file proposal"
              title={`Accept changes to ${currentEdit.name}`}
            >
              <Check className="size-3" />
              <span>Accept File</span>
            </Button>
          </div>
        )}

        {/* Batch Actions: Reject All & Accept All */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onRejectAll}
          id="ai-edit-reject-all-btn"
          className="h-6.5 gap-1 rounded-md px-2 text-xs text-slate-400 hover:text-rose-300 hover:bg-rose-500/15"
          title="Reject all pending proposals"
        >
          <Trash2 className="size-3" />
          <span className="hidden sm:inline">Reject All</span>
        </Button>

        <Button
          size="sm"
          onClick={onAcceptAll}
          id="ai-edit-accept-all-btn"
          className={cn(
            "h-6.5 gap-1.5 rounded-md px-3 text-xs font-semibold text-white",
            "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 shadow-md shadow-emerald-500/20",
            "hover:brightness-110 active:scale-95 transition-all duration-150",
          )}
          title="Accept all pending proposals"
        >
          <CheckCheck className="size-3.5" />
          <span>Accept All ({pendingEdits.length})</span>
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { FileDiff, GitBranch, RotateCcw } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { ScrollArea } from "@/src/components/ui/scroll-area";
import DiffViewer from "@/src/components/DiffViewer";
import FileIcon from "@/src/components/FileIcon";

export type ChangedFile = {
  path: string;
  name: string;
  originalContent: string;
  content: string;
  status: "modified" | "added" | "deleted";
};

type ChangesPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changedFiles: ChangedFile[];
  /** Restores one local file to the version loaded from GitHub. */
  onRevertFile?: (path: string) => void;
};

function getLanguageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    css: "css",
    html: "html",
    json: "json",
    md: "markdown",
    yaml: "yaml",
    yml: "yaml",
    sh: "shell",
    rs: "rust",
    go: "go",
  };
  return map[ext] ?? "plaintext";
}

const STATUS_STYLES: Record<
  ChangedFile["status"],
  { badge: string; label: string; dot: string }
> = {
  modified: {
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    label: "M",
    dot: "bg-amber-400",
  },
  added: {
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    label: "A",
    dot: "bg-emerald-400",
  },
  deleted: {
    badge: "bg-red-500/15 text-red-400 border-red-500/30",
    label: "D",
    dot: "bg-red-400",
  },
};

export default function ChangesPanel({
  open,
  onOpenChange,
  changedFiles,
  onRevertFile,
}: ChangesPanelProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const activeFile =
    changedFiles.find((f) => f.path === selectedPath) ?? changedFiles[0] ?? null;

  return (
    <Dialog
      open={open}
      className="h-[86vh] max-h-[88vh] w-[94vw] max-w-[94vw]"
      onOpenChange={onOpenChange}
    >
      <DialogContent className="flex h-full max-h-none max-w-none flex-col overflow-hidden rounded-md border-[var(--border-color)] bg-[var(--sidebar-bg)] p-0 text-[var(--foreground)] shadow-lg">
        {/* ── Header ───────────────────────────────────────────────── */}
        <DialogHeader className="mb-0 flex shrink-0 flex-row items-center gap-3 border-b border-[var(--border-color)] px-3 py-2">
          <FileDiff className="size-4 shrink-0 text-[#58a6ff]" />
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-sm leading-none">
              Local Changes
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-[10px] leading-3">
              Lines highlighted in{" "}
              <span className="font-medium text-emerald-400">green</span> were
              added,{" "}
              <span className="font-medium text-red-400">red</span> were
              removed.
            </DialogDescription>
          </div>
          <Badge
            variant="outline"
            className="shrink-0 border-[var(--border-color)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-muted)]"
          >
            {changedFiles.length} file{changedFiles.length !== 1 ? "s" : ""}
          </Badge>
        </DialogHeader>

        {changedFiles.length === 0 ? (
          /* ── Empty State ─────────────────────────────────────────── */
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
            <GitBranch className="size-8 text-[var(--text-muted)] opacity-40" />
            <p className="text-sm font-medium text-[var(--foreground)]">
              No local changes
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              Edit any file to see its diff here.
            </p>
          </div>
        ) : (
          /* ── Main Layout ─────────────────────────────────────────── */
          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-[220px_minmax(0,1fr)]">
            {/* File List Sidebar */}
            <aside className="flex min-h-0 flex-col border-b border-[var(--border-color)] bg-[var(--card-bg)] md:border-r md:border-b-0">
              <div className="shrink-0 border-b border-[var(--border-color)] px-2.5 py-1.5">
                <span className="text-[10px] font-semibold tracking-[0.08em] text-[var(--text-muted)]">
                  CHANGED FILES
                </span>
              </div>
              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-px p-1.5">
                  {changedFiles.map((file) => {
                    const isActive = activeFile?.path === file.path;
                    const styles = STATUS_STYLES[file.status];
                    return (
                      <button
                        key={file.path}
                        type="button"
                        onClick={() => setSelectedPath(file.path)}
                        className={`group flex w-full items-center gap-2 rounded-[3px] border-l-2 px-2 py-1.5 text-left transition-colors hover:bg-[var(--list-hover)] ${
                          isActive
                            ? "border-[#58a6ff] bg-[#1f6feb]/15 text-[var(--foreground)]"
                            : "border-transparent text-[var(--text-muted)]"
                        }`}
                      >
                        {/* Status badge */}
                        <Badge
                          variant="outline"
                          className={`h-4 min-w-[18px] shrink-0 justify-center px-1 py-0 text-[10px] font-bold ${styles.badge}`}
                        >
                          {styles.label}
                        </Badge>
                        {/* File icon + name */}
                        <FileIcon name={file.name} className="size-3.5 shrink-0 opacity-70" />
                        <span className="min-w-0 flex-1 break-all font-mono text-[11px] leading-4">
                          {file.path}
                        </span>
                        {/* Revert button — appears on hover */}
                        {onRevertFile && (
                          <button
                            type="button"
                            title="Revert file to GitHub version"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRevertFile(file.path);
                              // If this file was selected and it gets reverted, clear selection
                              if (selectedPath === file.path) setSelectedPath(null);
                            }}
                            className="ml-auto hidden shrink-0 rounded p-0.5 text-red-400 opacity-0 hover:bg-red-500/10 group-hover:opacity-100 group-hover:inline-flex"
                          >
                            <RotateCcw className="size-3" />
                          </button>
                        )}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </aside>

            {/* Diff Viewer */}
            <section className="flex min-h-0 min-w-0 flex-col bg-[var(--editor-bg)]">
              {activeFile ? (
                <>
                  {/* File path bar */}
                  <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border-color)] bg-[var(--card-bg)] px-3 py-1.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileIcon name={activeFile.name} className="size-3.5 shrink-0" />
                      <p className="truncate font-mono text-xs font-medium">
                        {activeFile.path}
                      </p>
                      <Badge
                        variant="outline"
                        className={`h-5 shrink-0 px-1.5 text-[10px] font-medium ${
                          STATUS_STYLES[activeFile.status].badge
                        }`}
                      >
                        {activeFile.status.charAt(0).toUpperCase() +
                          activeFile.status.slice(1)}
                      </Badge>
                    </div>
                    {onRevertFile && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 shrink-0 gap-1.5 text-red-300 hover:bg-red-500/10 hover:text-red-200"
                        onClick={() => {
                          onRevertFile(activeFile.path);
                          setSelectedPath(null);
                        }}
                      >
                        <RotateCcw className="size-3.5" />
                        Revert file
                      </Button>
                    )}
                  </div>
                  {/* Monaco diff */}
                  <div className="min-h-0 flex-1 p-2">
                    <DiffViewer
                      key={activeFile.path}
                      original={activeFile.originalContent}
                      modified={activeFile.content}
                      language={getLanguageFromPath(activeFile.path)}
                    />
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center p-8 text-center">
                  <p className="text-sm text-[var(--text-muted)]">
                    Select a file to view its diff
                  </p>
                </div>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, GitCommitHorizontal, RefreshCcw } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { ScrollArea } from "@/src/components/ui/scroll-area";
import { Separator } from "@/src/components/ui/separator";
import { Textarea } from "@/src/components/ui/textarea";
import type { SelectedRepository } from "@/src/types/github";

export type ChangedFile = {
  path: string;
  name: string;
  originalContent: string;
  content: string;
  status: "modified" | "added" | "deleted";
};

type CommitDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changedFiles: ChangedFile[];
  selectedRepository: SelectedRepository;
  /** Called on successful commit with the new commit SHA and new headSha */
  onCommitSuccess: (commitSha: string, newHeadSha: string, committedFiles: ChangedFile[]) => void;
  /** Called when user clicks Refresh Repository after a stale error */
  onRefreshRepository: () => void;
};

type CommitState =
  | { type: "idle" }
  | { type: "committing" }
  | { type: "success"; sha: string; shortSha: string; message: string }
  | { type: "stale"; localSha: string; remoteSha: string }
  | { type: "error"; message: string };

function StatusBadge({ status }: { status: ChangedFile["status"] }) {
  const map: Record<ChangedFile["status"], { label: string; className: string }> = {
    modified: {
      label: "M",
      className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    },
    added: {
      label: "A",
      className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    },
    deleted: {
      label: "D",
      className: "bg-red-500/15 text-red-400 border-red-500/30",
    },
  };
  const { label, className } = map[status];
  return (
    <Badge
      variant="outline"
      className={`h-4 min-w-[18px] justify-center px-1 py-0 text-[10px] font-bold ${className}`}
    >
      {label}
    </Badge>
  );
}

/** Inline Monaco Diff Editor */
function DiffViewer({
  original,
  modified,
  language,
}: {
  original: string;
  modified: string;
  language: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let disposed = false;
    let diffEditor: { dispose: () => void; setModel: (m: unknown) => void } | null = null;

    async function init() {
      try {
        const monaco = await import("@monaco-editor/react").then((m) => m.loader.init());
        if (disposed || !containerRef.current) return;

        diffEditor = monaco.editor.createDiffEditor(containerRef.current, {
          readOnly: true,
          renderSideBySide: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 12,
          lineNumbers: "on",
          wordWrap: "on",
          theme: document.documentElement.dataset.theme === "light" ? "vs" : "vs-dark",
          scrollbar: { vertical: "auto", horizontal: "auto" },
        }) as { dispose: () => void; setModel: (m: unknown) => void };

        const originalModel = monaco.editor.createModel(original, language);
        const modifiedModel = monaco.editor.createModel(modified, language);
        diffEditor.setModel({ original: originalModel, modified: modifiedModel });
      } catch {
        // Monaco may fail in SSR — ignore
      }
    }

    init();
    return () => {
      disposed = true;
      if (diffEditor) diffEditor.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [original, modified, language]);

  return (
    <div
      ref={containerRef}
      className="h-64 w-full rounded border border-[var(--border-color)] overflow-hidden"
    />
  );
}

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

export default function CommitDialog({
  open,
  onOpenChange,
  changedFiles,
  selectedRepository,
  onCommitSuccess,
  onRefreshRepository,
}: CommitDialogProps) {
  const [commitMessage, setCommitMessage] = useState("");
  const [selectedDiffFile, setSelectedDiffFile] = useState<ChangedFile | null>(null);
  const [commitState, setCommitState] = useState<CommitState>({ type: "idle" });

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setCommitMessage("");
      setSelectedDiffFile(null);
      setCommitState({ type: "idle" });
      if (changedFiles.length > 0) {
        setSelectedDiffFile(changedFiles[0]);
      }
    }
  }, [open, changedFiles]);

  const isCommitting = commitState.type === "committing";
  const isSuccess = commitState.type === "success";
  const isStale = commitState.type === "stale";

  const canCommit =
    commitMessage.trim().length > 0 &&
    changedFiles.length > 0 &&
    !isCommitting &&
    !isSuccess;

  async function handleCommit() {
    if (!canCommit) return;
    setCommitState({ type: "committing" });

    try {
      // 1. Check current remote HEAD for stale detection
      const branchRes = await fetch(
        `/api/github/branch?owner=${encodeURIComponent(selectedRepository.owner)}&repo=${encodeURIComponent(selectedRepository.repo)}&branch=${encodeURIComponent(selectedRepository.defaultBranch)}`,
      );
      const branchData = await branchRes.json();

      if (!branchRes.ok) {
        setCommitState({ type: "error", message: branchData.error || "Unable to reach GitHub. Try again." });
        return;
      }

      const remoteHeadSha: string = branchData.headSha;

      // 2. Compare remote HEAD to our local headSha
      if (remoteHeadSha !== selectedRepository.headSha) {
        setCommitState({
          type: "stale",
          localSha: selectedRepository.headSha,
          remoteSha: remoteHeadSha,
        });
        return;
      }

      // 3. Send commit request to server
      const commitRes = await fetch("/api/github/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: selectedRepository.owner,
          repo: selectedRepository.repo,
          branch: selectedRepository.defaultBranch,
          expectedHeadSha: selectedRepository.headSha,
          message: commitMessage.trim(),
          files: changedFiles.map((f) => ({
            path: f.path,
            content: f.status === "deleted" ? null : f.content,
            status: f.status,
          })),
        }),
      });

      const commitData = await commitRes.json();

      if (commitRes.status === 409) {
        // Race condition detected after commit attempt
        setCommitState({
          type: "stale",
          localSha: selectedRepository.headSha,
          remoteSha: "unknown",
        });
        return;
      }

      if (!commitRes.ok) {
        setCommitState({
          type: "error",
          message: commitData.message || commitData.error || "GitHub commit failed. Try again.",
        });
        return;
      }

      setCommitState({
        type: "success",
        sha: commitData.sha,
        shortSha: commitData.shortSha,
        message: commitMessage.trim(),
      });

      // Notify parent to clean up dirty state
      onCommitSuccess(
        commitData.sha,
        commitData.headSha || commitData.sha,
        changedFiles,
      );
    } catch {
      setCommitState({ type: "error", message: "Network error. Unable to reach GitHub." });
    }
  }

  function handleClose() {
    if (isCommitting) return;
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl border-[var(--border-color)] bg-[var(--sidebar-bg)] text-[var(--foreground)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <GitCommitHorizontal className="size-4 text-[#007acc]" />
            Commit Changes
          </DialogTitle>
        </DialogHeader>

        {/* ── Success State ─────────────────────────────────────────────────── */}
        {isSuccess && commitState.type === "success" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="size-10 text-emerald-400" />
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Changes committed to GitHub
            </p>
            <p className="max-w-xs text-xs text-[var(--text-muted)]">{commitState.message}</p>
            <code className="rounded bg-[var(--card-bg)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">
              {commitState.shortSha}
            </code>
            <Button
              size="sm"
              className="mt-2 h-7"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        )}

        {/* ── Stale / Repository Changed State ──────────────────────────────── */}
        {isStale && commitState.type === "stale" && (
          <div className="flex flex-col gap-4 py-4">
            <div className="flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-4">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" />
              <div className="flex flex-col gap-1.5">
                <p className="text-sm font-semibold text-amber-300">Repository Changed</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Someone pushed to this repository after you opened it.
                  Your changes were <strong>NOT</strong> pushed.
                </p>
                <div className="mt-1 space-y-1 font-mono text-[10px] text-[var(--text-muted)]">
                  <p>Your editor is based on: <span className="text-amber-400">{commitState.localSha.substring(0, 7)}</span></p>
                  {commitState.remoteSha !== "unknown" && (
                    <p>GitHub is now at: <span className="text-amber-400">{commitState.remoteSha.substring(0, 7)}</span></p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" className="h-7" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-7 gap-1.5"
                onClick={() => {
                  onOpenChange(false);
                  onRefreshRepository();
                }}
              >
                <RefreshCcw className="size-3.5" />
                Refresh Repository
              </Button>
            </div>
          </div>
        )}

        {/* ── Normal Commit UI ───────────────────────────────────────────────── */}
        {!isSuccess && !isStale && (
          <div className="flex flex-col gap-3">
            {/* Changed files list */}
            <div>
              <p className="mb-1.5 text-xs font-medium text-[var(--text-muted)]">
                {changedFiles.length} changed file{changedFiles.length !== 1 ? "s" : ""}
              </p>
              <ScrollArea className="max-h-36 rounded border border-[var(--border-color)]">
                <div className="divide-y divide-[var(--border-color)]">
                  {changedFiles.map((file) => (
                    <button
                      key={file.path}
                      type="button"
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-[var(--list-hover)] ${
                        selectedDiffFile?.path === file.path
                          ? "bg-[var(--list-active-bg)] text-[var(--list-active-fg)]"
                          : "text-[var(--foreground)]"
                      }`}
                      onClick={() => setSelectedDiffFile(file)}
                    >
                      <StatusBadge status={file.status} />
                      <span className="min-w-0 flex-1 truncate font-mono">{file.path}</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Diff viewer */}
            {selectedDiffFile && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-[var(--text-muted)]">
                  Diff —{" "}
                  <span className="font-mono text-[var(--foreground)]">
                    {selectedDiffFile.path}
                  </span>
                </p>
                <DiffViewer
                  key={selectedDiffFile.path}
                  original={selectedDiffFile.originalContent}
                  modified={selectedDiffFile.content}
                  language={getLanguageFromPath(selectedDiffFile.path)}
                />
              </div>
            )}

            <Separator className="bg-[var(--border-color)]" />

            {/* Error message */}
            {commitState.type === "error" && (
              <div className="flex items-center gap-2 rounded border border-red-500/30 bg-red-500/10 px-3 py-2">
                <AlertTriangle className="size-3.5 shrink-0 text-red-400" />
                <p className="text-xs text-red-300">{commitState.message}</p>
              </div>
            )}

            {/* Commit message */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-muted)]">
                Commit message
              </label>
              <Textarea
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Add a brief description of your changes..."
                className="min-h-[72px] resize-none border-[var(--border-color)] bg-[var(--card-bg)] text-xs text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus-visible:ring-[#007acc]"
                disabled={isCommitting}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    handleCommit();
                  }
                }}
              />
              <p className="text-[10px] text-[var(--text-muted)]">
                ⌘ Enter to commit
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7"
                onClick={handleClose}
                disabled={isCommitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-7 gap-1.5 bg-[#238636] hover:bg-[#2ea043] text-white"
                onClick={handleCommit}
                disabled={!canCommit}
              >
                {isCommitting ? (
                  <>
                    <span className="size-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Committing...
                  </>
                ) : (
                  <>
                    <GitCommitHorizontal className="size-3.5" />
                    Commit to GitHub
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

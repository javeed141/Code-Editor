"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileDiff,
  GitCommitHorizontal,
  RefreshCcw,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";
import { ScrollArea } from "@/src/components/ui/scroll-area";
import { Separator } from "@/src/components/ui/separator";
import { Textarea } from "@/src/components/ui/textarea";
import { Tooltip } from "@/src/components/ui/tooltip";
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
  /** Restores one local file to the version loaded from GitHub. */
  onRevertFile: (path: string) => void;
  /** Restores every local file to the version loaded from GitHub. */
  onRevertAll: () => void;
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

function getStatusLabel(status: ChangedFile["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function DiffStatusBadge({ status }: { status: ChangedFile["status"] }) {
  const className: Record<ChangedFile["status"], string> = {
    modified: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    added: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    deleted: "border-red-500/30 bg-red-500/10 text-red-300",
  };

  return (
    <Badge variant="outline" className={`h-5 px-1.5 text-[10px] font-medium ${className[status]}`}>
      {getStatusLabel(status)}
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
  }, [original, modified, language]);

  return (
    <div
      ref={containerRef}
      className="h-full min-h-0 w-full overflow-hidden rounded-[3px] border border-[var(--border-color)] bg-[var(--editor-bg)]"
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
  onRevertFile,
  onRevertAll,
}: CommitDialogProps) {
  const [commitMessage, setCommitMessage] = useState("");
  const [selectedDiffFile, setSelectedDiffFile] = useState<ChangedFile | null>(null);
  const [commitState, setCommitState] = useState<CommitState>({ type: "idle" });
  const [confirmingRevertAll, setConfirmingRevertAll] = useState(false);

  const effectiveSelectedFile = selectedDiffFile ?? changedFiles[0] ?? null;

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
    setCommitMessage("");
    setSelectedDiffFile(null);
    setCommitState({ type: "idle" });
    setConfirmingRevertAll(false);
    onOpenChange(false);
  }

  function handleRevertFile(path: string) {
    if (isCommitting) return;
    if (effectiveSelectedFile?.path === path) {
      setSelectedDiffFile(changedFiles.find((file) => file.path !== path) ?? null);
    }
    onRevertFile(path);
  }

  function handleRevertAll() {
    if (isCommitting) return;
    onRevertAll();
    setSelectedDiffFile(null);
    setConfirmingRevertAll(false);
  }

  return (
    <Dialog
      open={open}
      className="h-[86vh] max-h-[88vh] w-[94vw] max-w-[94vw]"
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleClose();
      }}
    >
      <DialogContent className="flex h-full max-h-none max-w-none flex-col overflow-hidden rounded-md border-[var(--border-color)] bg-[var(--sidebar-bg)] p-0 text-[var(--foreground)] shadow-lg">
        <DialogHeader className="mb-0 flex shrink-0 flex-row items-start justify-between gap-4 border-b border-[var(--border-color)] px-3 py-2">
          <div className="min-w-0">
            <DialogTitle className="flex items-center gap-2 text-sm">
              <GitCommitHorizontal className="size-4 text-[#58a6ff]" />
              Commit Changes
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-[10px] leading-3">
              Review local changes before committing
            </DialogDescription>
          </div>
          {!isSuccess && !isStale && changedFiles.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 gap-1 border-red-500/40 px-2 text-[10px] text-red-300 hover:bg-red-500/10 hover:text-red-200"
              onClick={() => setConfirmingRevertAll(true)}
              disabled={isCommitting}
            >
              <RotateCcw className="size-3" />
              Revert all changes
            </Button>
          )}
        </DialogHeader>

        {/* ── Success State ─────────────────────────────────────────────────── */}
        {isSuccess && commitState.type === "success" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 py-8 text-center">
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
              onClick={handleClose}
            >
              Close
            </Button>
          </div>
        )}

        {/* ── Stale / Repository Changed State ──────────────────────────────── */}
        {isStale && commitState.type === "stale" && (
          <div className="flex flex-1 flex-col gap-4 px-5 py-5">
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
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {changedFiles.length > 0 ? (
              <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-[248px_minmax(0,1fr)]">
                <aside className="flex min-h-0 flex-col border-b border-[var(--border-color)] bg-[var(--card-bg)] md:border-r md:border-b-0">
                  <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-color)] px-2.5 py-1.5">
                    <div className="flex items-center gap-2">
                      <FileDiff className="size-3.5 text-[var(--text-muted)]" />
                      <span className="text-[10px] font-semibold tracking-[0.08em] text-[var(--text-muted)]">CHANGES</span>
                    </div>
                    <Badge variant="outline" className="h-5 border-[var(--border-color)] px-1.5 text-[10px] font-medium text-[var(--text-muted)]">
                      {changedFiles.length} file{changedFiles.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <ScrollArea className="min-h-0 flex-1">
                    <div className="space-y-0.5 p-1.5">
                      {changedFiles.map((file) => (
                        <div
                          key={file.path}
                          className={`flex items-center gap-1 rounded-[3px] border-l-2 transition-colors hover:bg-[var(--list-hover)] ${
                            effectiveSelectedFile?.path === file.path
                              ? "border-[#58a6ff] bg-[#1f6feb]/15 text-[var(--foreground)]"
                              : "border-transparent text-[var(--text-muted)]"
                          }`}
                        >
                          <button
                            type="button"
                            className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left"
                            onClick={() => setSelectedDiffFile(file)}
                          >
                            <StatusBadge status={file.status} />
                            <span className="min-w-0 flex-1 break-all font-mono text-[11px] leading-4">{file.path}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </aside>

                <section className="flex min-h-0 min-w-0 flex-col bg-[var(--editor-bg)]">
                  {effectiveSelectedFile && (
                    <>
                      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border-color)] bg-[var(--card-bg)] px-3 py-1.5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-mono text-xs font-medium">{effectiveSelectedFile.path}</p>
                            <DiffStatusBadge status={effectiveSelectedFile.status} />
                          </div>
                          <p className="mt-0.5 text-[9px] leading-3 text-[var(--text-muted)]">Local changes not yet committed to GitHub</p>
                        </div>
                        <Tooltip label="Discard local edits for this file">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 shrink-0 gap-1.5 text-red-300 hover:bg-red-500/10 hover:text-red-200"
                            onClick={() => handleRevertFile(effectiveSelectedFile.path)}
                            disabled={isCommitting}
                          >
                            <RotateCcw className="size-3.5" />
                            Revert file
                          </Button>
                        </Tooltip>
                      </div>
                      <div className="min-h-0 flex-1 p-2">
                        <DiffViewer
                          key={effectiveSelectedFile.path}
                          original={effectiveSelectedFile.originalContent}
                          modified={effectiveSelectedFile.content}
                          language={getLanguageFromPath(effectiveSelectedFile.path)}
                        />
                      </div>
                    </>
                  )}
                </section>
              </div>
            ) : (
              <div className="flex min-h-[300px] flex-col items-center justify-center gap-2 px-5 text-center">
                <CheckCircle2 className="size-8 text-emerald-400" />
                <p className="text-sm font-medium">No local changes to commit</p>
                <p className="text-xs text-[var(--text-muted)]">All changes have been reverted to the GitHub version.</p>
              </div>
            )}

            <Separator />
            <div className="shrink-0 bg-[var(--sidebar-bg)] px-4 py-2.5">
              {commitState.type === "error" && (
                <div className="mb-3 flex items-center gap-2 rounded border border-red-500/30 bg-red-500/10 px-3 py-2">
                  <AlertTriangle className="size-3.5 shrink-0 text-red-400" />
                  <p className="text-xs text-red-300">{commitState.message}</p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,720px)_minmax(0,1fr)] sm:items-end">
                <div className="min-w-0">
                  <label className="mb-1 block text-[11px] font-medium text-[var(--foreground)]">Commit message</label>
                  <Textarea
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Add a brief description of your changes..."
                    className="min-h-[72px] resize-none border-[var(--border-color)] bg-[var(--card-bg)] px-3 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus-visible:ring-[#58a6ff]"
                    disabled={isCommitting || changedFiles.length === 0}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                        e.preventDefault();
                        handleCommit();
                      }
                    }}
                  />
                  <p className="mt-1 text-[10px] text-[var(--text-muted)]">⌘ Enter to commit</p>
                </div>
                <div className="flex shrink-0 justify-end gap-2 self-end pb-4">
                  <Button variant="outline" size="sm" className="h-8 px-3" onClick={handleClose} disabled={isCommitting}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 bg-[#238636] px-3 text-white hover:bg-[#2ea043]"
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
                        Commit {changedFiles.length} file{changedFiles.length !== 1 ? "s" : ""}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>

      <AlertDialog open={confirmingRevertAll} onOpenChange={setConfirmingRevertAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert all local changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This restores all {changedFiles.length} changed file{changedFiles.length !== 1 ? "s" : ""} to the version loaded from GitHub. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirmingRevertAll(false)}>
              Keep changes
            </Button>
            <Button size="sm" className="bg-red-600 text-white hover:bg-red-500" onClick={handleRevertAll}>
              Revert all changes
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

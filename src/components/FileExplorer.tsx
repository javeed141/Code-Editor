"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Edit2,
  FileCode2,
  FilePlus,
  FolderGit2,
  FolderPlus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import type { OpenFile, RepoFile } from "@/src/types/editor";
import type { ChangedFile } from "@/src/components/CommitDialog";
import type { SelectedRepository } from "@/src/types/github";
import FileIcon from "@/src/components/FileIcon";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { ScrollArea } from "@/src/components/ui/scroll-area";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Tooltip } from "@/src/components/ui/tooltip";
import { toast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";

type FileExplorerProps = {
  files: RepoFile[];
  selectedPath: string | null;
  openFiles: Record<string, OpenFile>;
  onFileSelect: (path: string) => void;
  isAuthenticated: boolean;
  selectedRepository: SelectedRepository | null;
  authLoading?: boolean;
  repoLoading: boolean;
  onRefresh?: () => void;
  onOpenRepoModal?: () => void;
  onSignIn: () => void;
  changedFiles: ChangedFile[];
  onCreateFile?: (parentDirPath: string, fileName: string) => boolean;
  onCreateFolder?: (parentDirPath: string, folderName: string) => boolean;
  onRename?: (oldPath: string, newName: string, isFolder: boolean) => boolean;
  onDelete?: (targetPath: string, isFolder: boolean) => void;
};

type ContextMenuState = {
  x: number;
  y: number;
  path: string;
  isFolder: boolean;
  name: string;
} | null;

type ModalState =
  | { type: "new-file"; targetPath: string }
  | { type: "new-folder"; targetPath: string }
  | { type: "rename"; path: string; isFolder: boolean; currentName: string }
  | { type: "delete"; path: string; isFolder: boolean; name: string }
  | null;

function TreeNode({
  node,
  depth,
  selectedPath,
  openFiles,
  onFileSelect,
  forceExpanded,
  onNodeContextMenu,
}: {
  node: RepoFile;
  depth: number;
  selectedPath: string | null;
  openFiles: Record<string, OpenFile>;
  onFileSelect: (path: string) => void;
  forceExpanded: boolean;
  onNodeContextMenu: (e: React.MouseEvent, node: RepoFile) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const expanded = forceExpanded || isExpanded;
  const isFolder = node.type === "folder";
  const isSelected = node.path === selectedPath;
  const isModified = Boolean(openFiles[node.path]?.isModified);

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => (isFolder ? setIsExpanded((current) => !current) : onFileSelect(node.path))}
        onContextMenu={(e) => onNodeContextMenu(e, node)}
        className={`group flex h-7 w-full items-center gap-1.5 rounded-md pr-2 text-left text-xs transition-colors cursor-pointer select-none ${
          isSelected
            ? "bg-[#202434] text-white font-medium shadow-sm border-l-2 border-emerald-500"
            : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
        }`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        aria-expanded={isFolder ? expanded : undefined}
        aria-current={isSelected ? "page" : undefined}
      >
        {isFolder ? (
          <span className="flex size-3.5 shrink-0 items-center justify-center text-slate-400 group-hover:text-slate-200">
            {expanded ? (
              <ChevronDown aria-hidden="true" className="size-3.5" />
            ) : (
              <ChevronRight aria-hidden="true" className="size-3.5" />
            )}
          </span>
        ) : (
          <span className="size-3.5 shrink-0" />
        )}
        <FileIcon name={node.name} isFolder={isFolder} isOpen={expanded} />
        <span className="truncate text-[12.5px] leading-none">{node.name}</span>
        {isModified && (
          <span className="ml-auto size-1.5 shrink-0 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]" title="Unsaved changes" />
        )}
      </button>
      {isFolder &&
        expanded &&
        node.children?.map((child) => (
          <TreeNode
            key={child.path}
            node={child}
            depth={depth + 1}
            selectedPath={selectedPath}
            openFiles={openFiles}
            onFileSelect={onFileSelect}
            forceExpanded={forceExpanded}
            onNodeContextMenu={onNodeContextMenu}
          />
        ))}
    </div>
  );
}

export default function FileExplorer({
  files,
  selectedPath,
  openFiles,
  onFileSelect,
  isAuthenticated,
  selectedRepository,
  authLoading,
  repoLoading,
  onRefresh,
  onOpenRepoModal,
  onSignIn,
  changedFiles: _changedFiles,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDelete,
}: FileExplorerProps) {
  const [query, setQuery] = useState("");
  const forceExpanded = query.trim().length > 0;

  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [modalState, setModalState] = useState<ModalState>(null);
  const [inputVal, setInputVal] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  const contextMenuRef = useRef<HTMLDivElement>(null);

  const contextMenuPos = useMemo(() => {
    if (!contextMenu) return null;
    const menuWidth = 160;
    const menuHeight = contextMenu.isFolder ? 150 : 180;
    const x = Math.min(contextMenu.x, (typeof window !== "undefined" ? window.innerWidth : 1000) - menuWidth - 12);
    const y = Math.min(contextMenu.y, (typeof window !== "undefined" ? window.innerHeight : 1000) - menuHeight - 12);
    return { x: Math.max(8, x), y: Math.max(8, y) };
  }, [contextMenu]);

  // Close context menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    }
    if (contextMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [contextMenu]);

  const visibleFiles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return files;

    function filterNodes(nodes: RepoFile[]): RepoFile[] {
      return nodes.flatMap((node) => {
        const children = node.children ? filterNodes(node.children) : [];
        if (node.name.toLowerCase().includes(normalizedQuery) || children.length > 0) {
          return [{ ...node, children: node.type === "folder" ? children : undefined }];
        }
        return [];
      });
    }
    return filterNodes(files);
  }, [files, query]);

  const handleNodeContextMenu = (e: React.MouseEvent, node: RepoFile) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      path: node.path,
      isFolder: node.type === "folder",
      name: node.name,
    });
  };

  const handleBackgroundContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      path: "",
      isFolder: true,
      name: "Workspace Root",
    });
  };

  const openNewFileModal = (targetPath: string) => {
    setInputVal("");
    setInputError(null);
    setModalState({ type: "new-file", targetPath });
    setContextMenu(null);
  };

  const openNewFolderModal = (targetPath: string) => {
    setInputVal("");
    setInputError(null);
    setModalState({ type: "new-folder", targetPath });
    setContextMenu(null);
  };

  const openRenameModal = (path: string, isFolder: boolean, currentName: string) => {
    setInputVal(currentName);
    setInputError(null);
    setModalState({ type: "rename", path, isFolder, currentName });
    setContextMenu(null);
  };

  const openDeleteModal = (path: string, isFolder: boolean, name: string) => {
    setModalState({ type: "delete", path, isFolder, name });
    setContextMenu(null);
  };

  const handleModalSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!modalState) return;

    if (modalState.type === "new-file") {
      const ok = onCreateFile?.(modalState.targetPath, inputVal);
      if (ok) setModalState(null);
    } else if (modalState.type === "new-folder") {
      const ok = onCreateFolder?.(modalState.targetPath, inputVal);
      if (ok) setModalState(null);
    } else if (modalState.type === "rename") {
      const ok = onRename?.(modalState.path, inputVal, modalState.isFolder);
      if (ok) setModalState(null);
    }
  };

  const handleConfirmDelete = () => {
    if (modalState?.type === "delete") {
      onDelete?.(modalState.path, modalState.isFolder);
      setModalState(null);
    }
  };

  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-[var(--border-color)] bg-[var(--sidebar-bg)] select-none">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-white/[0.08] px-3.5">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Explorer
        </h2>
        {selectedRepository && (
          <div className="flex items-center gap-1">
            <Tooltip label="New File">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openNewFileModal(selectedPath ? selectedPath.split("/").slice(0, -1).join("/") : "")}
                className="size-7 text-slate-400 hover:text-slate-100 hover:bg-white/10 rounded-md transition-colors"
                aria-label="New File"
              >
                <FilePlus aria-hidden="true" className="size-3.5" />
              </Button>
            </Tooltip>

            <Tooltip label="New Folder">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openNewFolderModal(selectedPath ? selectedPath.split("/").slice(0, -1).join("/") : "")}
                className="size-7 text-slate-400 hover:text-slate-100 hover:bg-white/10 rounded-md transition-colors"
                aria-label="New Folder"
              >
                <FolderPlus aria-hidden="true" className="size-3.5" />
              </Button>
            </Tooltip>

            <Tooltip label="Refresh file tree">
              <Button
                variant="ghost"
                size="icon"
                onClick={onRefresh}
                className="size-7 text-slate-400 hover:text-slate-100 hover:bg-white/10 rounded-md transition-colors"
                aria-label="Refresh file tree"
              >
                <RefreshCw aria-hidden="true" className="size-3.5" />
              </Button>
            </Tooltip>
          </div>
        )}
      </div>

      {selectedRepository && (
        <div className="p-2 border-b border-white/[0.06] bg-black/10">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-slate-500"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter files..."
              aria-label="Filter files"
              className="h-8 rounded-md bg-black/20 pl-8 text-xs text-slate-200 placeholder:text-slate-500 border-white/10 focus-visible:ring-1 focus-visible:ring-emerald-500/50"
            />
          </div>
        </div>
      )}

      <ScrollArea
        className="flex-1 px-1 py-1.5"
        onContextMenu={handleBackgroundContextMenu}
      >
        {authLoading || repoLoading ? (
          <div className="space-y-3 px-3 py-4">
            <div className="flex items-center gap-2">
              <Skeleton className="size-3.5 rounded-[2px]" />
              <Skeleton className="h-3.5 w-28" />
            </div>
            <div className="space-y-2 pt-0.5 pl-4">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3.5 w-32" />
            </div>
          </div>
        ) : !isAuthenticated && !selectedRepository ? (
          <div className="flex flex-col items-center justify-center p-4 text-center">
            <FolderGit2 className="mb-2 size-8 text-[var(--text-muted)] opacity-60" />
            <p className="text-xs font-medium text-[var(--foreground)]">No repository selected</p>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
              Sign in with GitHub to view and open your repositories.
            </p>
            <Button
              onClick={onSignIn}
              size="sm"
              className="mt-3 h-7 text-xs bg-[#24292e] text-white hover:bg-[#2f363d] dark:bg-[#238636] dark:hover:bg-[#2ea043]"
            >
              Sign in with GitHub
            </Button>
          </div>
        ) : isAuthenticated && !selectedRepository ? (
          <div className="flex flex-col items-center justify-center p-4 text-center">
            <FolderGit2 className="mb-2 size-8 text-[#007acc] opacity-80" />
            <p className="text-xs font-medium text-[var(--foreground)]">
              Select a GitHub repository
            </p>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
              Choose a repository from your GitHub account to explore its files.
            </p>
            <Button
              onClick={onOpenRepoModal}
              size="sm"
              className="mt-3 h-7 text-xs"
            >
              Select Repository
            </Button>
          </div>
        ) : visibleFiles.length > 0 ? (
          visibleFiles.map((file) => (
            <TreeNode
              key={file.path}
              node={file}
              depth={0}
              selectedPath={selectedPath}
              openFiles={openFiles}
              onFileSelect={onFileSelect}
              forceExpanded={forceExpanded}
              onNodeContextMenu={handleNodeContextMenu}
            />
          ))
        ) : query ? (
          <p className="px-3 py-4 text-xs text-[var(--text-muted)]">No matching files.</p>
        ) : (
          <div className="p-4 text-center">
            <p className="text-xs text-[var(--text-muted)]">This repository is empty.</p>
          </div>
        )}
      </ScrollArea>

      {/* ── Floating Custom Context Menu ────────────────────────────────────────── */}
      {contextMenu && contextMenuPos && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 min-w-[160px] overflow-hidden rounded-lg border border-white/10 bg-[#161822] p-1.5 text-slate-200 shadow-2xl backdrop-blur-md animate-in fade-in-0 zoom-in-95"
          style={{ top: `${contextMenuPos.y}px`, left: `${contextMenuPos.x}px` }}
        >
          {contextMenu.isFolder ? (
            <>
              <button
                type="button"
                onClick={() => openNewFileModal(contextMenu.path)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/10 transition-colors"
              >
                <FilePlus className="size-3.5 text-emerald-400" />
                <span>New File</span>
              </button>

              <button
                type="button"
                onClick={() => openNewFolderModal(contextMenu.path)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/10 transition-colors"
              >
                <FolderPlus className="size-3.5 text-cyan-400" />
                <span>New Folder</span>
              </button>

              {contextMenu.path && (
                <>
                  <div className="my-1 h-px bg-white/10" />

                  <button
                    type="button"
                    onClick={() => openRenameModal(contextMenu.path, true, contextMenu.name)}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/10 transition-colors"
                  >
                    <Edit2 className="size-3.5 text-amber-400" />
                    <span>Rename</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openDeleteModal(contextMenu.path, true, contextMenu.name)}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-rose-300 hover:bg-rose-500/20 transition-colors"
                  >
                    <Trash2 className="size-3.5 text-rose-400" />
                    <span>Delete</span>
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  onFileSelect(contextMenu.path);
                  setContextMenu(null);
                }}
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/10 transition-colors"
              >
                <FileCode2 className="size-3.5 text-cyan-400" />
                <span>Open</span>
              </button>

              <button
                type="button"
                onClick={() => openRenameModal(contextMenu.path, false, contextMenu.name)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/10 transition-colors"
              >
                <Edit2 className="size-3.5 text-amber-400" />
                <span>Rename</span>
              </button>

              <button
                type="button"
                onClick={() => openDeleteModal(contextMenu.path, false, contextMenu.name)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-rose-300 hover:bg-rose-500/20 transition-colors"
              >
                <Trash2 className="size-3.5 text-rose-400" />
                <span>Delete</span>
              </button>

              <div className="my-1 h-px bg-white/10" />

              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(contextMenu.path);
                  toast.add({ title: "Copied", description: "Path copied to clipboard.", type: "info" });
                  setContextMenu(null);
                }}
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/10 transition-colors"
              >
                <Copy className="size-3.5 text-slate-400" />
                <span>Copy Path</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Dialog: New File / New Folder / Rename ────────────────────────────── */}
      {modalState && modalState.type !== "delete" && (
        <Dialog open={true} onOpenChange={(open) => !open && setModalState(null)}>
          <DialogContent className="w-full max-w-sm rounded-xl border border-white/10 bg-[#141620] p-5 text-slate-100 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-sm font-semibold">
                {modalState.type === "new-file" && (
                  <span>New File {modalState.targetPath ? `in &quot;${modalState.targetPath}&quot;` : ""}</span>
                )}
                {modalState.type === "new-folder" && (
                  <span>New Folder {modalState.targetPath ? `in &quot;${modalState.targetPath}&quot;` : ""}</span>
                )}
                {modalState.type === "rename" && (
                  <span>Rename {modalState.isFolder ? "Folder" : "File"} &quot;{modalState.currentName}&quot;</span>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 pt-1">
                {modalState.type === "new-file" && "Enter a filename to create in the local workspace."}
                {modalState.type === "new-folder" && "Enter a folder name to create."}
                {modalState.type === "rename" && "Enter a new name for this item."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleModalSubmit} className="space-y-4 pt-2">
              <Input
                value={inputVal}
                onChange={(e) => {
                  setInputVal(e.target.value);
                  if (inputError) setInputError(null);
                }}
                placeholder={
                  modalState.type === "new-file"
                    ? "e.g. auth.js or utils/helper.ts"
                    : modalState.type === "new-folder"
                      ? "e.g. components"
                      : "New name..."
                }
                autoFocus
                className="h-9 rounded-md bg-black/30 border-white/10 text-xs font-mono text-slate-100 focus-visible:ring-1 focus-visible:ring-emerald-500"
              />
              {inputError && <p className="text-[11px] text-rose-400">{inputError}</p>}

              <DialogFooter className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setModalState(null)}
                  className="h-8 rounded-md px-3 text-xs bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 rounded-md px-3.5 text-xs bg-emerald-600 text-white hover:bg-emerald-500 font-semibold shadow-sm"
                >
                  {modalState.type === "rename" ? "Rename" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ── AlertDialog: Delete Confirmation ────────────────────────────────────── */}
      {modalState && modalState.type === "delete" && (
        <AlertDialog open={true} onOpenChange={(open) => !open && setModalState(null)}>
          <AlertDialogContent className="w-full max-w-sm rounded-xl border border-white/10 bg-[#141620] p-5 text-slate-100 shadow-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-sm font-semibold">
                Delete {modalState.name}?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-slate-400 pt-1">
                Are you sure you want to delete <span className="font-mono text-slate-200 font-medium">{modalState.path}</span>?
                {modalState.isFolder ? " This will remove all files inside this folder." : " This file will be marked for deletion."}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter className="mt-4 flex justify-end gap-2">
              <AlertDialogCancel
                onClick={() => setModalState(null)}
                className="h-8 rounded-md px-3 text-xs bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300"
              >
                Cancel
              </AlertDialogCancel>

              <Button
                type="button"
                onClick={handleConfirmDelete}
                className="h-8 rounded-md px-3.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-sm"
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </aside>
  );
}

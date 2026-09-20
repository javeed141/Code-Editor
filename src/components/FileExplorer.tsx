"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FolderGit2, RefreshCw, Search } from "lucide-react";
import type { OpenFile, RepoFile } from "@/src/types/editor";
import type { ChangedFile } from "@/src/components/CommitDialog";
import type { SelectedRepository } from "@/src/types/github";
import FileIcon from "@/src/components/FileIcon";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { ScrollArea } from "@/src/components/ui/scroll-area";
import { Separator } from "@/src/components/ui/separator";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Tooltip } from "@/src/components/ui/tooltip";

type FileExplorerProps = {
  files: RepoFile[];
  selectedPath: string | null;
  openFiles: Record<string, OpenFile>;
  onFileSelect: (path: string) => void;
  isAuthenticated: boolean;
  selectedRepository: SelectedRepository | null;
  repoLoading: boolean;
  onRefresh?: () => void;
  onOpenRepoModal?: () => void;
  onSignIn: () => void;
  changedFiles: ChangedFile[];
};

function TreeNode({
  node,
  depth,
  selectedPath,
  openFiles,
  onFileSelect,
  forceExpanded,
}: {
  node: RepoFile;
  depth: number;
  selectedPath: string | null;
  openFiles: Record<string, OpenFile>;
  onFileSelect: (path: string) => void;
  forceExpanded: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const expanded = forceExpanded || isExpanded;
  const isFolder = node.type === "folder";
  const isSelected = node.path === selectedPath;
  const isModified = Boolean(openFiles[node.path]?.isModified);

  return (
    <div>
      <button
        type="button"
        onClick={() => (isFolder ? setIsExpanded((current) => !current) : onFileSelect(node.path))}
        className={`group flex h-6 w-full items-center gap-1.5 rounded-[2px] pr-2 text-left text-xs transition-colors cursor-pointer select-none ${
          isSelected
            ? "bg-[var(--list-active)] text-[var(--list-active-fg)] font-medium"
            : "text-[var(--foreground)] hover:bg-[var(--list-hover)]"
        }`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        aria-expanded={isFolder ? expanded : undefined}
        aria-current={isSelected ? "page" : undefined}
      >
        {isFolder ? (
          <span className="flex size-3.5 items-center justify-center text-[var(--text-muted)]">
            {expanded ? (
              <ChevronDown aria-hidden="true" className="size-3" />
            ) : (
              <ChevronRight aria-hidden="true" className="size-3" />
            )}
          </span>
        ) : (
          <span className="size-3.5" />
        )}
        <FileIcon name={node.name} isFolder={isFolder} isOpen={expanded} />
        <span className="truncate">{node.name}</span>
        {isModified && (
          <span
            className="ml-auto text-[10px] text-amber-400"
            title="Unsaved changes"
          >
            ●
          </span>
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
  repoLoading,
  onRefresh,
  onOpenRepoModal,
  onSignIn,
  changedFiles,
}: FileExplorerProps) {
  const [query, setQuery] = useState("");
  const forceExpanded = query.trim().length > 0;

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

  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-[var(--border-color)] bg-[var(--sidebar-bg)] select-none">
      <div className="flex h-9 shrink-0 items-center justify-between px-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
          Explorer
        </h2>
        {selectedRepository && (
          <Tooltip label="Refresh file tree">
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              className="size-6 text-[var(--text-muted)] hover:text-[var(--foreground)]"
              aria-label="Refresh file tree"
            >
              <RefreshCw aria-hidden="true" className="size-3" />
            </Button>
          </Tooltip>
        )}
      </div>

      {selectedRepository && (
        <div className="px-2 pb-2">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-2 top-2 size-3 text-[var(--text-muted)]"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter files..."
              aria-label="Filter files"
              className="h-7 pl-7 text-[11px]"
            />
          </div>
        </div>
      )}

      <Separator />

      <ScrollArea className="flex-1 px-1 py-1.5">
        {repoLoading ? (
          <div className="space-y-2 px-3 py-4">
            <p className="text-xs text-[var(--text-muted)]">Loading files from GitHub...</p>
            <div className="space-y-1.5 pt-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-44" />
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
    </aside>
  );
}

"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, RefreshCw, Search } from "lucide-react";
import type { OpenFile, RepoFile } from "@/src/types/editor";
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
  const [isExpanded, setIsExpanded] = useState(depth < 2 || forceExpanded);
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
        <Tooltip label="Refresh file tree">
          <Button
            variant="ghost"
            size="icon"
            className="size-6 text-[var(--text-muted)] hover:text-[var(--foreground)]"
            aria-label="Refresh file tree"
          >
            <RefreshCw aria-hidden="true" className="size-3" />
          </Button>
        </Tooltip>
      </div>
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
      <Separator />
      <ScrollArea className="flex-1 px-1 py-1.5">
        {visibleFiles.length > 0 ? (
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
          <div className="space-y-2 px-3 py-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}

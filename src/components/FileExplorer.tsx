import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, File, FileCode2, FileJson2, Folder, RefreshCw, Search } from "lucide-react";
import type { OpenFile, RepoFile } from "@/src/types/editor";
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

function FileIcon({ name, isFolder = false }: { name: string; isFolder?: boolean }) {
  if (isFolder) {
    return <Folder aria-hidden="true" className="size-3.5 shrink-0 text-amber-300/75" />;
  }

  if (name.endsWith(".js") || name.endsWith(".ts")) {
    return <FileCode2 aria-hidden="true" className="size-3.5 shrink-0 text-yellow-300/80" />;
  }
  if (name.endsWith(".json")) {
    return <FileJson2 aria-hidden="true" className="size-3.5 shrink-0 text-emerald-300/80" />;
  }
  return <File aria-hidden="true" className="size-3.5 shrink-0 text-slate-500" />;
}

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
      <Button
        type="button"
        onClick={() => (isFolder ? setIsExpanded((current) => !current) : onFileSelect(node.path))}
        className={`group flex h-7 w-full justify-start rounded-sm pr-2 text-left text-xs ${
          isSelected
            ? "border-l-2 border-blue-400 bg-red text-slate-100"
            : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200"
        }`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        aria-expanded={isFolder ? expanded : undefined}
        aria-current={isSelected ? "page" : undefined}
      >
        {isFolder ? (
          expanded ? (
            <ChevronDown aria-hidden="true" className="size-3 text-slate-600" />
          ) : (
            <ChevronRight aria-hidden="true" className="size-3 text-slate-600" />
          )
        ) : (
          <span className="size-3" />
        )}
        <FileIcon name={node.name} isFolder={isFolder} />
        <span className="truncate">{node.name}</span>
        {isModified && <span className="ml-auto text-[11px] text-amber-300">●</span>}
      </Button>
      {isFolder && expanded && node.children?.map((child) => (
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
    <aside className="flex min-h-0 flex-col border-r border-slate-800/90 bg-[#101318]">
      <div className="flex h-9 shrink-0 items-center justify-between px-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Files</h2>
        <Tooltip label="Refresh file tree">
          <Button variant="ghost" size="icon" className="size-6" aria-label="Refresh file tree">
            <RefreshCw aria-hidden="true" className="size-3 text-slate-500" />
          </Button>
        </Tooltip>
      </div>
      <div className="px-2 pb-2">
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-2 top-2 size-3 text-slate-500" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter files..." aria-label="Filter files" className="h-7 pl-7 text-[11px]" />
        </div>
      </div>
      <Separator />
      <ScrollArea className="flex-1 px-1.5 py-2">
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
        ) : (
          query ? <p className="px-2 py-5 text-xs text-slate-600">No matching files.</p> : (
            <div className="space-y-2 px-2 py-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          )
        )}
      </ScrollArea>
    </aside>
  );
}

import { useState } from "react";
import type { OpenFile, RepoFile } from "@/src/types/editor";

type FileExplorerProps = {
  files: RepoFile[];
  selectedPath: string | null;
  openFiles: Record<string, OpenFile>;
  onFileSelect: (path: string) => void;
};

function FileIcon({ name, isFolder = false }: { name: string; isFolder?: boolean }) {
  if (isFolder) {
    return (
      <svg aria-hidden="true" className="size-4 shrink-0 text-amber-300/80" viewBox="0 0 24 24" fill="none">
        <path d="M3.5 6.5h6l2 2h9v9.5a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3.5 18V6.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    );
  }

  const color = name.endsWith(".js")
    ? "text-yellow-300"
    : name.endsWith(".json")
      ? "text-emerald-300"
      : name.endsWith(".md")
        ? "text-sky-300"
        : "text-slate-400";

  return (
    <svg aria-hidden="true" className={`size-4 shrink-0 ${color}`} viewBox="0 0 24 24" fill="none">
      <path d="M6 3.5h8l4 4V20.5H6V3.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M14 3.5v4h4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function TreeNode({
  node,
  depth,
  selectedPath,
  openFiles,
  onFileSelect,
}: {
  node: RepoFile;
  depth: number;
  selectedPath: string | null;
  openFiles: Record<string, OpenFile>;
  onFileSelect: (path: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const isFolder = node.type === "folder";
  const isSelected = node.path === selectedPath;
  const isModified = Boolean(openFiles[node.path]?.isModified);

  return (
    <div>
      <button
        type="button"
        onClick={() => (isFolder ? setIsExpanded((expanded) => !expanded) : onFileSelect(node.path))}
        className={`group flex h-8 w-full items-center gap-1.5 rounded-md pr-2 text-left text-[13px] transition ${
          isSelected
            ? "bg-cyan-400/10 text-cyan-100"
            : "text-slate-400 hover:bg-white/[0.045] hover:text-slate-200"
        }`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        aria-expanded={isFolder ? isExpanded : undefined}
      >
        {isFolder ? (
          <svg aria-hidden="true" className={`size-3 text-slate-600 transition-transform ${isExpanded ? "rotate-90" : ""}`} viewBox="0 0 16 16" fill="currentColor">
            <path d="m6 3 5 5-5 5V3Z" />
          </svg>
        ) : (
          <span className="size-3" />
        )}
        <FileIcon name={node.name} isFolder={isFolder} />
        <span className="truncate">{node.name}</span>
        {isModified && <span className="ml-auto text-[11px] text-cyan-300">●</span>}
      </button>
      {isFolder && isExpanded && node.children?.map((child) => (
        <TreeNode
          key={child.path}
          node={child}
          depth={depth + 1}
          selectedPath={selectedPath}
          openFiles={openFiles}
          onFileSelect={onFileSelect}
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
  return (
    <aside className="flex min-h-0 flex-col border-r border-white/[0.08] bg-[#111419]">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.06] px-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Explorer
        </h2>
        <span className="text-[10px] uppercase tracking-wider text-slate-600">
          Files
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {files.length > 0 ? (
          files.map((file) => (
            <TreeNode
              key={file.path}
              node={file}
              depth={0}
              selectedPath={selectedPath}
              openFiles={openFiles}
              onFileSelect={onFileSelect}
            />
          ))
        ) : (
          <p className="px-3 py-5 text-xs text-slate-600">This repository is empty.</p>
        )}
      </div>
    </aside>
  );
}

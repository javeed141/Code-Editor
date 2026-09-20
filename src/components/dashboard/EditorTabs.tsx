import { X } from "lucide-react";
import FileIcon from "@/src/components/FileIcon";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/src/components/ui/breadcrumb";
import { Badge } from "@/src/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import type { OpenFile } from "@/src/types/editor";

interface EditorTabsProps {
  openFiles: Record<string, OpenFile>;
  selectedFile: OpenFile;
  selectedPath: string | null;
  onSelectPath: (path: string) => void;
  onCloseTab: (path: string) => void;
}

export function EditorTabs({
  openFiles,
  selectedFile,
  selectedPath,
  onSelectPath,
  onCloseTab,
}: EditorTabsProps) {
  return (
    <>
      <div className="flex h-7 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--border-color)] bg-[var(--tabbar-bg)] px-3 text-[11px] select-none">
        <Breadcrumb className="min-w-0 text-[11px]">
          <BreadcrumbList className="text-[11px]">
            {selectedFile.path.split("/").map((part, index, parts) => (
              <span key={`${part}-${index}`} className="flex min-w-0 items-center text-[11px]">
                {index > 0 && <BreadcrumbSeparator className="size-3" />}
                <BreadcrumbItem className="text-[11px]">
                  {index === parts.length - 1 ? (
                    <BreadcrumbPage className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--foreground)]">
                      <FileIcon name={part} className="size-3" />
                      {part}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink className="text-[11px] text-[var(--text-muted)] hover:text-[var(--foreground)]">
                      {part}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </span>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center gap-2">
          {selectedFile.isModified && (
            <Badge className="gap-1 border-amber-500/30 bg-amber-500/10 px-1.5 py-0 text-[9px] text-amber-500 dark:text-amber-300">
              <span className="size-1.5 rounded-full bg-amber-400" />
              Modified
            </Badge>
          )}
          <Badge variant="secondary" className="hidden px-1.5 py-0 text-[9px] sm:inline-flex">
            {selectedFile.language}
          </Badge>
        </div>
      </div>

      <Tabs
        value={selectedPath ?? ""}
        onValueChange={onSelectPath}
        className="shrink-0 border-b border-[var(--border-color)] bg-[var(--tabbar-bg)]"
      >
        <TabsList className="h-9 w-full justify-start overflow-x-auto no-scrollbar p-0">
          {Object.values(openFiles).map((file) => (
            <TabsTrigger
              key={file.path}
              value={file.path}
              className="group h-9 px-3 text-xs font-medium gap-2 rounded-none border-r border-[var(--border-color)] data-[state=active]:bg-[var(--editor-bg)] data-[state=active]:border-b-2 data-[state=active]:border-b-[#007acc]"
            >
              <FileIcon name={file.name} className="size-3.5 shrink-0" />
              <span className="max-w-[140px] truncate text-xs">{file.name}</span>
              {file.isModified ? (
                <span className="size-2 rounded-full bg-amber-400 group-hover:hidden" />
              ) : null}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(file.path);
                }}
                className={`rounded-[2px] p-0.5 text-[var(--text-muted)] hover:bg-[rgba(128,128,128,0.25)] hover:text-[var(--foreground)] ${
                  file.isModified ? "hidden group-hover:inline-flex" : "opacity-0 group-hover:opacity-100"
                }`}
                aria-label={`Close ${file.name}`}
              >
                <X className="size-3" />
              </button>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </>
  );
}


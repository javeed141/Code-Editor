"use client";

import { useCallback, useEffect, useState } from "react";
import { Keyboard, Save, Search, X } from "lucide-react";
import ChatPanel from "@/src/components/ChatPanel";
import CodeEditor from "@/src/components/CodeEditor";
import EditorStatusBar from "@/src/components/EditorStatusBar";
import FileExplorer from "@/src/components/FileExplorer";
import FileIcon from "@/src/components/FileIcon";
import Header from "@/src/components/Header";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/src/components/ui/breadcrumb";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/src/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/src/components/ui/dialog";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/src/components/ui/resizable";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { Badge } from "@/src/components/ui/badge";
import { mockRepository, repositoryName } from "@/src/data/mockRepository";
import { findFileByPath, getLanguageFromPath } from "@/src/lib/utils";
import type { OpenFile } from "@/src/types/editor";

const initialPath = "src/server.js";
const initialFile = findFileByPath(mockRepository, initialPath);
const initialOpenFiles: Record<string, OpenFile> =
  initialFile?.content !== undefined
    ? { [initialPath]: createOpenFile(initialPath, initialFile.content, initialFile.name) }
    : {};

function createOpenFile(path: string, content: string, name: string): OpenFile {
  return {
    path,
    name,
    language: getLanguageFromPath(path),
    originalContent: content,
    content,
    isModified: false,
  };
}

export default function Dashboard() {
  const [selectedPath, setSelectedPath] = useState<string | null>(
    initialFile ? initialPath : null,
  );
  const [openFiles, setOpenFiles] = useState<Record<string, OpenFile>>(initialOpenFiles);
  const [commandOpen, setCommandOpen] = useState(false);

  const selectedFile = selectedPath ? openFiles[selectedPath] : undefined;

  const handleSave = useCallback(() => {
    if (!selectedPath) return;
    setOpenFiles((current) => {
      const file = current[selectedPath];
      if (!file) return current;
      return {
        ...current,
        [selectedPath]: {
          ...file,
          originalContent: file.content,
          isModified: false,
        },
      };
    });
  }, [selectedPath]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave]);

  function handleFileSelect(path: string) {
    const file = findFileByPath(mockRepository, path);
    if (!file || file.content === undefined) return;

    setOpenFiles((current) => ({
      ...current,
      [path]: current[path] ?? createOpenFile(path, file.content ?? "", file.name),
    }));
    setSelectedPath(path);
  }

  function handleCloseTab(path: string) {
    setOpenFiles((current) => {
      const next = { ...current };
      delete next[path];

      if (selectedPath === path) {
        const remainingKeys = Object.keys(next);
        setSelectedPath(remainingKeys.length > 0 ? remainingKeys[remainingKeys.length - 1] : null);
      }

      return next;
    });
  }

  function handleContentChange(content: string) {
    if (!selectedPath) return;
    setOpenFiles((current) => {
      const file = current[selectedPath];
      if (!file) return current;
      return {
        ...current,
        [selectedPath]: {
          ...file,
          content,
          isModified: content !== file.originalContent,
        },
      };
    });
  }

  function handleDiscard() {
    if (!selectedPath) return;
    setOpenFiles((current) => {
      const file = current[selectedPath];
      if (!file) return current;
      return {
        ...current,
        [selectedPath]: {
          ...file,
          content: file.originalContent,
          isModified: false,
        },
      };
    });
  }

  return (
    <main className="flex h-screen min-h-[520px] flex-col overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <Header
        repositoryName={repositoryName}
        hasModifiedFile={Boolean(selectedFile?.isModified)}
        onSave={handleSave}
        onCommandOpen={() => setCommandOpen(true)}
      />
      <ResizablePanelGroup className="flex-1 flex-row">
        <ResizablePanel defaultSize={20} className="max-[1120px]:min-w-0">
          <FileExplorer
            files={mockRepository}
            selectedPath={selectedPath}
            openFiles={openFiles}
            onFileSelect={handleFileSelect}
          />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={55}>
          <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--editor-bg)]">
            {selectedFile ? (
              <>
                <div className="flex min-h-8 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--border-color)] bg-[var(--tabbar-bg)] px-3 select-none">
                  <Breadcrumb className="min-w-0">
                    <BreadcrumbList>
                      {selectedFile.path.split("/").map((part, index, parts) => (
                        <span key={`${part}-${index}`} className="flex min-w-0 items-center">
                          {index > 0 && <BreadcrumbSeparator />}
                          <BreadcrumbItem>
                            {index === parts.length - 1 ? (
                              <BreadcrumbPage className="flex items-center gap-1.5 text-[var(--foreground)]">
                                <FileIcon name={part} className="size-3.5" />
                                {part}
                              </BreadcrumbPage>
                            ) : (
                              <BreadcrumbLink className="text-[var(--text-muted)] hover:text-[var(--foreground)]">
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
                      <Badge className="gap-1 border-amber-500/30 bg-amber-500/10 px-1.5 py-0 text-[10px] text-amber-500 dark:text-amber-300">
                        <span className="size-1.5 rounded-full bg-amber-400" />
                        Modified
                      </Badge>
                    )}
                    <Badge variant="secondary" className="hidden px-1.5 py-0 text-[10px] sm:inline-flex">
                      {selectedFile.language}
                    </Badge>
                  </div>
                </div>
                <Tabs
                  value={selectedPath ?? ""}
                  onValueChange={setSelectedPath}
                  className="shrink-0 border-b border-[var(--border-color)] bg-[var(--tabbar-bg)]"
                >
                  <TabsList className="w-full justify-start overflow-x-auto">
                    {Object.values(openFiles).map((file) => (
                      <TabsTrigger key={file.path} value={file.path} className="group pr-2">
                        <FileIcon name={file.name} className="size-3.5" />
                        <span className="max-w-[140px] truncate">{file.name}</span>
                        {file.isModified ? (
                          <span className="size-2 rounded-full bg-amber-400 group-hover:hidden" />
                        ) : null}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCloseTab(file.path);
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
                <div className="min-h-0 flex-1">
                  <CodeEditor
                    path={selectedFile.path}
                    value={selectedFile.content}
                    language={selectedFile.language}
                    onChange={handleContentChange}
                  />
                </div>
              </>
            ) : (
              <div className="flex min-h-0 flex-1 items-center justify-center p-8 text-center select-none bg-[var(--editor-bg)]">
                <div>
                  <Skeleton className="mx-auto mb-3 size-10 rounded-[4px] opacity-40" />
                  <p className="text-sm font-medium text-[var(--foreground)]">No file selected</p>
                  <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                    Select a file from the explorer or press <kbd className="rounded-[3px] border border-[var(--border-color)] px-1 py-0.5 text-[10px]">Ctrl+K</kbd> / <kbd className="rounded-[3px] border border-[var(--border-color)] px-1 py-0.5 text-[10px]">Cmd+K</kbd> to search.
                  </p>
                </div>
              </div>
            )}
          </section>
        </ResizablePanel>
        <ResizableHandle className="max-[800px]:hidden" />
        <ResizablePanel defaultSize={25} className="max-[800px]:hidden">
          <ChatPanel />
        </ResizablePanel>
      </ResizablePanelGroup>
      <EditorStatusBar
        fileName={selectedFile?.name ?? null}
        language={selectedFile?.language ?? null}
        isModified={Boolean(selectedFile?.isModified)}
        canDiscard={Boolean(selectedFile?.isModified)}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent className="p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Command menu</DialogTitle>
            <DialogDescription>Quick actions for the editor</DialogDescription>
          </DialogHeader>
          <Command>
            <CommandInput placeholder="Type a command or search files..." aria-label="Search commands" />
            <CommandList>
              <CommandGroup heading="Files">
                {Object.values(mockRepository).map((item) => (
                  <CommandItem
                    key={item.path}
                    onClick={() => {
                      setCommandOpen(false);
                      if (item.type === "file") handleFileSelect(item.path);
                    }}
                  >
                    <FileIcon name={item.name} isFolder={item.type === "folder"} className="mr-2 size-3.5" />
                    <span>{item.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading="Editor Actions">
                <CommandItem onClick={() => { setCommandOpen(false); handleSave(); }}>
                  <Save className="mr-2 size-3.5 text-[#007acc]" />Save current file (Ctrl+S / Cmd+S)
                </CommandItem>
                <CommandItem onClick={() => setCommandOpen(false)}>
                  <Search className="mr-2 size-3.5 text-[var(--text-muted)]" />Find in workspace
                </CommandItem>
              </CommandGroup>
              <CommandGroup heading="Source Control">
                <CommandItem disabled>
                  <Keyboard className="mr-2 size-3.5 opacity-50" />Commit staged changes (Coming soon)
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </main>
  );
}

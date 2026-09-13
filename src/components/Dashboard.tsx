"use client";

import { useEffect, useState } from "react";
import { FileCode2, Keyboard, Save, Search } from "lucide-react";
import ChatPanel from "@/src/components/ChatPanel";
import CodeEditor from "@/src/components/CodeEditor";
import EditorStatusBar from "@/src/components/EditorStatusBar";
import FileExplorer from "@/src/components/FileExplorer";
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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function handleFileSelect(path: string) {
    const file = findFileByPath(mockRepository, path);
    if (!file || file.content === undefined) return;

    setOpenFiles((current) => ({
      ...current,
      [path]: current[path] ?? createOpenFile(path, file.content ?? "", file.name),
    }));
    setSelectedPath(path);
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

  function handleSave() {
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
    <main className="flex h-screen min-h-[520px] flex-col overflow-hidden bg-[#0b0e12] text-slate-200">
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
          <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#0d0f12]">
            {selectedFile ? (
              <>
                <div className="flex min-h-9 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 bg-[#101318] px-3">
                  <Breadcrumb className="min-w-0">
                    <BreadcrumbList>
                      {selectedFile.path.split("/").map((part, index, parts) => (
                        <span key={`${part}-${index}`} className="flex min-w-0 items-center">
                          {index > 0 && <BreadcrumbSeparator />}
                          <BreadcrumbItem>
                            {index === parts.length - 1 ? <BreadcrumbPage>{part}</BreadcrumbPage> : <BreadcrumbLink>{part}</BreadcrumbLink>}
                          </BreadcrumbItem>
                        </span>
                      ))}
                    </BreadcrumbList>
                  </Breadcrumb>
                  <div className="flex items-center gap-2">
                    {selectedFile.isModified && <Badge className="gap-1 bg-amber-400/10 px-1.5 py-0 text-[9px] text-amber-300"><span className="size-1.5 rounded-full bg-amber-300" />Modified</Badge>}
                    <Badge variant="secondary" className="hidden px-1.5 py-0 text-[9px] sm:inline-flex">{selectedFile.language}</Badge>
                  </div>
                </div>
                <Tabs value={selectedPath ?? ""} onValueChange={setSelectedPath} className="shrink-0 border-b border-slate-800/80 bg-[#101318] px-2">
                  <TabsList className="bg-transparent p-0">
                    {Object.values(openFiles).map((file) => (
                      <TabsTrigger key={file.path} value={file.path}>
                        <FileCode2 aria-hidden="true" className="size-3 text-yellow-300/80" />
                        <span>{file.name}</span>
                        {file.isModified && <span className="size-1.5 rounded-full bg-amber-300" />}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
                <div className="min-h-0 flex-1">
                  <CodeEditor
                    value={selectedFile.content}
                    language={selectedFile.language}
                    onChange={handleContentChange}
                  />
                </div>
              </>
            ) : (
              <div className="flex min-h-0 flex-1 items-center justify-center p-8 text-center">
                <div>
                  <Skeleton className="mx-auto mb-3 size-10 rounded-lg" />
                  <p className="text-sm text-slate-400">No file selected</p>
                  <p className="mt-1.5 text-xs text-slate-600">Select a file from the explorer to start editing.</p>
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
            <CommandInput placeholder="Search commands" aria-label="Search commands" />
            <CommandList>
              <CommandGroup heading="Editor">
                <CommandItem onClick={() => { setCommandOpen(false); handleSave(); }}>
                  <Save className="mr-2 size-3.5 text-cyan-300" />Save current file
                </CommandItem>
                <CommandItem onClick={() => setCommandOpen(false)}>
                  <Search className="mr-2 size-3.5 text-slate-400" />Open file search
                </CommandItem>
              </CommandGroup>
              <CommandGroup heading="Coming soon">
                <CommandItem disabled><Keyboard className="mr-2 size-3.5" />Commit changes</CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </main>
  );
}

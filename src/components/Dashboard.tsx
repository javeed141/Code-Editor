"use client";

import { useState } from "react";
import ChatPanel from "@/src/components/ChatPanel";
import CodeEditor from "@/src/components/CodeEditor";
import EditorStatusBar from "@/src/components/EditorStatusBar";
import FileExplorer from "@/src/components/FileExplorer";
import Header from "@/src/components/Header";
import { mockRepository, repositoryName } from "@/src/data/mockRepository";
import { findFileByPath, getLanguageFromPath } from "@/src/lib/utils";
import type { OpenFile } from "@/src/types/editor";

const initialPath = "src/server.js";
const initialFile = findFileByPath(mockRepository, initialPath);

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
  const [openFiles, setOpenFiles] = useState<Record<string, OpenFile>>(() =>
    initialFile?.content !== undefined
      ? { [initialPath]: createOpenFile(initialPath, initialFile.content, initialFile.name) }
      : {},
  );

  const selectedFile = selectedPath ? openFiles[selectedPath] : undefined;
  const hasModifiedFile = Object.values(openFiles).some((file) => file.isModified);

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
    <main className="flex h-screen min-h-[600px] flex-col overflow-hidden bg-[#0d0f12] text-slate-200">
      <Header
        repositoryName={repositoryName}
        hasModifiedFile={Boolean(selectedFile?.isModified)}
        onSave={handleSave}
      />
      <div className="grid min-h-0 flex-1 grid-cols-[220px_minmax(0,1fr)_300px] max-[1050px]:grid-cols-[190px_minmax(0,1fr)_260px] max-[800px]:grid-cols-[190px_minmax(0,1fr)]">
        <FileExplorer
          files={mockRepository}
          selectedPath={selectedPath}
          openFiles={openFiles}
          onFileSelect={handleFileSelect}
        />
        <section className="flex min-h-0 min-w-0 flex-col bg-[#0d0f12]">
          {selectedFile ? (
            <>
              <div className="flex h-12 shrink-0 items-center border-b border-white/[0.06] bg-[#111419] px-4">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="size-2 rounded-full bg-yellow-300" />
                  <span className="truncate text-xs text-slate-300">{selectedFile.name}</span>
                  {selectedFile.isModified && <span className="text-xs text-cyan-300">●</span>}
                  <span className="hidden truncate text-[11px] text-slate-600 sm:inline">
                    {selectedFile.path}
                  </span>
                </div>
              </div>
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
                <p className="text-sm text-slate-400">No file selected</p>
                <p className="mt-2 text-xs text-slate-600">Choose a file from the explorer to start editing.</p>
              </div>
            </div>
          )}
        </section>
        <ChatPanel />
      </div>
      <EditorStatusBar
        fileName={selectedFile?.name ?? null}
        language={selectedFile?.language ?? null}
        isModified={Boolean(selectedFile?.isModified)}
        canDiscard={Boolean(selectedFile?.isModified)}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </main>
  );
}

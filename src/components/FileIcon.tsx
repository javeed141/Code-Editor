import React from "react";
import {
  Folder,
  FolderOpen,
  FileCode2,
  FileJson2,
  FileText,
  FileSpreadsheet,
  File,
  Code2,
  GitBranch,
  Settings,
  Image as ImageIcon,
  Terminal,
  FileCheck,
} from "lucide-react";

type FileIconProps = {
  name: string;
  isFolder?: boolean;
  isOpen?: boolean;
  className?: string;
};

export default function FileIcon({
  name,
  isFolder = false,
  isOpen = false,
  className = "size-3.5 shrink-0",
}: FileIconProps) {
  if (isFolder) {
    if (isOpen) {
      return (
        <FolderOpen
          aria-hidden="true"
          className={className}
          style={{ color: "#dcb67a" }}
        />
      );
    }
    return (
      <Folder
        aria-hidden="true"
        className={className}
        style={{ color: "#dcb67a" }}
      />
    );
  }

  const lowerName = name.toLowerCase();

  // Special full filenames
  if (lowerName === "package.json" || lowerName === "package-lock.json") {
    return (
      <span
        aria-hidden="true"
        className={`inline-flex items-center justify-center font-bold text-[9px] rounded-xs font-mono leading-none ${className}`}
        style={{ color: "#cb3837" }}
      >
        <FileCode2 className={className} style={{ color: "#cb3837" }} />
      </span>
    );
  }

  if (lowerName === "tsconfig.json") {
    return (
      <FileCode2
        aria-hidden="true"
        className={className}
        style={{ color: "#3178c6" }}
      />
    );
  }

  if (lowerName.startsWith(".git")) {
    return (
      <GitBranch
        aria-hidden="true"
        className={className}
        style={{ color: "#f05032" }}
      />
    );
  }

  if (lowerName.startsWith(".env")) {
    return (
      <Settings
        aria-hidden="true"
        className={className}
        style={{ color: "#ecd53f" }}
      />
    );
  }

  // Extensions
  const ext = lowerName.split(".").pop() ?? "";

  switch (ext) {
    case "tsx":
      return (
        <Code2
          aria-hidden="true"
          className={className}
          style={{ color: "#00d8ff" }}
        />
      );
    case "ts":
      return (
        <span
          aria-hidden="true"
          className={`inline-flex items-center justify-center font-bold text-[8.5px] rounded-[2px] leading-none bg-[#3178c6] text-white px-0.5 py-[1px] ${className}`}
          style={{ minWidth: "14px", height: "14px" }}
        >
          TS
        </span>
      );
    case "jsx":
      return (
        <Code2
          aria-hidden="true"
          className={className}
          style={{ color: "#61dafb" }}
        />
      );
    case "js":
    case "mjs":
    case "cjs":
      return (
        <span
          aria-hidden="true"
          className={`inline-flex items-center justify-center font-bold text-[8.5px] rounded-[2px] leading-none bg-[#f7df1e] text-black px-0.5 py-[1px] ${className}`}
          style={{ minWidth: "14px", height: "14px" }}
        >
          JS
        </span>
      );
    case "json":
      return (
        <FileJson2
          aria-hidden="true"
          className={className}
          style={{ color: "#cbcb41" }}
        />
      );
    case "css":
    case "scss":
    case "sass":
    case "less":
      return (
        <FileCode2
          aria-hidden="true"
          className={className}
          style={{ color: "#42a5f5" }}
        />
      );
    case "html":
    case "htm":
      return (
        <FileCode2
          aria-hidden="true"
          className={className}
          style={{ color: "#e44d26" }}
        />
      );
    case "md":
    case "markdown":
      return (
        <FileText
          aria-hidden="true"
          className={className}
          style={{ color: "#42a5f5" }}
        />
      );
    case "py":
      return (
        <FileCode2
          aria-hidden="true"
          className={className}
          style={{ color: "#3776ab" }}
        />
      );
    case "svg":
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "ico":
      return (
        <ImageIcon
          aria-hidden="true"
          className={className}
          style={{ color: "#26a69a" }}
        />
      );
    case "sh":
    case "bash":
    case "zsh":
      return (
        <Terminal
          aria-hidden="true"
          className={className}
          style={{ color: "#4caf50" }}
        />
      );
    case "yml":
    case "yaml":
      return (
        <FileSpreadsheet
          aria-hidden="true"
          className={className}
          style={{ color: "#cb171e" }}
        />
      );
    case "lock":
      return (
        <FileCheck
          aria-hidden="true"
          className={className}
          style={{ color: "#858585" }}
        />
      );
    default:
      return (
        <File
          aria-hidden="true"
          className={className}
          style={{ color: "#858585" }}
        />
      );
  }
}


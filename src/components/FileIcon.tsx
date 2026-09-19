import React from "react";

function VscodeIcon({
  icon,
  className,
  color,
}: {
  icon: string;
  className: string;
  color: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        backgroundColor: color,
        maskImage: `url("/vscode-icons/${icon}.svg")`,
        maskPosition: "center",
        maskRepeat: "no-repeat",
        maskSize: "contain",
        WebkitMaskImage: `url("/vscode-icons/${icon}.svg")`,
        WebkitMaskPosition: "center",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
      }}
    />
  );
}

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
    return (
      <VscodeIcon
        icon={isOpen ? "folder-open" : "folder"}
        className={className}
        color="#dcb67a"
      />
    );
  }

  const lowerName = name.toLowerCase();

  // Special full filenames
  if (lowerName === "package.json" || lowerName === "package-lock.json") {
    return (
      <VscodeIcon icon="npm" className={className} color="#cb3837" />
    );
  }

  if (lowerName === "tsconfig.json") {
    return (
      <VscodeIcon
        icon="tsconfig"
        className={className}
        color="#3178c6"
      />
    );
  }

  if (lowerName.startsWith(".git")) {
    return (
      <VscodeIcon
        icon="git"
        className={className}
        color="#f05032"
      />
    );
  }

  if (lowerName.startsWith(".env")) {
    return (
      <VscodeIcon
        icon="settings"
        className={className}
        color="#ecd53f"
      />
    );
  }

  // Extensions
  const ext = lowerName.split(".").pop() ?? "";

  switch (ext) {
    case "java":
      return <VscodeIcon icon="java" className={className} color="#f89820" />;
    case "go":
      return <VscodeIcon icon="go2" className={className} color="#00add8" />;
    case "rs":
      return <VscodeIcon icon="rust" className={className} color="#dea584" />;
    case "rb":
      return <VscodeIcon icon="ruby" className={className} color="#cc342d" />;
    case "php":
      return <VscodeIcon icon="php" className={className} color="#777bb4" />;
    case "kt":
    case "kts":
      return <VscodeIcon icon="kotlin" className={className} color="#7f52ff" />;
    case "swift":
      return <VscodeIcon icon="swift" className={className} color="#f05138" />;
    case "c":
    case "h":
    case "cpp":
    case "cc":
    case "cxx":
      return <VscodeIcon icon="file" className={className} color="#659ad2" />;
    case "tsx":
      return <VscodeIcon icon="react" className={className} color="#00d8ff" />;
    case "ts":
      return <VscodeIcon icon="typescript" className={className} color="#3178c6" />;
    case "jsx":
      return <VscodeIcon icon="react" className={className} color="#61dafb" />;
    case "js":
    case "mjs":
    case "cjs":
      return <VscodeIcon icon="javascript" className={className} color="#f7df1e" />;
    case "json":
      return <VscodeIcon icon="json" className={className} color="#cbcb41" />;
    case "css":
    case "scss":
    case "sass":
    case "less":
      return <VscodeIcon icon="sass" className={className} color="#42a5f5" />;
    case "html":
    case "htm":
      return <VscodeIcon icon="html" className={className} color="#e44d26" />;
    case "md":
    case "markdown":
      return <VscodeIcon icon="markdown" className={className} color="#42a5f5" />;
    case "py":
      return <VscodeIcon icon="python" className={className} color="#3776ab" />;
    case "svg":
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "ico":
      return <VscodeIcon icon="image" className={className} color="#26a69a" />;
    case "sh":
    case "bash":
    case "zsh":
      return <VscodeIcon icon="shell" className={className} color="#4caf50" />;
    case "yml":
    case "yaml":
      return <VscodeIcon icon="file" className={className} color="#cb171e" />;
    case "lock":
      return <VscodeIcon icon="file" className={className} color="#858585" />;
    default:
      return <VscodeIcon icon="file" className={className} color="#858585" />;
  }
}

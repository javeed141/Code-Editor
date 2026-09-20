import { useEffect, useState } from "react";
import { Check, CircleAlert, RotateCcw, Save } from "lucide-react";
import { Tooltip } from "@/src/components/ui/tooltip";

type EditorStatusBarProps = {
  fileName: string | null;
  language: string | null;
  isModified: boolean;
  canDiscard: boolean;
  onSave: () => void;
  onDiscard: () => void;
  indexedDbStatus?: "idle" | "saving" | "saved" | "error";
};

export default function EditorStatusBar({
  fileName,
  language,
  isModified,
  canDiscard,
  onSave,
  onDiscard,
  indexedDbStatus = "idle",
}: EditorStatusBarProps) {
  const [appUrl, setAppUrl] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("ai-code-editor-app-url") || window.location.origin;
      setAppUrl(stored);
    }
  }, []);
  return (
    <footer className="flex h-6 shrink-0 items-center justify-between gap-3 border-t border-[var(--border-color)] bg-[var(--statusbar-bg)] px-2 text-[11px] text-[var(--statusbar-fg)] select-none">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex items-center gap-1">
          {isModified ? (
            <span className="flex items-center gap-1 font-medium text-amber-200">
              <CircleAlert aria-hidden="true" className="size-3 text-amber-200" />
              <span className="hidden sm:inline">Unsaved changes</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 opacity-90">
              <Check aria-hidden="true" className="size-3" />
              <span className="hidden sm:inline">Saved</span>
            </span>
          )}
        </div>

        {fileName && (
          <>
            <span className="opacity-40">|</span>
            <span className="truncate opacity-90">{fileName}</span>
          </>
        )}

        {language && (
          <>
            <span className="hidden opacity-40 sm:inline">|</span>
            <span className="hidden uppercase tracking-wider opacity-90 sm:inline">
              {language}
            </span>
          </>
        )}
        {indexedDbStatus !== "idle" && (
          <span className="hidden opacity-75 md:inline" title="Local IndexedDB persistence status">
            {indexedDbStatus === "saving" ? "Saving locally…" : indexedDbStatus === "saved" ? "Saved locally" : "Local save failed"}
          </span>
        )}

        <Tooltip label="Encoding: UTF-8">
          <span className="hidden opacity-75 md:inline">UTF-8</span>
        </Tooltip>
        <span className="hidden opacity-75 md:inline">Spaces: 2</span>
        {appUrl && (
          <>
            <span className="hidden opacity-40 lg:inline">|</span>
            <span className="hidden opacity-75 lg:inline font-mono" title={`Active App URL: ${appUrl}`}>
              🌐 {appUrl}
            </span>
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Tooltip label="Save changes">
          <button
            type="button"
            onClick={onSave}
            disabled={!isModified}
            aria-label="Save changes"
            className="flex h-5 items-center gap-1 rounded-[2px] px-1.5 transition-colors hover:bg-white/20 disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
          >
            <Save aria-hidden="true" className="size-3" />
            <span className="hidden sm:inline">Save</span>
          </button>
        </Tooltip>
        <Tooltip label="Discard changes">
          <button
            type="button"
            onClick={onDiscard}
            disabled={!canDiscard}
            aria-label="Discard changes"
            className="flex h-5 items-center gap-1 rounded-[2px] px-1.5 transition-colors hover:bg-white/20 disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
          >
            <RotateCcw aria-hidden="true" className="size-3" />
            <span className="hidden sm:inline">Discard</span>
          </button>
        </Tooltip>
      </div>
    </footer>
  );
}

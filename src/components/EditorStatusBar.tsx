type EditorStatusBarProps = {
  fileName: string | null;
  language: string | null;
  isModified: boolean;
  canDiscard: boolean;
  onSave: () => void;
  onDiscard: () => void;
};

export default function EditorStatusBar({
  fileName,
  language,
  isModified,
  canDiscard,
  onSave,
  onDiscard,
}: EditorStatusBarProps) {
  return (
    <footer className="flex min-h-11 shrink-0 items-center justify-between gap-3 border-t border-white/[0.08] bg-[#101318] px-4 text-[11px]">
      <div className="flex min-w-0 items-center gap-4 text-slate-500">
        <span className="flex items-center gap-1.5 text-slate-400">
          <span className={`size-1.5 rounded-full ${isModified ? "bg-amber-300" : "bg-emerald-400"}`} />
          {isModified ? "Unsaved changes" : "Saved"}
        </span>
        {fileName && <span className="truncate text-slate-600">{fileName}</span>}
        {language && <span className="hidden text-slate-600 sm:inline">{language}</span>}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onSave}
          disabled={!isModified}
          className="rounded px-2 py-1 text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-35"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onDiscard}
          disabled={!canDiscard}
          className="rounded px-2 py-1 text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-35"
        >
          Discard
        </button>
      </div>
    </footer>
  );
}

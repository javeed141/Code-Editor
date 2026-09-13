type HeaderProps = {
  repositoryName: string;
  hasModifiedFile: boolean;
  onSave: () => void;
};

export default function Header({
  repositoryName,
  hasModifiedFile,
  onSave,
}: HeaderProps) {
  return (
    <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#101318] px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
          <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none">
            <path d="m8 9-3 3 3 3M16 9l3 3-3 3M14 6l-4 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold tracking-wide text-slate-100">
            AI Code Editor
          </h1>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            Local workspace
          </p>
        </div>
        <span className="mx-1 h-5 w-px bg-white/10" />
        <div className="flex min-w-0 items-center gap-2 text-sm text-slate-300">
          <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.65)]" />
          <span className="truncate">{repositoryName}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={!hasModifiedFile}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-slate-200 transition hover:border-cyan-400/40 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24" fill="none">
            <path d="M5 4h12l2 2v14H5V4Z M8 4v5h8V4M8 20v-7h8v7" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
          Save
        </button>
        <button
          type="button"
          disabled
          title="Git integration is not available in Day 1"
          className="inline-flex h-9 items-center gap-2 rounded-md bg-cyan-400 px-3 text-xs font-semibold text-slate-950 opacity-45"
        >
          <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24" fill="none">
            <path d="M8 12h8M12 8v8M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
          Commit
        </button>
      </div>
    </header>
  );
}

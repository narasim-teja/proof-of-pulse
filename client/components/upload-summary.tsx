"use client";

interface UploadSummaryProps {
  date: string;
  userId: string;
  useFilePath: boolean;
  onReset: () => void;
}

export function UploadSummary({
  date,
  userId,
  useFilePath,
  onReset,
}: UploadSummaryProps) {
  return (
    <div className="max-w-4xl mx-auto px-6 sm:px-10 py-4">
      <div className="flex items-center gap-3 flex-wrap font-mono text-sm">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-neutral-500 text-xs uppercase tracking-wider">
            data loaded
          </span>
        </span>
        <span className="text-neutral-700">|</span>
        <span className="text-neutral-400">{date}</span>
        <span className="text-neutral-700">&middot;</span>
        <span className="text-neutral-400 truncate max-w-[200px]">
          {userId}
        </span>
        <span className="text-neutral-700">&middot;</span>
        <span className="text-neutral-500">
          {useFilePath ? "Demo Data" : "Uploaded XML"}
        </span>
        <button
          onClick={onReset}
          className="ml-auto text-xs text-neutral-600 hover:text-neutral-300 transition-colors border border-neutral-800 px-3 py-1 rounded-full"
        >
          Change
        </button>
      </div>
    </div>
  );
}

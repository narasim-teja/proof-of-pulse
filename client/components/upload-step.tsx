"use client";

import { Upload, FileText, Wallet, Watch } from "lucide-react";

interface UploadStepProps {
  date: string;
  userId: string;
  useFilePath: boolean;
  loading: boolean;
  error: string | null;
  walletConnected: boolean;
  onDateChange: (date: string) => void;
  onUserIdChange: (id: string) => void;
  onToggleFilePath: (use: boolean) => void;
  onFileRead: (content: string) => void;
  onAnalyze: () => void;
  onConnectWallet: () => void;
}

export function UploadStep({
  date,
  userId,
  useFilePath,
  loading,
  error,
  walletConnected,
  onDateChange,
  onUserIdChange,
  onToggleFilePath,
  onFileRead,
  onAnalyze,
  onConnectWallet,
}: UploadStepProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onFileRead(reader.result as string);
    };
    reader.readAsText(file);
  };

  return (
    <section className="px-6 sm:px-10 py-16 sm:py-20">
      <div className="max-w-4xl mx-auto">
        <div className="section-label mb-4">Upload</div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Form */}
          <div className="space-y-6">
            <h2 className="font-mono text-xl sm:text-2xl font-bold tracking-tight">
              GENERATE YOUR PROOF.
            </h2>

            {/* Data source toggle */}
            <div className="space-y-3">
              <label className="font-mono text-xs text-neutral-500 uppercase tracking-wider">
                Data Source
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onToggleFilePath(true)}
                  className={`font-mono text-xs px-4 py-2 rounded-full flex items-center gap-2 transition-colors ${
                    useFilePath
                      ? "bg-white text-black"
                      : "border border-neutral-700 text-neutral-400 hover:border-neutral-500"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Demo Data
                </button>
                <button
                  onClick={() => onToggleFilePath(false)}
                  className={`font-mono text-xs px-4 py-2 rounded-full flex items-center gap-2 transition-colors ${
                    !useFilePath
                      ? "bg-white text-black"
                      : "border border-neutral-700 text-neutral-400 hover:border-neutral-500"
                  }`}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload XML
                </button>
                <button
                  disabled
                  className="font-mono text-xs px-4 py-2 rounded-full border border-neutral-800 text-neutral-600 flex items-center gap-2 cursor-not-allowed relative"
                >
                  <Watch className="h-3.5 w-3.5" />
                  Apple Watch
                  <span className="font-mono text-[9px] bg-neutral-800 text-neutral-500 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                    Soon
                  </span>
                </button>
              </div>
              {useFilePath && (
                <p className="font-mono text-xs text-neutral-600">
                  Using server-side data/export.xml
                </p>
              )}
            </div>

            {/* Apple Watch coming soon note */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg px-4 py-3">
              <p className="font-mono text-xs text-neutral-600 leading-relaxed">
                <span className="text-neutral-400">Apple Watch app</span> — auto-sync
                workout data directly from your wrist. Grant permission once
                and your heart rate data flows automatically. No manual exports.
              </p>
            </div>

            {/* File upload */}
            {!useFilePath && (
              <div className="space-y-2">
                <label className="font-mono text-xs text-neutral-500 uppercase tracking-wider">
                  Apple Health Export
                </label>
                <input
                  type="file"
                  accept=".xml"
                  onChange={handleFileChange}
                  className="block w-full font-mono text-xs text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border file:border-neutral-700 file:text-xs file:font-mono file:bg-transparent file:text-neutral-300 hover:file:border-neutral-500 cursor-pointer"
                />
              </div>
            )}

            {/* Date */}
            <div className="space-y-2">
              <label className="font-mono text-xs text-neutral-500 uppercase tracking-wider">
                Workout Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => onDateChange(e.target.value)}
                className="block w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 font-mono text-sm text-neutral-300 focus:outline-none focus:border-neutral-600 transition-colors"
              />
            </div>

            {/* User ID */}
            <div className="space-y-2">
              <label className="font-mono text-xs text-neutral-500 uppercase tracking-wider">
                NEAR Account
              </label>
              {walletConnected ? (
                <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="font-mono text-sm text-neutral-300 truncate">
                    {userId}
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => onUserIdChange(e.target.value)}
                    placeholder="your-account.testnet"
                    className="block w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 font-mono text-sm text-neutral-300 placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 transition-colors"
                  />
                  <button
                    onClick={onConnectWallet}
                    className="w-full font-mono text-xs text-neutral-400 border border-neutral-800 px-4 py-2 rounded-full hover:border-neutral-600 hover:text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <Wallet className="h-3.5 w-3.5" />
                    Connect Wallet Instead
                  </button>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <p className="font-mono text-xs text-red-400">{error}</p>
            )}

            {/* Submit */}
            <button
              onClick={onAnalyze}
              disabled={loading}
              className="w-full font-mono text-sm bg-white text-black px-6 py-3 rounded-full hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Analyzing heart rate data..." : "Generate Proof"}
            </button>
          </div>

          {/* Info panel */}
          <div className="hidden lg:block">
            <div className="section-label mb-4">What Happens</div>
            <div className="space-y-6">
              <InfoItem
                num="01"
                title="Parse"
                desc="Heart rate samples are extracted from your Apple Health export — or streamed directly from the Apple Watch app."
              />
              <InfoItem
                num="02"
                title="Detect"
                desc="The engine checks for fraud: flat data, erratic swings, missing warmup patterns."
              />
              <InfoItem
                num="03"
                title="Score"
                desc="A confidence score (0-100) is computed from duration, variability, sampling density, and HR range."
              />
              <InfoItem
                num="04"
                title="Prove"
                desc="The attestation is signed and submitted to the NEAR blockchain. Raw data stays encrypted in NOVA."
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function InfoItem({
  num,
  title,
  desc,
}: {
  num: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-4">
      <span className="font-mono text-xs text-neutral-700 pt-0.5">{num}</span>
      <div>
        <h4 className="font-mono text-sm font-semibold text-neutral-300 mb-1">
          {title}
        </h4>
        <p className="text-xs text-neutral-600 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

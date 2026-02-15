"use client";

import dynamic from "next/dynamic";
import { Zap, Fingerprint, Shield } from "lucide-react";
import { ConfidenceRing } from "@/components/confidence-ring";
import { ZoneDistribution } from "@/components/zone-distribution";
import type { AnalyzeResponse } from "@/lib/types";

const HRTimelineChart = dynamic(
  () =>
    import("@/components/hr-timeline-chart").then((m) => ({
      default: m.HRTimelineChart,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] animate-pulse bg-neutral-900 rounded-lg" />
    ),
  }
);

interface AnalysisStepProps {
  data: AnalyzeResponse;
  loading: boolean;
  error: string | null;
  onSubmitToNear: () => void;
  onRequestAsync: () => void;
  onBack: () => void;
  walletConnected: boolean;
  asyncLoading: boolean;
}

const activityLabel: Record<string, string> = {
  high_intensity_cardio: "High Intensity Cardio",
  moderate_cardio: "Moderate Cardio",
  light_activity: "Light Activity",
  unknown: "Unknown",
};

function getConfidenceInterpretation(score: number): {
  label: string;
  color: string;
} {
  if (score >= 90)
    return {
      label: "excellent \u2014 highly authentic biometric patterns",
      color: "text-emerald-500",
    };
  if (score >= 80)
    return {
      label: "good \u2014 natural patterns with minor anomalies",
      color: "text-emerald-500",
    };
  if (score >= 60)
    return {
      label: "fair \u2014 data may need further verification",
      color: "text-amber-500",
    };
  return {
    label: "low \u2014 significant anomalies detected",
    color: "text-red-400",
  };
}

export function AnalysisStep({
  data,
  loading,
  error,
  onSubmitToNear,
  onRequestAsync,
  onBack,
  walletConnected,
  asyncLoading,
}: AnalysisStepProps) {
  const { attestation, session_info, hr_timeline } = data;
  const a = attestation;
  const interpretation = getConfidenceInterpretation(a.confidence);

  return (
    <section className="px-6 sm:px-10 py-16 sm:py-20">
      <div className="max-w-4xl mx-auto">
        <div className="section-label mb-4">Analysis Results</div>

        {/* Stats row — big numbers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-neutral-800 rounded-lg overflow-hidden mb-8">
          <div className="bg-neutral-900/80 px-5 py-5">
            <div className="font-mono text-2xl sm:text-3xl font-bold text-white mb-2">
              {a.duration_mins} <span className="text-lg text-neutral-500">min</span>
            </div>
            <div className="font-mono text-xs text-neutral-400">Duration</div>
            <div className="text-xs text-neutral-600">workout</div>
          </div>
          <div className="bg-neutral-900/80 px-5 py-5">
            <div className="font-mono text-2xl sm:text-3xl font-bold text-white mb-2">
              {a.avg_hr}
            </div>
            <div className="font-mono text-xs text-neutral-400">Avg HR</div>
            <div className="text-xs text-neutral-600">beats per min</div>
          </div>
          <div className="bg-neutral-900/80 px-5 py-5">
            <div className="font-mono text-2xl sm:text-3xl font-bold text-white mb-2">
              {a.max_hr}
            </div>
            <div className="font-mono text-xs text-neutral-400">Peak HR</div>
            <div className="text-xs text-neutral-600">max recorded</div>
          </div>
          <div className="bg-neutral-900/80 px-5 py-5">
            <div
              className={`font-mono text-2xl sm:text-3xl font-bold mb-2 ${
                a.confidence >= 80
                  ? "text-emerald-400"
                  : a.confidence >= 60
                    ? "text-amber-400"
                    : "text-red-400"
              }`}
            >
              {a.confidence}
              <span className="text-lg text-neutral-500">/100</span>
            </div>
            <div className="font-mono text-xs text-neutral-400">Confidence</div>
            <div className="text-xs text-neutral-600">authenticity</div>
          </div>
        </div>

        {/* Activity type */}
        <div className="flex items-center gap-3 mb-8">
          <span className="font-mono text-xs text-neutral-500 uppercase tracking-wider">
            Activity
          </span>
          <span className="font-mono text-xs text-neutral-300 border border-neutral-800 px-3 py-1 rounded">
            {activityLabel[a.activity_type] || a.activity_type}
          </span>
          <span className="font-mono text-xs text-neutral-600">
            {session_info.sample_count} samples &middot;{" "}
            {new Date(session_info.start).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            &ndash;{" "}
            {new Date(session_info.end).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* HR Timeline Chart */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 sm:p-6 mb-8">
          <div className="font-mono text-xs text-neutral-500 uppercase tracking-wider mb-4">
            Heart Rate Timeline
          </div>
          <HRTimelineChart data={hr_timeline} avgHr={a.avg_hr} />
        </div>

        {/* Confidence + Zones */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {/* Confidence & Pattern Analysis */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
            <div className="font-mono text-xs text-neutral-500 uppercase tracking-wider mb-4">
              Authenticity Score
            </div>
            <div className="flex flex-col items-center gap-4 mb-4">
              <ConfidenceRing score={a.confidence} />
              <div className={`font-mono text-xs ${interpretation.color}`}>
                <span className="text-neutral-600 mr-1">&bull;</span>
                {interpretation.label}
              </div>
            </div>
            <div className="space-y-2 font-mono text-xs">
              <PatternRow
                label="Natural Pattern"
                ok={a.analysis.is_natural_pattern}
              />
              <PatternRow label="Warmup Detected" ok={a.analysis.has_warmup} />
              <PatternRow
                label="Cooldown Detected"
                ok={a.analysis.has_cooldown}
              />
              <div className="flex justify-between text-neutral-500">
                <span>Variability</span>
                <span>{a.analysis.variability_score}/100</span>
              </div>
              <div className="flex justify-between text-neutral-500">
                <span>Sampling Density</span>
                <span>{a.analysis.sampling_density}/min</span>
              </div>
            </div>
          </div>

          {/* Zone Distribution */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
            <div className="font-mono text-xs text-neutral-500 uppercase tracking-wider mb-4">
              HR Zone Distribution
            </div>
            <ZoneDistribution zones={a.hr_zone_distribution} />
          </div>
        </div>

        {/* Data Hash */}
        <div className="flex items-center gap-3 mb-8 font-mono text-xs text-neutral-600">
          <Fingerprint className="h-3.5 w-3.5" />
          <span className="text-neutral-500">SHA-256</span>
          <span className="truncate max-w-[300px]">{a.data_hash}</span>
        </div>

        {/* Error */}
        {error && (
          <p className="font-mono text-xs text-red-400 mb-4">{error}</p>
        )}

        {/* Actions */}
        <div className="font-mono text-xs text-neutral-500 uppercase tracking-wider mb-4">
          Submit Proof
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Submit to NEAR — direct */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-neutral-300 font-mono text-xs font-semibold">
              <Shield className="h-3.5 w-3.5" />
              Direct Attestation
            </div>
            <p className="font-mono text-xs text-neutral-600 leading-relaxed flex-1">
              The TEE oracle analyzes your data, encrypts it into NOVA, and
              submits the proof directly to the NEAR contract.
            </p>
            <button
              onClick={onSubmitToNear}
              disabled={loading || asyncLoading}
              className="w-full font-mono text-sm bg-white text-black px-5 py-2.5 rounded-full hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Submitting..." : "Submit to NEAR"}
            </button>
          </div>

          {/* Async Attestation — yield/resume */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-neutral-300 font-mono text-xs font-semibold">
              <Zap className="h-3.5 w-3.5" />
              Async Attestation
            </div>
            <p className="font-mono text-xs text-neutral-600 leading-relaxed flex-1">
              Your wallet submits a request on-chain using NEAR&apos;s yield/resume.
              The oracle picks it up and fulfills it asynchronously.
              {!walletConnected && (
                <span className="text-amber-500 block mt-1">
                  Requires wallet connection.
                </span>
              )}
            </p>
            <button
              onClick={onRequestAsync}
              disabled={loading || asyncLoading || !walletConnected}
              className="w-full font-mono text-xs text-neutral-400 border border-neutral-800 px-5 py-2.5 rounded-full hover:border-neutral-600 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {asyncLoading ? (
                "Requesting..."
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5" />
                  Request Async
                </>
              )}
            </button>
          </div>
        </div>

        <button
          onClick={onBack}
          className="font-mono text-xs text-neutral-400 border border-neutral-800 px-5 py-2.5 rounded-full hover:border-neutral-600 hover:text-white transition-colors"
        >
          Back
        </button>
      </div>
    </section>
  );
}

function PatternRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex justify-between items-center text-neutral-500">
      <span>{label}</span>
      <span
        className={`flex items-center gap-1.5 ${ok ? "text-emerald-500" : "text-neutral-700"}`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-neutral-700"}`}
        />
        {ok ? "yes" : "no"}
      </span>
    </div>
  );
}

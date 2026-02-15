"use client";

import dynamic from "next/dynamic";
import {
  Activity,
  Clock,
  Heart,
  TrendingUp,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ConfidenceRing } from "@/components/confidence-ring";
import { ZoneDistribution } from "@/components/zone-distribution";
import type { AnalyzeResponse } from "@/lib/types";

const HRTimelineChart = dynamic(
  () =>
    import("@/components/hr-timeline-chart").then((m) => ({
      default: m.HRTimelineChart,
    })),
  { ssr: false, loading: () => <div className="h-[300px] animate-pulse bg-muted rounded-lg" /> }
);

interface AnalysisStepProps {
  data: AnalyzeResponse;
  loading: boolean;
  error: string | null;
  onSubmitToNear: () => void;
  onBack: () => void;
}

const activityLabel: Record<string, string> = {
  high_intensity_cardio: "High Intensity Cardio",
  moderate_cardio: "Moderate Cardio",
  light_activity: "Light Activity",
  unknown: "Unknown",
};

export function AnalysisStep({
  data,
  loading,
  error,
  onSubmitToNear,
  onBack,
}: AnalysisStepProps) {
  const { attestation, session_info, hr_timeline } = data;
  const a = attestation;

  return (
    <div className="max-w-3xl mx-auto px-4 space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <Activity className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
            <p className="text-xs text-muted-foreground">Activity</p>
            <Badge variant="secondary" className="mt-1 text-xs">
              {activityLabel[a.activity_type] || a.activity_type}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <Clock className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <p className="text-xs text-muted-foreground">Duration</p>
            <p className="text-lg font-bold">{a.duration_mins} min</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <Heart className="h-5 w-5 mx-auto mb-1 text-red-500" />
            <p className="text-xs text-muted-foreground">Avg HR</p>
            <p className="text-lg font-bold">{a.avg_hr} bpm</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-orange-500" />
            <p className="text-xs text-muted-foreground">Max HR</p>
            <p className="text-lg font-bold">{a.max_hr} bpm</p>
          </CardContent>
        </Card>
      </div>

      {/* HR Timeline Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Heart Rate Timeline</CardTitle>
          <p className="text-xs text-muted-foreground">
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
          </p>
        </CardHeader>
        <CardContent>
          <HRTimelineChart data={hr_timeline} avgHr={a.avg_hr} />
        </CardContent>
      </Card>

      {/* Confidence + Pattern Analysis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Authenticity Score</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <ConfidenceRing score={a.confidence} />
            <div className="space-y-2 w-full text-sm">
              <PatternRow
                label="Natural Pattern"
                ok={a.analysis.is_natural_pattern}
              />
              <PatternRow label="Warmup Detected" ok={a.analysis.has_warmup} />
              <PatternRow
                label="Cooldown Detected"
                ok={a.analysis.has_cooldown}
              />
              <div className="flex justify-between text-muted-foreground">
                <span>Variability</span>
                <span className="font-mono">{a.analysis.variability_score}/100</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Sampling Density</span>
                <span className="font-mono">{a.analysis.sampling_density}/min</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">HR Zone Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ZoneDistribution zones={a.hr_zone_distribution} />
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive font-medium text-center">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-center">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[200px]"
          size="lg"
          onClick={onSubmitToNear}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent inline-block" />
              Submitting to NEAR...
            </>
          ) : (
            "Submit to NEAR"
          )}
        </Button>
      </div>
    </div>
  );
}

function PatternRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      ) : (
        <XCircle className="h-4 w-4 text-muted-foreground/40" />
      )}
    </div>
  );
}

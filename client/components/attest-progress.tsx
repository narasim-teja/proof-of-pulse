"use client";

export type AttestPhase = "idle" | "analyzing" | "storing" | "submitting" | "done";

interface AttestProgressProps {
  phase: AttestPhase;
}

const phases = [
  { key: "analyzing", label: "analyzing biometric data" },
  { key: "storing", label: "encrypting \u2192 NOVA vault" },
  { key: "submitting", label: "submitting proof to NEAR" },
] as const;

const phaseOrder = ["analyzing", "storing", "submitting", "done"] as const;

function getStatus(
  currentPhase: AttestPhase,
  stepKey: string
): "done" | "active" | "pending" {
  const currentIdx = phaseOrder.indexOf(currentPhase as (typeof phaseOrder)[number]);
  const stepIdx = phaseOrder.indexOf(stepKey as (typeof phaseOrder)[number]);

  if (currentPhase === "done") return "done";
  if (stepIdx < currentIdx) return "done";
  if (stepIdx === currentIdx) return "active";
  return "pending";
}

export function AttestProgress({ phase }: AttestProgressProps) {
  if (phase === "idle") return null;

  return (
    <div className="max-w-4xl mx-auto px-6 sm:px-10 py-8">
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden font-mono text-sm">
        {/* Terminal header */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-neutral-800">
          <span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
          <span className="text-xs text-neutral-600 ml-2">
            attestation-pipeline
          </span>
        </div>

        {/* Terminal body */}
        <div className="px-4 py-4 space-y-2">
          {phases.map((step) => {
            const status = getStatus(phase, step.key);
            return (
              <div key={step.key} className="flex items-center gap-3">
                <span className="text-neutral-600 select-none">$</span>
                <span
                  className={
                    status === "active"
                      ? "text-white"
                      : status === "done"
                        ? "text-neutral-500"
                        : "text-neutral-700"
                  }
                >
                  {step.label}
                  {status === "active" && (
                    <span className="animate-terminal-blink ml-0.5">_</span>
                  )}
                </span>
                <span className="ml-auto">
                  {status === "done" && (
                    <span className="flex items-center gap-1.5 text-emerald-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      done
                    </span>
                  )}
                  {status === "active" && (
                    <span className="text-amber-500">running</span>
                  )}
                  {status === "pending" && (
                    <span className="text-neutral-700">pending</span>
                  )}
                </span>
              </div>
            );
          })}

          {phase === "done" && (
            <div className="flex items-center gap-3 pt-1 text-emerald-500">
              <span className="text-neutral-600 select-none">$</span>
              <span>attestation complete</span>
              <span className="ml-auto flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                success
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

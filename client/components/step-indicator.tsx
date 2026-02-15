"use client";

import type { Step } from "@/hooks/use-attestation-flow";
import { Upload, BarChart3, Shield, Lock } from "lucide-react";

const steps: { key: Step; label: string; icon: typeof Upload }[] = [
  { key: "upload", label: "Upload", icon: Upload },
  { key: "analysis", label: "Analysis", icon: BarChart3 },
  { key: "attestation", label: "Attestation", icon: Shield },
  { key: "vault", label: "Vault", icon: Lock },
];

const stepOrder: Step[] = ["upload", "analysis", "attestation", "vault"];

export function StepIndicator({ currentStep }: { currentStep: Step }) {
  const currentIndex = stepOrder.indexOf(currentStep);

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 py-6">
      {steps.map((s, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = i === currentIndex;
        const Icon = s.icon;

        return (
          <div key={s.key} className="flex items-center gap-2 sm:gap-4">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                  isCurrent
                    ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                    : isCompleted
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-muted-foreground/30 text-muted-foreground/50"
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span
                className={`text-xs font-medium ${
                  isCurrent
                    ? "text-emerald-400"
                    : isCompleted
                      ? "text-emerald-500"
                      : "text-muted-foreground/50"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`hidden sm:block h-0.5 w-8 sm:w-12 mb-5 ${
                  i < currentIndex ? "bg-emerald-500" : "bg-muted-foreground/20"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

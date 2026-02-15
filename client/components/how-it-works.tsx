"use client";

import { Upload, BarChart3, Shield, Blocks } from "lucide-react";

const steps = [
  {
    num: "01",
    title: "Upload",
    desc: "Export HR data from Apple Health. XML or use the built-in demo data.",
    icon: Upload,
  },
  {
    num: "02",
    title: "Analyze",
    desc: "Engine detects fraud, computes HR zones, and scores confidence 0\u2013100.",
    icon: BarChart3,
  },
  {
    num: "03",
    title: "Attest",
    desc: "Oracle submits proof to NEAR. Raw data goes to an encrypted NOVA vault.",
    icon: Shield,
  },
  {
    num: "04",
    title: "Verify",
    desc: "Any dApp can verify the attestation with a single cross-contract call.",
    icon: Blocks,
  },
];

export function HowItWorks() {
  return (
    <section className="px-6 sm:px-10 py-16 sm:py-24">
      <div className="max-w-4xl mx-auto">
        <div className="section-label mb-4">How It Works</div>
        <h2 className="font-mono text-2xl sm:text-3xl font-bold tracking-tight mb-12">
          FOUR STEPS. ONE PROOF.
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-neutral-800 rounded-lg overflow-hidden">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="bg-neutral-900/80 p-5 sm:p-6 flex flex-col"
              >
                <div className="flex items-center justify-between mb-6">
                  <span className="font-mono text-xs text-neutral-600">
                    {step.num}
                  </span>
                  <Icon className="h-4 w-4 text-neutral-600" />
                </div>
                <h3 className="font-mono text-sm font-semibold text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

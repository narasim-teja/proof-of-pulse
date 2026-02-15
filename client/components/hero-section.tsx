"use client";

import { Heart } from "lucide-react";

interface HeroSectionProps {
  onGetStarted: () => void;
}

export function HeroSection({ onGetStarted }: HeroSectionProps) {
  return (
    <section className="px-6 sm:px-10 pt-20 pb-16 sm:pt-28 sm:pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Status badge */}
        <div className="flex items-center gap-2 mb-10">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="font-mono text-xs uppercase tracking-widest text-neutral-500">
            Live on NEAR Testnet
          </span>
        </div>

        {/* Title */}
        <h1 className="font-mono text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.9] mb-8">
          PROOF OF
          <br />
          PULSE<span className="text-emerald-500">.</span>
        </h1>

        {/* Tagline */}
        <p className="text-neutral-400 text-lg sm:text-xl max-w-xl leading-relaxed mb-4">
          Biometric attestation on NEAR.
        </p>
        <p className="text-neutral-500 text-base sm:text-lg max-w-xl leading-relaxed mb-12">
          Upload heart rate data, get a cryptographic proof on-chain.
          No raw data exposed — only the proof.
        </p>

        {/* CTAs */}
        <div className="flex items-center gap-4 mb-20">
          <button
            onClick={onGetStarted}
            className="font-mono text-sm bg-white text-black px-6 py-2.5 rounded-full hover:bg-neutral-200 transition-colors"
          >
            Get Started
          </button>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm border border-neutral-700 text-neutral-300 px-6 py-2.5 rounded-full hover:border-neutral-500 hover:text-white transition-colors"
          >
            Source
          </a>
        </div>

        {/* Protocol Stats */}
        <div className="section-label mb-6">Protocol Stats</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-neutral-800 rounded-lg overflow-hidden">
          <StatBlock value="95" label="Confidence" sublabel="max score" />
          <StatBlock value="25 min" label="Duration" sublabel="workout" />
          <StatBlock value="177" label="Peak HR" sublabel="beats per min" />
          <StatBlock value="NEAR" label="Network" sublabel="testnet" />
        </div>
      </div>
    </section>
  );
}

function StatBlock({
  value,
  label,
  sublabel,
}: {
  value: string;
  label: string;
  sublabel: string;
}) {
  return (
    <div className="bg-neutral-900/80 px-5 py-5 sm:px-6 sm:py-6">
      <div className="font-mono text-2xl sm:text-3xl font-bold text-white mb-2">
        {value}
      </div>
      <div className="font-mono text-xs text-neutral-400">{label}</div>
      <div className="text-xs text-neutral-600">{sublabel}</div>
    </div>
  );
}

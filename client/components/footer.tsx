"use client";

const techStack = [
  "NEAR Protocol",
  "Shade Agent",
  "NOVA SDK",
  "near-sdk-js",
  "Bun",
  "Next.js",
  "Recharts",
];

export function Footer() {
  return (
    <footer className="px-6 sm:px-10 py-12 sm:py-16">
      <div className="max-w-4xl mx-auto">
        <div className="section-label mb-6">Stack</div>
        <div className="flex flex-wrap gap-2 mb-10">
          {techStack.map((tech) => (
            <span
              key={tech}
              className="font-mono text-xs text-neutral-500 border border-neutral-800 px-3 py-1.5 rounded"
            >
              {tech}
            </span>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-6 border-t border-neutral-800">
          <span className="font-mono text-xs text-neutral-600">
            Proof of Pulse — Biometric Attestation Oracle
          </span>
          <span className="font-mono text-xs text-neutral-700">
            NEAR Testnet
          </span>
        </div>
      </div>
    </footer>
  );
}

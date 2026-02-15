"use client";

import type { HRZoneDistribution } from "@/lib/types";

const zoneConfig = [
  { key: "zone5_max" as const, name: "Zone 5 — Max", color: "bg-red-500", range: ">160 bpm" },
  { key: "zone4_vigorous" as const, name: "Zone 4 — Vigorous", color: "bg-orange-500", range: "140-160" },
  { key: "zone3_moderate" as const, name: "Zone 3 — Moderate", color: "bg-yellow-500", range: "120-140" },
  { key: "zone2_light" as const, name: "Zone 2 — Light", color: "bg-blue-500", range: "100-120" },
  { key: "zone1_rest" as const, name: "Zone 1 — Rest", color: "bg-slate-500", range: "<100 bpm" },
];

export function ZoneDistribution({ zones }: { zones: HRZoneDistribution }) {
  return (
    <div className="space-y-3">
      {zoneConfig.map((z) => (
        <div key={z.key} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-foreground/80">{z.name}</span>
            <span className="text-muted-foreground font-mono">
              {zones[z.key]}% <span className="text-xs">({z.range})</span>
            </span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${z.color} rounded-full transition-all duration-700 ease-out`}
              style={{ width: `${Math.max(zones[z.key], 1)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

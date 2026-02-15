"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { HRTimelinePoint } from "@/lib/types";

interface HRTimelineChartProps {
  data: HRTimelinePoint[];
  avgHr: number;
}

export function HRTimelineChart({ data, avgHr }: HRTimelineChartProps) {
  if (!data.length) return null;

  const minBpm = Math.min(...data.map((d) => d.bpm));
  const maxBpm = Math.max(...data.map((d) => d.bpm));
  const yMin = Math.max(50, minBpm - 10);
  const yMax = maxBpm + 10;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="hrGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.06)"
          vertical={false}
        />
        <XAxis
          dataKey="time"
          tickFormatter={(t: string) =>
            new Date(t).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          }
          stroke="rgba(255,255,255,0.1)"
          tick={{ fill: "#a3a3a3", fontSize: 11, fontFamily: "var(--font-geist-mono)" }}
          tickMargin={10}
          axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
        />
        <YAxis
          domain={[yMin, yMax]}
          stroke="rgba(255,255,255,0.1)"
          tick={{ fill: "#a3a3a3", fontSize: 11, fontFamily: "var(--font-geist-mono)" }}
          tickMargin={8}
          tickFormatter={(v: number) => `${v}`}
          axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
          width={45}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#171717",
            border: "1px solid #262626",
            borderRadius: "8px",
            color: "#e5e5e5",
            fontSize: 12,
            fontFamily: "var(--font-geist-mono)",
          }}
          labelFormatter={(t) =>
            new Date(String(t)).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          }
          formatter={(value) => [`${value} bpm`, "Heart Rate"]}
          cursor={{ stroke: "rgba(255,255,255,0.1)" }}
        />
        <ReferenceLine
          y={avgHr}
          stroke="#818cf8"
          strokeDasharray="5 5"
          strokeOpacity={0.6}
          label={{
            value: `Avg ${avgHr}`,
            position: "right",
            fill: "#a5b4fc",
            fontSize: 11,
            fontWeight: 500,
          }}
        />
        <Area
          type="monotone"
          dataKey="bpm"
          stroke="#34d399"
          strokeWidth={2}
          fill="url(#hrGradient)"
          dot={false}
          activeDot={{ r: 4, fill: "#34d399", stroke: "#064e3b", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

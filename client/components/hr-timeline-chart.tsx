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
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="hrGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
        <XAxis
          dataKey="time"
          tickFormatter={(t: string) =>
            new Date(t).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          }
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickMargin={8}
        />
        <YAxis
          domain={[yMin, yMax]}
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickMargin={4}
          tickFormatter={(v: number) => `${v}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            color: "hsl(var(--foreground))",
            fontSize: 13,
          }}
          labelFormatter={(t) =>
            new Date(String(t)).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          }
          formatter={(value) => [`${value} bpm`, "Heart Rate"]}
        />
        <ReferenceLine
          y={avgHr}
          stroke="#6366f1"
          strokeDasharray="5 5"
          label={{
            value: `Avg ${avgHr}`,
            position: "right",
            fill: "#6366f1",
            fontSize: 11,
          }}
        />
        <Area
          type="monotone"
          dataKey="bpm"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#hrGradient)"
          dot={false}
          activeDot={{ r: 4, fill: "#10b981", stroke: "#064e3b" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

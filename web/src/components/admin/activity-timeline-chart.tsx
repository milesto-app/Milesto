"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { ActivityTimelineEntry } from "@/lib/admin-api/types";

const SERIES = [
  { key: "signups", color: "oklch(0.55 0.15 250)" },
  { key: "goals", color: "oklch(0.55 0.16 300)" },
  { key: "messages", color: "oklch(0.55 0.14 160)" },
] as const;

const CONFIG: ChartConfig = {
  signups: { label: "Signups", color: SERIES[0].color },
  goals: { label: "Goals", color: SERIES[1].color },
  messages: { label: "Messages", color: SERIES[2].color },
};

export function ActivityTimelineChart({
  data,
}: {
  data: ActivityTimelineEntry[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
        No activity in this window
      </div>
    );
  }

  return (
    <ChartContainer config={CONFIG} className="h-60 w-full">
      <AreaChart
        data={data}
        margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
      >
        <defs>
          {SERIES.map((s) => (
            <linearGradient
              key={s.key}
              id={`fill-activity-${s.key}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={s.color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 85)" />
        <XAxis
          dataKey="date"
          tickFormatter={(val: string) => {
            const [, m, d] = val.split("-");
            return `${m}/${d}`;
          }}
          fontSize={11}
          tickLine={false}
          axisLine={false}
          stroke="oklch(0.60 0.02 50)"
        />
        <YAxis
          fontSize={11}
          tickLine={false}
          axisLine={false}
          stroke="oklch(0.60 0.02 50)"
          width={32}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        {SERIES.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            fill={`url(#fill-activity-${s.key})`}
            stroke={s.color}
            strokeWidth={1.5}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}

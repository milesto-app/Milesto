"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const TYPE_COLORS: Record<string, string> = {
  GOAL_TITLE: "oklch(0.55 0.15 250)",
  INTAKE_BATCH: "oklch(0.55 0.14 160)",
  GOAL_PROFILE: "oklch(0.55 0.16 300)",
  MILESTONE_ROADMAP: "oklch(0.62 0.14 55)",
  WEEKLY_PLAN: "oklch(0.55 0.16 350)",
  DAILY_OBJECTIVES: "oklch(0.52 0.13 220)",
  CHAT_MESSAGE: "oklch(0.45 0.14 145)",
  VOICE_TRANSCRIPTION: "oklch(0.65 0.12 80)",
};

const KNOWN_TYPES = new Set(Object.keys(TYPE_COLORS));

function buildConfig(types: string[]): ChartConfig {
  const config: ChartConfig = {};
  for (const type of types) {
    if (!KNOWN_TYPES.has(type)) continue;
    config[type] = {
      label: type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
      color: TYPE_COLORS[type]!,
    };
  }
  return config;
}

export function UsageChart({
  data,
}: {
  data: Array<{ date: string; [type: string]: number | string }>;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        No usage data available
      </div>
    );
  }

  const types = Array.from(
    new Set(data.flatMap((d) => Object.keys(d).filter((k) => k !== "date"))),
  ).filter((t) => KNOWN_TYPES.has(t));

  const config = buildConfig(types);

  return (
    <ChartContainer config={config} className="h-[320px] w-full">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          {types.map((type) => (
            <linearGradient key={type} id={`fill-${type}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={`var(--color-${type})`} stopOpacity={0.3} />
              <stop offset="100%" stopColor={`var(--color-${type})`} stopOpacity={0.02} />
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
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        {types.map((type) => (
          <Area
            key={type}
            type="monotone"
            dataKey={type}
            stackId="1"
            fill={`url(#fill-${type})`}
            stroke={`var(--color-${type})`}
            strokeWidth={1.5}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}

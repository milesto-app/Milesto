import { cn } from "@/lib/utils";

export function Sparkline({
  values,
  width = 80,
  height = 20,
  className,
}: {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  if (values.length < 2) {
    return (
      <span
        className={cn(
          "inline-block h-[20px] w-[80px] rounded bg-surface-3",
          className,
        )}
        aria-hidden
      />
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  const points = values
    .map(
      (v, i) =>
        `${(i * stepX).toFixed(2)},${(height - ((v - min) / range) * height).toFixed(2)}`,
    )
    .join(" ");

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("inline-block align-middle text-brand", className)}
      aria-hidden
    >
      <polygon points={areaPoints} fill="rgba(0, 224, 255, 0.08)" />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

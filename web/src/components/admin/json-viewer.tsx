import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/admin/copy-button";

const JSON_INDENT_SPACES = 2;

function safeStringify(value: unknown): string {
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, JSON_INDENT_SPACES);
  } catch {
    return String(value);
  }
}

export function JsonViewer({
  value,
  className,
  copyLabel,
}: {
  value: unknown;
  className?: string;
  copyLabel?: string;
}) {
  const formatted = safeStringify(value);

  return (
    <div
      className={cn(
        "relative rounded-lg border border-border/60 bg-muted/30",
        className,
      )}
    >
      <div className="absolute right-2 top-2">
        <CopyButton value={formatted} label={copyLabel} />
      </div>
      <pre className="max-h-96 overflow-auto px-4 py-3 pr-14 font-mono text-xs leading-relaxed text-foreground">
        {formatted}
      </pre>
    </div>
  );
}

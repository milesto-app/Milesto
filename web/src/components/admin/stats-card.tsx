import { Card, CardContent } from "@/components/ui/card";

export function StatsCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string | number;
  description?: string;
}) {
  return (
    <Card className="border-border/50 shadow-none transition-shadow hover:shadow-sm">
      <CardContent className="p-5">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {title}
        </p>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {description && (
          <p className="mt-1.5 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

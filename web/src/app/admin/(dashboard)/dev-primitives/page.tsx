"use client";

import { Surface } from "@/components/admin/surface";
import { StatusBadge } from "@/components/admin/status-badge";
import { Sparkline } from "@/components/admin/sparkline";
import { SegmentedTabs } from "@/components/admin/segmented-tabs";
import { InlineField } from "@/components/admin/inline-field";
import { PageHeader } from "@/components/admin/page-header";

export default function PrimitivesPreviewPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Internal"
        title="Primitive preview"
        description="Dev-only — delete in Block 6."
      />

      <Surface tone="default" pad="lg">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">
          Status badges
        </h2>
        <div className="flex flex-wrap gap-2">
          <StatusBadge variant="active" />
          <StatusBadge variant="pro" />
          <StatusBadge variant="pending" />
          <StatusBadge variant="expired" />
          <StatusBadge variant="cancelled" />
          <StatusBadge variant="revoked" />
          <StatusBadge variant="failed" />
          <StatusBadge variant="free" />
          <StatusBadge variant="healthy" />
          <StatusBadge variant="degraded" />
          <StatusBadge variant="down" />
        </div>
      </Surface>

      <Surface tone="default" pad="lg">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">
          Sparklines
        </h2>
        <div className="flex items-center gap-6">
          <Sparkline values={[3, 7, 5, 9, 12, 8, 14, 11]} />
          <Sparkline values={[10, 9, 8, 7, 6, 5, 4, 3]} />
          <Sparkline values={[2, 3, 4, 5, 6, 7, 8, 9]} />
        </div>
      </Surface>

      <Surface tone="default" pad="lg">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">
          Segmented tabs
        </h2>
        <SegmentedTabs
          paramKey="preview-tab"
          options={[
            { value: "overview", label: "Overview" },
            { value: "goals", label: "Goals", count: 12 },
            { value: "usage", label: "Usage" },
          ]}
        />
      </Surface>

      <Surface tone="default" pad="lg">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">
          Inline field
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <InlineField
            label="Display name"
            value="Gabriel Brument"
            onSave={async (next) => {
              await new Promise((r) => setTimeout(r, 600));
              if (next.toLowerCase().includes("fail")) {
                return {
                  ok: false,
                  error: { code: "demo", message: "Simulated failure" },
                };
              }
              return { ok: true, data: null };
            }}
          />
          <InlineField
            label="Role"
            value="admin"
            variant="select"
            options={[
              { value: "admin", label: "admin" },
              { value: "user", label: "user" },
            ]}
            onSave={async () => ({ ok: true, data: null })}
          />
        </div>
      </Surface>
    </div>
  );
}

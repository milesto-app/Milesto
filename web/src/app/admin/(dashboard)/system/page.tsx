import {
  getHealth,
  getLlmHealth,
  listLogs,
} from "@/lib/admin-api/resources/system";
import { readString } from "@/lib/admin-api/search-params";
import type { AdminLogLevel } from "@/lib/admin-api/types";
import { FilterBar } from "@/components/admin/filter-bar";
import { PageHeader } from "@/components/admin/page-header";

import { LlmPanel } from "./_components/llm-panel";
import { LogsTable } from "./_components/logs-table";
import { ServicesPanel } from "./_components/services-panel";
import { SystemTabs } from "./_components/system-tabs";

const LOG_LEVEL_OPTIONS = [
  { value: "warn", label: "Warn" },
  { value: "error", label: "Error" },
];

function parseLogLevel(value: string | undefined): AdminLogLevel | undefined {
  if (value === "warn" || value === "error") return value;
  return undefined;
}

export default async function SystemPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const level = parseLogLevel(readString(sp, "level"));

  const [health, llm, logs] = await Promise.all([
    getHealth(),
    getLlmHealth(),
    listLogs({ ...(level ? { level } : {}) }),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="System"
        description="Backend health, LLM probes, and recent log lines."
      />
      <SystemTabs
        services={<ServicesPanel data={health} />}
        llm={<LlmPanel data={llm} />}
        logs={
          <div className="space-y-3">
            <FilterBar
              searchPlaceholder="Filter logs"
              facets={[
                {
                  key: "level",
                  label: "level",
                  placeholder: "Level",
                  options: LOG_LEVEL_OPTIONS,
                },
              ]}
            />
            <LogsTable logs={logs} />
          </div>
        }
      />
    </div>
  );
}

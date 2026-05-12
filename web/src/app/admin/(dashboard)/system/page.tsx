import { getHealth, getLlmHealth } from "@/lib/admin-api/resources/system";
import { PageHeader } from "@/components/admin/page-header";

import { LlmPanel } from "./_components/llm-panel";
import { ServicesPanel } from "./_components/services-panel";
import { SystemTabs } from "./_components/system-tabs";

export default async function SystemPage() {
  const [health, llm] = await Promise.all([getHealth(), getLlmHealth()]);

  return (
    <div className="space-y-4">
      <PageHeader title="System" description="Backend health and LLM probes." />
      <SystemTabs
        services={<ServicesPanel data={health} />}
        llm={<LlmPanel data={llm} />}
      />
    </div>
  );
}

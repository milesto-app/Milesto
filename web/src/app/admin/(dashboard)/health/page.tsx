import { getHealth } from "@/lib/admin-api/resources/system";
import { HealthStatus } from "@/components/admin/health-status";

export default async function HealthPage() {
  const healthData = await getHealth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          System Health
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live service status and response times
        </p>
      </div>
      <HealthStatus initialData={healthData} />
    </div>
  );
}

import { getMe } from "@/lib/admin-api/resources/meta";
import { Card, CardContent } from "@/components/ui/card";
import { CopyButton } from "@/components/admin/copy-button";
import { PageHeader } from "@/components/admin/page-header";

export default async function AccountPage() {
  const me = await getMe();
  const fullName = [me.firstName, me.lastName].filter(Boolean).join(" ") || "—";

  return (
    <div className="space-y-4">
      <PageHeader
        title="Account"
        description="Your admin user as the API sees it."
      />
      <Card className="border-border/60 shadow-none">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Email" value={me.email} />
          <Field label="Role" value={me.role} />
          <Field label="Name" value={fullName} />
          <div className="flex items-end justify-between gap-2">
            <Field label="User ID" value={me.id} mono />
            <CopyButton value={me.id} label="Copy" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`text-foreground ${mono ? "font-mono text-xs" : "text-sm"}`}
      >
        {value}
      </p>
    </div>
  );
}

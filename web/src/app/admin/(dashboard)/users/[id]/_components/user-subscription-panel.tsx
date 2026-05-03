import { formatDateTime } from "@/lib/format";
import type { AdminUserSubscription } from "@/lib/admin-api/types";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/admin/copy-button";

function statusBadge(status: string) {
  switch (status) {
    case "active":
      return (
        <Badge className="border-0 bg-primary/10 text-primary font-medium">
          Active
        </Badge>
      );
    case "expired":
      return (
        <Badge
          variant="destructive"
          className="border-0 bg-destructive/10 text-destructive font-medium"
        >
          Expired
        </Badge>
      );
    case "revoked":
      return (
        <Badge
          variant="destructive"
          className="border-0 bg-destructive/10 text-destructive font-medium"
        >
          Revoked
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="outline" className="font-medium">
          Cancelled
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="secondary" className="font-medium">
          Pending
        </Badge>
      );
    case "free":
    case "none":
      return (
        <Badge variant="secondary" className="font-medium">
          Free
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="font-medium">
          {status}
        </Badge>
      );
  }
}

export function UserSubscriptionPanel({
  subscription,
}: {
  subscription: AdminUserSubscription;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {statusBadge(subscription.status)}
        {subscription.expiresAt ? (
          <span className="text-sm text-muted-foreground">
            Expires {formatDateTime(subscription.expiresAt)}
          </span>
        ) : null}
      </div>

      <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <Field label="Product ID" value={subscription.productId} mono />
        <Field label="Environment" value={subscription.environment} />
        <Field
          label="Auto-renew"
          value={
            subscription.autoRenewStatus == null
              ? null
              : subscription.autoRenewStatus
                ? "Enabled"
                : "Disabled"
          }
        />
        <Field
          label="Original transaction"
          value={subscription.originalTransactionId}
          mono
          copy
        />
        <Field
          label="Apple signed at"
          value={
            subscription.appleSignedAt
              ? formatDateTime(subscription.appleSignedAt)
              : null
          }
        />
        <Field
          label="Verified at"
          value={
            subscription.verifiedAt
              ? formatDateTime(subscription.verifiedAt)
              : null
          }
        />
      </dl>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  copy,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  copy?: boolean;
}) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd
        className={`mt-1 flex items-center gap-2 ${
          mono ? "font-mono text-xs" : "text-sm"
        }`}
      >
        <span className="truncate">{value ?? "—"}</span>
        {copy && value ? <CopyButton value={value} /> : null}
      </dd>
    </div>
  );
}

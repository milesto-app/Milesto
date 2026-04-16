import { NotificationForm } from "@/components/admin/notification-form";

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Send test push notifications to users via APNs
        </p>
      </div>
      <div className="max-w-lg">
        <NotificationForm />
      </div>
    </div>
  );
}

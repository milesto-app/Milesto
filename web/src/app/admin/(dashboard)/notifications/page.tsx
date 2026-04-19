import { NotificationForm } from "@/components/admin/notification-form";
import { getAllUsersForSelect } from "@/lib/supabase/queries/users";

export default async function NotificationsPage() {
  const users = await getAllUsersForSelect();

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
        <NotificationForm users={users} />
      </div>
    </div>
  );
}

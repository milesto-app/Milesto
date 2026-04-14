import { requireAdmin } from "@/lib/supabase/require-admin";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { AppSidebar } from "./components/app-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <SidebarProvider>
      <AppSidebar userEmail={user.email ?? ""} />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b border-border/50 bg-background/80 px-6 backdrop-blur-sm">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
          <div className="h-4 w-px bg-border" />
          <span className="text-sm font-medium text-muted-foreground">Admin</span>
        </header>
        <main className="flex-1 px-6 py-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

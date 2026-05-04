import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";

import { requireAdmin } from "@/lib/supabase/require-admin";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

import { KeyboardScopeProvider } from "@/components/admin/keyboard-scope";
import { InspectorRailProvider } from "@/components/admin/inspector-rail";

import { AppSidebar } from "./components/app-sidebar";
import { RouteTransition } from "./route-transition";
import "./admin.css";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <NuqsAdapter>
      <TooltipProvider>
        <div className="admin-shell" data-density="comfortable">
          <SidebarProvider>
            <AppSidebar userEmail={user.email ?? ""} />
            <SidebarInset>
              <header className="flex h-14 items-center gap-3 border-b border-border bg-background px-6">
                <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
                <div className="h-4 w-px bg-border" />
                <span className="text-sm font-medium text-muted-foreground">
                  Admin
                </span>
              </header>
              <KeyboardScopeProvider>
                <InspectorRailProvider>
                  <main className="flex-1 px-6 py-6">
                    <RouteTransition>{children}</RouteTransition>
                  </main>
                </InspectorRailProvider>
              </KeyboardScopeProvider>
            </SidebarInset>
            <Toaster
              position="bottom-right"
              richColors
              closeButton
              theme="dark"
            />
          </SidebarProvider>
        </div>
      </TooltipProvider>
    </NuqsAdapter>
  );
}

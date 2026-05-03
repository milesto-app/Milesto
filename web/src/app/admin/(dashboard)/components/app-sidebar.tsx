"use client";

import { usePathname, useRouter } from "next/navigation";
import { LogOut, type LucideIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import { CommandPalette } from "./command-palette";
import { ADMIN_NAV_GROUPS, ADMIN_SETTINGS_ITEMS } from "./nav-config";

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  return (
    <Sidebar>
      <SidebarHeader className="gap-3 px-3 py-4">
        <div className="flex items-center gap-2.5 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-bg-soft">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              className="text-brand"
              aria-hidden
            >
              <path
                d="M13 3L4 14h7l-1 7 9-11h-7l1-7z"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-sidebar-foreground">
            Milesto
          </span>
        </div>
        <CommandPalette />
      </SidebarHeader>
      <SidebarContent>
        {ADMIN_NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-text-tertiary">
              {group.label}
            </SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => (
                <NavItem
                  key={item.href}
                  title={item.title}
                  href={item.href}
                  icon={item.icon}
                  active={isActive(pathname, item.href)}
                />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="gap-2 border-t border-sidebar-border px-2 py-3">
        <SidebarMenu>
          {ADMIN_SETTINGS_ITEMS.map((item) => (
            <NavItem
              key={item.href}
              title={item.title}
              href={item.href}
              icon={item.icon}
              active={isActive(pathname, item.href)}
            />
          ))}
        </SidebarMenu>
        <div className="mt-1 flex items-center gap-3 border-t border-sidebar-border pt-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-bg-soft text-xs font-medium text-sidebar-foreground">
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <span className="min-w-0 flex-1 truncate text-xs text-sidebar-foreground/60">
            {userEmail}
          </span>
          <button
            onClick={handleLogout}
            className="shrink-0 rounded-md p-1.5 text-sidebar-foreground/40 transition-colors hover:bg-white/10 hover:text-sidebar-foreground"
            aria-label="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function NavItem({
  title,
  href,
  icon: Icon,
  active,
}: {
  title: string;
  href: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={<a href={href} />}
        isActive={active}
        className="h-9 gap-2.5 rounded-lg text-[13px] font-medium text-sidebar-foreground/70 transition-colors hover:text-sidebar-foreground data-[active=true]:bg-brand-bg-soft data-[active=true]:text-text-brand"
      >
        <Icon className="h-4 w-4" />
        <span>{title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

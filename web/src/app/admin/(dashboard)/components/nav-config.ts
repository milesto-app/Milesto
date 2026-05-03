import {
  BarChart3,
  Bell,
  ClipboardList,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  MessageCircle,
  MessagesSquare,
  Server,
  ShieldCheck,
  Target,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  keywords?: string[];
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: "Insight",
    items: [
      {
        title: "Overview",
        href: "/admin",
        icon: LayoutDashboard,
        keywords: ["dashboard", "home", "stats", "kpis"],
      },
      {
        title: "Usage",
        href: "/admin/usage",
        icon: BarChart3,
        keywords: ["generations", "tokens", "cost", "llm"],
      },
      {
        title: "Messages",
        href: "/admin/messages",
        icon: MessagesSquare,
        keywords: ["chat", "stats", "tools"],
      },
      {
        title: "Subscriptions",
        href: "/admin/subscriptions",
        icon: CreditCard,
        keywords: ["mrr", "arr", "churn", "pro", "billing"],
      },
    ],
  },
  {
    label: "Lifecycle",
    items: [
      {
        title: "Users",
        href: "/admin/users",
        icon: Users,
        keywords: ["accounts", "people", "members"],
      },
      {
        title: "Goals",
        href: "/admin/goals",
        icon: Target,
        keywords: ["roadmaps", "objectives", "milestones"],
      },
      {
        title: "Coaches",
        href: "/admin/coaches",
        icon: GraduationCap,
        keywords: ["personalities", "personas"],
      },
      {
        title: "Conversations",
        href: "/admin/conversations",
        icon: MessageCircle,
        keywords: ["transcripts", "chat history"],
      },
      {
        title: "Intake",
        href: "/admin/intake",
        icon: ClipboardList,
        keywords: ["batches", "questions", "answers", "quality"],
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        title: "Notifications",
        href: "/admin/notifications",
        icon: Bell,
        keywords: ["push", "broadcast", "devices", "scheduler"],
      },
      {
        title: "System",
        href: "/admin/system",
        icon: Server,
        keywords: ["health", "logs", "llm", "services"],
      },
    ],
  },
];

export const ADMIN_SETTINGS_ITEMS: AdminNavItem[] = [
  {
    title: "Account",
    href: "/admin/settings/account",
    icon: UserCircle,
    keywords: ["profile", "me"],
  },
  {
    title: "Admins",
    href: "/admin/settings/admins",
    icon: ShieldCheck,
    keywords: ["roles", "permissions", "team"],
  },
];

export function flattenNavItems(): AdminNavItem[] {
  return [
    ...ADMIN_NAV_GROUPS.flatMap((group) => group.items),
    ...ADMIN_SETTINGS_ITEMS,
  ];
}

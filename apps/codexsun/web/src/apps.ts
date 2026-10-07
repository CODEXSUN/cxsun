import {
  Building2Icon,
  ClipboardListIcon,
  ContactRoundIcon,
  CreditCardIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  MailIcon,
  ShieldCheckIcon,
  type LucideIcon
} from "lucide-react";

export type CodexsunAppEntry = {
  description: string;
  icon: LucideIcon;
  id: string;
  moduleKey: string;
  path: string;
  title: string;
};

export const codexsunApps: CodexsunAppEntry[] = [
  {
    description: "Tenant settings, users, and application access",
    icon: LayoutDashboardIcon,
    id: "application",
    moduleKey: "platform.application",
    path: "/app/application/overview",
    title: "Application"
  },
  {
    description: "Sales, purchases, payments, and reports",
    icon: CreditCardIcon,
    id: "billing",
    moduleKey: "billing.sales",
    path: "/app/billing/overview",
    title: "Billing"
  },
  {
    description: "Inbox, compose, and delivery",
    icon: MailIcon,
    id: "mail",
    moduleKey: "mail",
    path: "/app/mail/inbox",
    title: "Mail"
  },
  {
    description: "Accounting and ledgers",
    icon: Building2Icon,
    id: "accounts",
    moduleKey: "accounts.overview",
    path: "/app/accounts/overview",
    title: "Accounts"
  },
  {
    description: "Tenant tasks and planning",
    icon: ClipboardListIcon,
    id: "task-manager",
    moduleKey: "platform.task-manager",
    path: "/app/task-manager/overview",
    title: "Task Manager"
  },
  {
    description: "Articles, media, and publishing",
    icon: FileTextIcon,
    id: "blog",
    moduleKey: "blog",
    path: "/app/blog/overview",
    title: "Blog"
  },
  {
    description: "Contacts and sales opportunities",
    icon: ContactRoundIcon,
    id: "crm",
    moduleKey: "crm",
    path: "/app/crm/overview",
    title: "CRM"
  },
  {
    description: "Audit planning, evidence, and findings",
    icon: ShieldCheckIcon,
    id: "auditor",
    moduleKey: "auditor",
    path: "/app/auditor/overview",
    title: "Auditor"
  }
];

export function enabledCodexsunApps(moduleKeys: string[]): CodexsunAppEntry[] {
  const enabled = new Set(moduleKeys);
  return codexsunApps.filter((app) => app.id === "application" || enabled.has(app.moduleKey));
}

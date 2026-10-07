export type PlatformApp = {
  alwaysEnabled: boolean;
  appId: string;
  defaultLanding: boolean;
  description: string;
  id: number;
  label: string;
  moduleKey: string;
  stack:
    | "platform"
    | "billing"
    | "accounts"
    | "devkit"
    | "project-manager"
    | "mail"
    | "platform-task-manager"
    | "blog"
    | "auditor"
    | "crm"
    | "frappe";
  uuid: string;
};
export type PlatformAppSavePayload = Omit<PlatformApp, "id" | "uuid">;

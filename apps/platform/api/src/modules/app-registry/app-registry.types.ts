export type PlatformAppId =
  | "application"
  | "billing"
  | "accounts"
  | "devkit"
  | "project-manager"
  | "mail"
  | "task-manager"
  | "blog"
  | "auditor"
  | "crm"
  | "frappe";

export type PlatformAppDefinition = {
  alwaysEnabled: boolean;
  defaultLanding: boolean;
  description: string;
  id: number;
  appId: PlatformAppId;
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

export type PlatformAppSavePayload = Omit<PlatformAppDefinition, "id" | "uuid">;

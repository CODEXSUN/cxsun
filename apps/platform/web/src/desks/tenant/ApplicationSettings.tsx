import { useState, type ComponentType } from "react";
import {
  ArrowUpRightIcon,
  Building2Icon,
  CheckIcon,
  MonitorIcon,
  MoonIcon,
  PaletteIcon,
  Settings2Icon,
  SunIcon
} from "lucide-react";
import { ZetroProviderSettingsWorkspace } from "@cxsun/zetro-web/modules/provider";
import { ZetroLogo } from "@cxsun/zetro-web/logo";
import { designSystemVariants } from "@cxsun/ui/design-system";
import type { DesignSystemVariantId } from "@cxsun/ui/design-system";
import {
  getAppearanceMode,
  getDesignVariantId,
  setAppearanceMode,
  setDesignVariantId,
  type AppearanceMode
} from "../../app/design-system";

type SettingsSection = "application" | "appearance" | "zetro";

type ApplicationSettingsProps = {
  companyName: string;
  financialYear: string;
  onNavigate: (page: "application.landing" | "application.profile") => void;
  signedInEmail: string;
  tenantName: string;
  zetroEnabled: boolean;
};

const appearanceModes = [
  {
    id: "system",
    label: "System default",
    description: "Follow your device setting",
    icon: MonitorIcon
  },
  { id: "light", label: "Light", description: "A bright workspace", icon: SunIcon },
  { id: "dark", label: "Dark", description: "A darker workspace", icon: MoonIcon }
] as const;

export function ApplicationSettings({
  companyName,
  financialYear,
  onNavigate,
  signedInEmail,
  tenantName,
  zetroEnabled
}: ApplicationSettingsProps) {
  const [section, setSection] = useState<SettingsSection>("application");
  const [appearanceMode, setMode] = useState<AppearanceMode>(getAppearanceMode);
  const [designVariant, setVariant] = useState<DesignSystemVariantId>(getDesignVariantId);

  function chooseMode(mode: AppearanceMode) {
    setAppearanceMode(mode);
    setMode(mode);
  }

  function chooseVariant(variant: DesignSystemVariantId) {
    setDesignVariantId(variant);
    setVariant(variant);
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage this workspace, Zetro, and how it looks on your device.
        </p>
      </div>
      <div className="grid items-start gap-5 md:grid-cols-[15rem_minmax(0,1fr)]">
        <nav
          aria-label="Settings sections"
          className="rounded-md border border-border bg-card p-1.5"
        >
          <SettingsNavigationButton
            active={section === "application"}
            icon={Settings2Icon}
            label="Application"
            onClick={() => setSection("application")}
          />
          <SettingsNavigationButton
            active={section === "appearance"}
            icon={PaletteIcon}
            label="Appearance"
            onClick={() => setSection("appearance")}
          />
          {zetroEnabled ? (
            <SettingsNavigationButton
              active={section === "zetro"}
              icon={ZetroLogo}
              label="Zetro"
              onClick={() => setSection("zetro")}
            />
          ) : null}
        </nav>
        {section === "application" ? (
          <div className="rounded-md border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">Application</h2>
            <p className="text-sm text-muted-foreground">Current tenant and workspace context.</p>
            <dl className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
              <SettingDetail label="Tenant" value={tenantName} />
              <SettingDetail label="Company" value={companyName} />
              <SettingDetail label="Financial year" value={financialYear} />
              <SettingDetail label="Signed in as" value={signedInEmail} />
            </dl>
            <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-5">
              <button
                className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                onClick={() => onNavigate("application.landing")}
                type="button"
              >
                <Building2Icon aria-hidden="true" className="size-4" />
                Landing desk
                <ArrowUpRightIcon aria-hidden="true" className="size-3.5" />
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                onClick={() => onNavigate("application.profile")}
                type="button"
              >
                Platform profile
                <ArrowUpRightIcon aria-hidden="true" className="size-3.5" />
              </button>
            </div>
          </div>
        ) : section === "zetro" ? (
          <ZetroProviderSettingsWorkspace />
        ) : (
          <div className="space-y-5">
            <div className="rounded-md border border-border bg-card p-5">
              <h2 className="text-lg font-semibold">Appearance &amp; Theme</h2>
              <p className="text-sm text-muted-foreground">
                Changes apply immediately and are saved on this device.
              </p>
              <div aria-label="Appearance mode" className="mt-5 grid gap-2 sm:grid-cols-3">
                {appearanceModes.map(({ id, label, description, icon: Icon }) => (
                  <button
                    key={id}
                    aria-pressed={appearanceMode === id}
                    className={`min-h-24 rounded-md border p-3 text-left transition-colors hover:bg-accent/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${appearanceMode === id ? "border-primary bg-primary/5" : "border-border"}`}
                    onClick={() => chooseMode(id)}
                    type="button"
                  >
                    <Icon aria-hidden="true" className="mb-2 size-4 text-primary" />
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block text-xs text-muted-foreground">{description}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-md border border-border bg-card p-5">
              <h2 className="text-sm font-semibold">Design theme</h2>
              <p className="text-sm text-muted-foreground">
                Choose a palette from the shared UI design system.
              </p>
              <div aria-label="Design theme" className="mt-4 grid gap-2 sm:grid-cols-2">
                {designSystemVariants.map((variant) => (
                  <button
                    key={variant.id}
                    aria-label={`${variant.name}, ${variant.density}`}
                    aria-pressed={designVariant === variant.id}
                    className={`flex min-h-16 items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors hover:bg-accent/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${designVariant === variant.id ? "border-primary bg-primary/5" : "border-border"}`}
                    onClick={() => chooseVariant(variant.id)}
                    type="button"
                  >
                    <span aria-hidden="true" className="flex shrink-0 -space-x-1.5">
                      {variant.palette.map((color, index) => (
                        <span
                          key={index}
                          className="size-4 rounded-full border border-border"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{variant.name}</span>
                      <span className="block text-xs text-muted-foreground">{variant.density}</span>
                    </span>
                    {designVariant === variant.id ? (
                      <CheckIcon aria-hidden="true" className="size-4 shrink-0 text-primary" />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function SettingsNavigationButton({
  active,
  icon: Icon,
  label,
  onClick
}: {
  active: boolean;
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-current={active ? "page" : undefined}
      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${active ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"}`}
      onClick={onClick}
      type="button"
    >
      <span aria-hidden="true" className="size-4 shrink-0">
        <Icon className="size-4" />
      </span>
      {label}
    </button>
  );
}

function SettingDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium">{value}</dd>
    </div>
  );
}

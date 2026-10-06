import { CircleGaugeIcon, ContactRoundIcon, HandshakeIcon, TargetIcon } from "lucide-react";
import { Card } from "@cxapp/ui/components/card";

const areas = [
  {
    description: "Capture and qualify new opportunities as the sales pipeline takes shape.",
    icon: TargetIcon,
    title: "Leads"
  },
  {
    description: "Keep customer people and their relationships together.",
    icon: ContactRoundIcon,
    title: "Contacts"
  },
  {
    description: "Track active conversations through to a decision.",
    icon: HandshakeIcon,
    title: "Deals"
  }
] as const;

export function CrmOverviewWorkspace() {
  return (
    <section className="space-y-5">
      <div className="rounded-md border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-md bg-rose-600 text-white">
            <CircleGaugeIcon className="size-7" />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase text-muted-foreground">CRM</p>
            <h1 className="mt-1 text-3xl font-semibold">CRM Desk</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              The workspace for customer relationships and sales opportunities.
            </p>
          </div>
        </div>
      </div>
      <div>
        <h2 className="text-lg font-semibold">CRM workspace</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Leads, contacts, and deals are the planned CRM records. Their data screens will appear
          here when their API and database modules are added.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {areas.map((area) => (
          <Card className="p-5" key={area.title}>
            <area.icon className="size-6 text-rose-600" />
            <h3 className="mt-4 font-semibold">{area.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{area.description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

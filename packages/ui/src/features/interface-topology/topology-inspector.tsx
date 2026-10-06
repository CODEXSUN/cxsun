import { Check, ChevronRight, Copy, Eye, EyeOff, Highlighter, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../components/select";
import type {
  InterfaceTopologyController,
  InterfaceTopologySection
} from "./interface-topology.types";

export function TopologyInspector({ topology }: { topology: InterfaceTopologyController }) {
  if (!topology.open) return null;
  const activeDesk = topology.desks.find(({ id }) => id === topology.activeDeskId);
  const selected =
    topology.sections.find(({ id }) => id === topology.selected) ?? topology.sections[0];
  if (!selected) return null;

  return (
    <aside
      aria-label="Interface Topology Overlay"
      className="pointer-events-auto fixed top-4 right-14 bottom-20 z-50 flex w-88 max-w-[calc(100vw-4.5rem)] flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-xl"
    >
      <InspectorHeader topology={topology} />
      <SelectedSectionDetails section={selected} topology={topology} />
      <nav
        aria-label="Topology sections"
        className="min-h-0 flex-1 overflow-y-auto px-2 py-2 [scrollbar-color:#a78bfa_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-violet-400 [&::-webkit-scrollbar]:w-1"
      >
        {activeDesk?.sectionHeading ? (
          <h3 className="px-2 pb-1 pt-1 text-xs font-semibold text-muted-foreground">
            {activeDesk.sectionHeading}
          </h3>
        ) : null}
        {topology.sections
          .filter((section) => isRootSection(section, topology.sections))
          .map((section) => (
            <TopologyGroup key={section.id} section={section} topology={topology} />
          ))}
      </nav>
    </aside>
  );
}

function SelectedSectionDetails({
  section,
  topology
}: {
  section: InterfaceTopologySection;
  topology: InterfaceTopologyController;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => setCopied(false), [section.id]);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1_500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <div className="border-b border-border px-3 py-3">
      <strong className="block truncate text-sm">
        {section.id} · {section.name}
      </strong>
      <button
        aria-label={`Copy ${section.technicalName}`}
        className="mt-1 flex w-full cursor-pointer items-center gap-2 rounded-md py-1 text-left text-violet-700 transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        onClick={() => {
          topology.copyTechnicalName(section.id);
          setCopied(true);
        }}
        title="Copy technical name"
        type="button"
      >
        <code className="min-w-0 flex-1 break-all text-xs font-bold">{section.technicalName}</code>
        {copied ? <Check aria-hidden="true" size={15} /> : <Copy aria-hidden="true" size={15} />}
        <span className="sr-only" aria-live="polite">
          {copied ? "Copied" : ""}
        </span>
      </button>
      <p className="mt-2 text-xs text-muted-foreground">{section.description}</p>
      <p className="mt-1 text-xs text-muted-foreground">Scope: {section.scope}</p>
    </div>
  );
}

function InspectorHeader({ topology }: { topology: InterfaceTopologyController }) {
  return (
    <header className="flex items-center gap-2 border-b border-border p-3">
      {topology.desks.length > 1 ? (
        <Select
          onValueChange={(value) => {
            if (value) topology.selectDesk(value);
          }}
          value={topology.activeDeskId}
        >
          <SelectTrigger aria-label="Select topology desk" className="min-w-0 flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectGroup>
              {topology.desks.map((desk) => (
                <SelectItem key={desk.id} value={desk.id}>
                  {desk.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      ) : (
        <span className="flex-1" />
      )}
      <div className="flex shrink-0 items-center gap-1">
        <HeaderAction
          active={topology.labelsVisible}
          label={topology.labelsVisible ? "Hide ITO labels" : "Show ITO labels"}
          onClick={topology.toggleLabels}
        >
          {topology.labelsVisible ? <Eye size={16} /> : <EyeOff size={16} />}
        </HeaderAction>
        <HeaderAction
          active={topology.highlighting}
          label="Toggle boundary highlighter"
          onClick={topology.toggleHighlight}
        >
          <Highlighter size={16} />
        </HeaderAction>
        <HeaderAction label="Close Topology Inspection" onClick={topology.close}>
          <X size={16} />
        </HeaderAction>
      </div>
    </header>
  );
}

function HeaderAction({
  active = false,
  children,
  label,
  onClick
}: {
  active?: boolean;
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className="grid size-8 cursor-pointer place-items-center rounded-md text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 data-[active=true]:bg-violet-700 data-[active=true]:text-white"
      data-active={active}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function TopologyGroup({
  section,
  topology
}: {
  section: InterfaceTopologySection;
  topology: InterfaceTopologyController;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const children = topology.sections.filter(
    ({ id }) => id.includes(".") && id.slice(0, id.lastIndexOf(".")) === section.id
  );
  const selected = topology.selected === section.id;
  const scopedToCurrentRegion = topology.sections.length < topology.allSections.length;
  const expanded =
    !collapsed &&
    (scopedToCurrentRegion ||
      (topology.highlighting && (selected || topology.selected.startsWith(`${section.id}.`))));
  useEffect(() => setCollapsed(false), [topology.highlighting, topology.selected]);

  return (
    <div>
      <div className="flex items-center gap-1">
        <button
          aria-expanded={children.length ? expanded : undefined}
          className="grid min-w-0 flex-1 cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 data-[selected=true]:bg-neutral-200 data-[selected=true]:text-violet-800"
          data-selected={selected}
          onClick={() => {
            if (children.length && expanded) setCollapsed(true);
            else {
              setCollapsed(false);
              topology.inspect(section.id);
            }
          }}
          title={`Inspect ${section.technicalName}`}
          type="button"
        >
          <b className="min-w-7 rounded bg-violet-700 px-1.5 py-1 text-center text-xs text-white">
            {section.id}
          </b>
          <span className="truncate">{section.name}</span>
          {children.length ? (
            <ChevronRight className={expanded ? "rotate-90" : ""} size={15} />
          ) : selected ? (
            <Check size={15} />
          ) : null}
        </button>
        <button
          aria-label={`Copy ${section.technicalName}`}
          className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-md text-violet-700 transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          onClick={(event) => {
            event.stopPropagation();
            topology.copyTechnicalName(section.id);
          }}
          onPointerDown={(event) => event.stopPropagation()}
          title={`Copy ${section.technicalName}`}
          type="button"
        >
          <Copy aria-hidden="true" size={14} />
        </button>
      </div>
      {expanded ? (
        <div className="ml-4 border-l border-border pl-1">
          {children.map((child) => (
            <TopologyGroup key={child.id} section={child} topology={topology} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function isRootSection(
  section: InterfaceTopologySection,
  sections: readonly InterfaceTopologySection[]
) {
  if (!section.id.includes(".")) return true;
  const parentId = section.id.slice(0, section.id.lastIndexOf("."));
  return !sections.some((candidate) => candidate.id === parentId);
}

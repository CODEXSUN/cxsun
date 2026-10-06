import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  InterfaceTopologyController,
  InterfaceTopologyDesk,
  InterfaceTopologySection
} from "./interface-topology.types";

const labelsStorageKey = "codexsun.ui.ito.labels-visible";

export function useInterfaceTopology(
  desks: readonly InterfaceTopologyDesk[]
): InterfaceTopologyController {
  validateInterfaceTopologyDesks(desks);
  const allSections = useMemo(() => desks.flatMap((desk) => desk.sections), [desks]);
  const [scopeRootId, setScopeRootId] = useState<string | null>(null);
  const scopedDesks = useMemo(
    () =>
      scopeRootId
        ? desks
            .map((desk) => ({
              ...desk,
              sections: desk.sections.filter(
                ({ id }) => id === scopeRootId || id.startsWith(`${scopeRootId}.`)
              )
            }))
            .filter((desk) => desk.sections.length > 0)
        : desks,
    [desks, scopeRootId]
  );
  const firstDesk = scopedDesks[0];
  const [activeDeskId, setActiveDeskId] = useState(firstDesk?.id ?? "");
  const activeDesk = scopedDesks.find(({ id }) => id === activeDeskId) ?? firstDesk;
  const sections = activeDesk?.sections ?? [];
  const firstId = sections[0]?.id ?? "";
  const [labelsVisible, setLabelsVisible] = useState(readLabelsVisibility);
  const [open, setOpen] = useState(false);
  const [highlighting, setHighlighting] = useState(false);
  const [selected, setSelected] = useState(firstId);
  const sectionIds = useMemo(
    () => new Set(scopedDesks.flatMap((desk) => desk.sections.map(({ id }) => id))),
    [scopedDesks]
  );
  const pageKey = scopedDesks
    .map(
      (desk) => `${desk.id}:${desk.sections.map(({ technicalName }) => technicalName).join("|")}`
    )
    .join(";");

  useEffect(() => setHighlighting(false), [pageKey]);
  useEffect(() => {
    if (!scopedDesks.some(({ id }) => id === activeDeskId)) setActiveDeskId(firstDesk?.id ?? "");
  }, [activeDeskId, firstDesk?.id, scopedDesks]);
  useEffect(() => {
    if (!sections.some(({ id }) => id === selected)) setSelected(firstId);
  }, [firstId, sections, selected]);

  function inspect(id: string) {
    const owner = scopedDesks.find((desk) => desk.sections.some((section) => section.id === id));
    if (!owner) return;
    setActiveDeskId(owner.id);
    setSelected(id);
    setHighlighting(true);
    setOpen(true);
  }

  function copyTechnicalName(id: string) {
    const section = allSections.find((candidate) => candidate.id === id);
    if (section) copyText(section.technicalName);
  }

  function selectDesk(id: string) {
    const desk = scopedDesks.find((candidate) => candidate.id === id);
    if (!desk) return;
    setActiveDeskId(id);
    setSelected(desk.sections[0]?.id ?? "");
    setHighlighting(false);
  }

  function toggleLabels() {
    setLabelsVisible((current) => {
      const next = !current;
      persistLabelsVisibility(next);
      return next;
    });
  }

  const setScope = useCallback((rootId: string | null) => setScopeRootId(rootId), []);

  return {
    activeDeskId,
    allSections,
    close: () => setOpen(false),
    copyTechnicalName,
    desks: scopedDesks,
    highlightClassName: () =>
      "data-[ito-highlighted=true]:ring-2 data-[ito-highlighted=true]:ring-inset data-[ito-highlighted=true]:ring-violet-700",
    highlighting,
    inspect,
    labelsVisible,
    open,
    regionProps: (id) => ({
      "data-ito-highlighted": sectionIds.has(id) && highlighting && selected === id,
      "data-ito-section": id
    }),
    sections,
    select: setSelected,
    selectDesk,
    setScope,
    selected,
    toggleHighlight: () => setHighlighting((current) => !current),
    toggleLabels,
    toggleOpen: () => setOpen((current) => !current)
  };
}

export function validateInterfaceTopologyDesks(desks: readonly InterfaceTopologyDesk[]): void {
  const deskIds = new Set<string>();
  for (const desk of desks) {
    if (deskIds.has(desk.id)) throw new Error(`Duplicate ITO desk id: ${desk.id}`);
    deskIds.add(desk.id);
  }
  validateInterfaceTopologySections(desks.flatMap((desk) => desk.sections));
}

export function validateInterfaceTopologySections(
  sections: readonly InterfaceTopologySection[]
): void {
  const ids = new Set<string>();
  const technicalNames = new Set<string>();

  for (const section of sections) {
    if (ids.has(section.id)) throw new Error(`Duplicate ITO id: ${section.id}`);
    if (technicalNames.has(section.technicalName)) {
      throw new Error(`Duplicate ITO technical name: ${section.technicalName}`);
    }
    if (!/^[a-z][a-zA-Z0-9]*(?:\.[A-Za-z][a-zA-Z0-9]*){1,2}$/.test(section.technicalName)) {
      throw new Error(
        `ITO technical name must have two or three dot-separated segments: ${section.technicalName}`
      );
    }
    ids.add(section.id);
    technicalNames.add(section.technicalName);
  }

  for (const section of sections) {
    const parentId = section.id.includes(".")
      ? section.id.slice(0, section.id.lastIndexOf("."))
      : "";
    if (parentId && !ids.has(parentId)) {
      throw new Error(`ITO item ${section.id} is missing parent ${parentId}`);
    }
  }
}

function readLabelsVisibility() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(labelsStorageKey) === "true";
  } catch {
    return false;
  }
}

function persistLabelsVisibility(visible: boolean) {
  try {
    window.localStorage.setItem(labelsStorageKey, String(visible));
  } catch {
    // The session state still works when browser storage is unavailable.
  }
}

function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(value).catch(() => fallbackCopy(value));
    return;
  }
  fallbackCopy(value);
}

function fallbackCopy(value: string) {
  const target = document.createElement("textarea");
  target.value = value;
  target.setAttribute("readonly", "");
  target.className = "fixed opacity-0";
  document.body.append(target);
  target.select();
  document.execCommand("copy");
  target.remove();
}

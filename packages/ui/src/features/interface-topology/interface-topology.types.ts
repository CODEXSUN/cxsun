export type InterfaceTopologySection = {
  description: string;
  id: string;
  name: string;
  scope: string;
  technicalName: string;
};

export type InterfaceTopologyDesk = {
  id: string;
  name: string;
  sectionHeading?: string;
  sections: readonly InterfaceTopologySection[];
};

export type InterfaceTopologyRegionProps = {
  "data-ito-highlighted": boolean;
  "data-ito-section": string;
};

export type InterfaceTopologyController = {
  activeDeskId: string;
  allSections: readonly InterfaceTopologySection[];
  close: () => void;
  copyTechnicalName: (id: string) => void;
  desks: readonly InterfaceTopologyDesk[];
  highlightClassName: (id: string) => string;
  inspect: (id: string) => void;
  labelsVisible: boolean;
  open: boolean;
  regionProps: (id: string) => InterfaceTopologyRegionProps;
  sections: readonly InterfaceTopologySection[];
  selected: string;
  select: (id: string) => void;
  selectDesk: (id: string) => void;
  setScope: (rootId: string | null) => void;
  toggleHighlight: () => void;
  toggleLabels: () => void;
  toggleOpen: () => void;
  highlighting: boolean;
};

export type Contact360Person = {
  id: number;
  customerContactId: number;
  firstName: string;
  lastName: string | null;
  displayName: string | null;
  status: "active" | "inactive";
};

export type Contact360Tag = {
  id: number;
  name: string;
  status: "active" | "inactive";
};

export type Contact360LeafProps = {
  parentId: number;
  people?: Contact360Person[];
  tags?: Contact360Tag[];
  onSaved?: () => void;
};

export type Contact360Customer = {
  id: number;
  name: string;
  status: string;
  primaryPhone?: string | null;
};

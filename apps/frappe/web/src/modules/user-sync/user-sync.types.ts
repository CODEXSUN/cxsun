export type FrappeUserPreview = {
  frappeUserId: string;
  name: string;
  email: string;
  employeeCode: string | null;
  userType: string;
  lastActiveAt: string | null;
  localUserId: number | null;
  localStatus: string | null;
};

export type FrappeUserImport = {
  status: "created" | "already-exists";
  userId: number;
  password: string | null;
};

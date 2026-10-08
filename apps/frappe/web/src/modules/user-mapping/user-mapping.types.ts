export type LocalMappingUser = {
  id: number;
  uuid: string;
  name: string;
  email: string;
  status: string;
};

export type FrappeMappingUser = {
  frappeUserId: string;
  name: string;
  email: string;
  employeeCode: string | null;
};

export type UserMapping = {
  localUserId: number;
  frappeUserId: string;
  frappeEmail: string;
  employeeCode: string | null;
  connectionCurrent: boolean;
  verifiedAt: string;
};

export type UserMappingOverview = {
  localUsers: LocalMappingUser[];
  links: UserMapping[];
};

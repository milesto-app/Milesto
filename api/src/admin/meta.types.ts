export interface AdminMe {
  id: string;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
}

export interface AdminListEntry {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
}

export interface AdminListResponse {
  admins: AdminListEntry[];
}

export interface AdminRoleUpdate {
  id: string;
  email: string;
  role: string;
}

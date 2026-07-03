export type UserRole = 'client' | 'pro';

export interface User {
  id: string;
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: string;
}

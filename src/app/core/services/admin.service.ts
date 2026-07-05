import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, UserRole, UserStatus } from '../models/user.model';

export interface AdminStats {
  totalUsers: number;
  totalClients: number;
  totalPros: number;
  pendingApprovals: number;
  blockedUsers: number;
  totalBookings: number;
  totalReviews: number;
}

export interface AdminUsersFilter {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
}

export interface AdminUserDetail {
  user: User;
  worker: any | null;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/admin`;

  /** إحصائيات عامة للداشبورد */
  getStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.base}/stats`);
  }

  /** كل المستخدمين مع فلاتر اختيارية (role, status, search) */
  getUsers(filter?: AdminUsersFilter): Observable<User[]> {
    const params: Record<string, string> = {};
    if (filter?.role) params['role'] = filter.role;
    if (filter?.status) params['status'] = filter.status;
    if (filter?.search) params['search'] = filter.search;
    return this.http.get<User[]>(`${this.base}/users`, { params });
  }

  /** تفاصيل مستخدم واحد + بروفايل الصنايعي (لو pro) */
  getUserDetail(id: string): Observable<AdminUserDetail> {
    return this.http.get<AdminUserDetail>(`${this.base}/users/${id}`);
  }

  /** accept / reject / block / unblock */
  updateUserStatus(id: string, status: UserStatus): Observable<User> {
    return this.http.patch<User>(`${this.base}/users/${id}/status`, { status });
  }
}

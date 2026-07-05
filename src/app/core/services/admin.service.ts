import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, UserRole, UserStatus } from '../models/user.model';
import { Booking } from '../models/booking.model';
import { Review } from '../models/review.model';

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

  /**
   * كل الحجوزات في المنصة — للرقابة (read-only حاليًا).
   * ⚠️ ملاحظة: GET /bookings مش محمي بـ verifyAdmin على السيرفر حاليًا (endpoint عام
   * أصلاً مستخدم من صفحات الـ client/pro)، فمفيش فرق أمني حقيقي هنا لسه، بس منطقيًا
   * هي "بوابة الأدمن" للبيانات دي من ناحية الفرونت إند
   */
  getAllBookings(): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${environment.apiUrl}/bookings`).pipe(
      map((list) =>
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      )
    );
  }

  /** كل التقييمات في المنصة — لمراجعة/حذف أي تقييم مسيء (نفس ملاحظة الحجوزات فوق) */
  getAllReviews(): Observable<Review[]> {
    return this.http.get<Review[]>(`${environment.apiUrl}/reviews`).pipe(
      map((list) =>
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      )
    );
  }
}

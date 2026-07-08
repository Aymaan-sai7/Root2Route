import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, UserRole, UserStatus } from '../models/user.model';
import { Booking } from '../models/booking.model';
import { Review } from '../models/review.model';
import { Coupon, CreateCouponDto, UpdateCouponDto } from '../models/coupon.model';

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

  // ⚠️ جديد: مصدر واحد للحقيقة لعدد الطلبات المعلّقة، بيتشارك بين الصايدبار
  // وصفحة admin-registrations من غير ما محدش يحتاج يعمل refresh يدوي أو
  // request جديد لـ getStats() كل مرة يتغيّر فيها الرقم
  pendingApprovals = signal(0);

  /** إحصائيات عامة للداشبورد */
  getStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.base}/stats`);
  }

  /**
   * بينادي getStats() ويحدّث pendingApprovals تلقائيًا.
   * يستخدم في أول تحميل للصايدبار (fallback) وفي admin-dashboard لو محتاج.
   */
  refreshPendingApprovals(): void {
    this.getStats().subscribe({
      next: (stats) => this.pendingApprovals.set(stats.pendingApprovals),
    });
  }

  /** بينقص الرقم بواحد فورًا (بعد قبول/رفض/حظر) من غير أي request إضافي للسيرفر */
  decrementPendingApprovals(): void {
    this.pendingApprovals.update((n) => Math.max(0, n - 1));
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

  // ⚠️ جديد: بتتحدث من الـ WebSocket — رقم حقيقي جاي من السيرفر مباشرة
  setPendingApprovals(count: number): void {
    this.pendingApprovals.set(count);
  }

  // ══════════════════════════════════════════════════════════
  // إدارة الكوبونات — كل الـ endpoints دي محمية بـ verifyAdmin في السيرفر
  // ══════════════════════════════════════════════════════════

  /** كل الكوبونات (كل الحالات — شغالة وموقوفة ومنتهية)، للأدمن بس */
  getCoupons(): Observable<Coupon[]> {
    return this.http.get<Coupon[]>(`${this.base}/coupons`).pipe(
      map((list) =>
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      )
    );
  }

  /** إنشاء كوبون جديد */
  createCoupon(dto: CreateCouponDto): Observable<Coupon> {
    return this.http.post<Coupon>(`${this.base}/coupons`, dto);
  }

  /** تعديل كوبون (تغيير قيمة الخصم، إيقاف/تفعيل، إلخ) */
  updateCoupon(id: string, changes: UpdateCouponDto): Observable<Coupon> {
    return this.http.patch<Coupon>(`${this.base}/coupons/${id}`, changes);
  }

  /** حذف كوبون نهائيًا */
  deleteCoupon(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.base}/coupons/${id}`);
  }
}

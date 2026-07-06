import { inject, Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, map, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, UserRole } from '../models/user.model';

const STORAGE_KEY = 'sanaye3i_user';
const TOKEN_KEY = 'sanaye3i_token';

interface AuthResponse {
  user: User;
  token: string;
  worker?: any;
}

// ⚠️ payload التسجيل منفصل عن User model عمدًا — User بقى بيمثل "شكل البيانات
// الراجعة من السيرفر" بس (وعشان كده مفيهوش password خالص)، لكن الفرونت إند
// لازم يبعت password فعليًا وقت التسجيل، فمش منطقي نبني الـ payload بالـ
// Omit<User, ...> زي الأول
export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  nationalId: string;
  mobileNumber: string; // ⚠️ جديد
}

// ⚠️ التسجيل مبقاش بيرجع session token خالص — الحساب بيتعمل بـ status: 'pending' ولازم
// موافقة أدمن الأول قبل أي دخول فعلي، فمفيش "auto-login" بعد التسجيل تاني.
// docsUploadToken (لو pro) توكن مؤقت قصير العمر لرفع مستندات التحقق بس — مش session，
// لازم يتستخدم مرة واحدة هنا ويترمي، مش يتحفظ في أي storage
export interface RegisterPendingResponse {
  message: string;
  user: User;
  worker?: any;
  docsUploadToken?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http   = inject(HttpClient);
  private router = inject(Router);

  private currentUserSignal = signal<User | null>(this.loadFromStorage());

  currentUser = this.currentUserSignal.asReadonly();
  isLoggedIn  = computed(() => !!this.currentUserSignal());
  isClient    = computed(() => this.currentUserSignal()?.role === 'client');
  isPro       = computed(() => this.currentUserSignal()?.role === 'pro');
  isAdmin     = computed(() => this.currentUserSignal()?.role === 'admin');

  // ── Login ────────────────────────────────────────────────────
  // keepSignedIn = true (افتراضي) → localStorage (تفضل الجلسة بعد إغلاق المتصفح)
  // keepSignedIn = false           → sessionStorage (بتتمسح لما يتقفل التاب)
  // ⚠️ لو الحساب status !== 'active' (pending/blocked/rejected)، السيرفر بيرفض
  // بـ 403 ورسالة مناسبة، وبتوصل هنا زي أي error عادي من خلال catchError تحت
  login(email: string, password: string, keepSignedIn: boolean = true): Observable<User> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap((res) => this.setSession(res, keepSignedIn)),
        map((res) => res.user),
        catchError((err: HttpErrorResponse) => {
          const msg = err.error?.message ?? 'حصل خطأ، حاول تاني.';
          return throwError(() => new Error(msg));
        })
      );
  }

  // ── Register ─────────────────────────────────────────────────
  // عملية atomic في السيرفر: الـ user + بروفايل الصنايعي (لو pro) بيتكتبوا مع بعض.
  // الحساب بيتعمل status: 'pending' ومفيش أي تسجيل دخول تلقائي — لازم موافقة أدمن
  // الأول، فالكومبوننت اللي بينادي على الميثود دي محتاج يوجّه المستخدم لصفحة
  // "طلبك قيد المراجعة" بدل ما يعمل redirectAfterLogin()
  register(
    data: RegisterPayload,
    workerData?: any
  ): Observable<RegisterPendingResponse> {
    return this.http
      .post<RegisterPendingResponse>(`${environment.apiUrl}/auth/register`, {
        ...data,
        workerData,
      })
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const msg = err.error?.message ?? 'حصل خطأ، حاول تاني.';
          return throwError(() => new Error(msg));
        })
      );
  }

  // ── Forgot / Reset Password ─────────────────────────────────
  // ⚠️ الرد من السيرفر عام دايمًا (نفس الرسالة سواء الإيميل موجود ولا لأ)،
  // عشان محدش يقدر يتأكد مين مسجل عندنا من غيره
  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(`${environment.apiUrl}/auth/forgot-password`, { email })
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const msg = err.error?.message ?? 'حصل خطأ، حاول تاني.';
          return throwError(() => new Error(msg));
        })
      );
  }

  // token و email جايين من الـ query params في اللينك اللي وصل بالإيميل
  resetPassword(email: string, token: string, newPassword: string): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(`${environment.apiUrl}/auth/reset-password`, {
        email,
        token,
        newPassword,
      })
      .pipe(
        catchError((err: HttpErrorResponse) => {
          const msg = err.error?.message ?? 'حصل خطأ، حاول تاني.';
          return throwError(() => new Error(msg));
        })
      );
  }

  // ── Logout ───────────────────────────────────────────────────
  logout(): void {
    this.currentUserSignal.set(null);
    // بنمسح من المكانين مع بعض عشان نضمن مسح كامل بغض النظر فين كانت متخزنة
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  }

  // ── Redirect بعد login حسب الـ role ─────────────────────────
  redirectAfterLogin(): void {
    const user = this.currentUserSignal();
    if (!user) return;
    const target =
      user.role === 'admin' ? '/admin/dashboard' :
      user.role === 'pro'   ? '/pro/dashboard' :
      '/find-services';
    this.router.navigate([target]);
  }

  // ── Private helpers ──────────────────────────────────────────
  private setSession(res: AuthResponse, keepSignedIn: boolean): void {
    const storage = keepSignedIn ? localStorage : sessionStorage;
    this.currentUserSignal.set(res.user);
    storage.setItem(STORAGE_KEY, JSON.stringify(res.user));
    storage.setItem(TOKEN_KEY, res.token);
  }

  private loadFromStorage(): User | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }
}

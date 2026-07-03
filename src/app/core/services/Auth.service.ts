import { inject, Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, map, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';

const STORAGE_KEY = 'sanaye3i_user';
const TOKEN_KEY = 'sanaye3i_token';

interface AuthResponse {
  user: User;
  token: string;
  worker?: any;
}

export interface RegisterResult {
  user: User;
  worker?: any;
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

  // ── Login ────────────────────────────────────────────────────
  // keepSignedIn = true (افتراضي) → localStorage (تفضل الجلسة بعد إغلاق المتصفح)
  // keepSignedIn = false           → sessionStorage (بتتمسح لما يتقفل التاب)
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
  // عملية atomic في السيرفر: الـ user + بروفايل الصنايعي (لو pro) بيتكتبوا مع بعض
  // مفيش سيناريو "حساب يتيم" لإن الكتابة على db.json بتحصل مرة واحدة بس بعد
  // ما كل البيانات جاهزة في السيرفر
  register(
    data: Omit<User, 'id' | 'createdAt'>,
    workerData?: any
  ): Observable<RegisterResult> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/register`, {
        ...data,
        workerData,
      })
      .pipe(
        tap((res) => this.setSession(res, true)),
        map((res) => ({ user: res.user, worker: res.worker })),
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

  // ── Redirect بعد login/register حسب الـ role ────────────────
  redirectAfterLogin(): void {
    const user = this.currentUserSignal();
    if (!user) return;
    const target = user.role === 'pro' ? '/pro/dashboard' : '/find-services';
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

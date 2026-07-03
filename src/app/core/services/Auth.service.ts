import { inject, Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, map, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';

const STORAGE_KEY = 'sanaye3i_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http   = inject(HttpClient);
  private router = inject(Router);

  // الـ state الأساسي — بيتحمل من localStorage لو موجود
  private currentUserSignal = signal<User | null>(this.loadFromStorage());

  // ── Computed signals (للاستخدام في الـ components) ──────────
  currentUser = this.currentUserSignal.asReadonly();
  isLoggedIn  = computed(() => !!this.currentUserSignal());
  isClient    = computed(() => this.currentUserSignal()?.role === 'client');
  isPro       = computed(() => this.currentUserSignal()?.role === 'pro');

  // ── Login ────────────────────────────────────────────────────
  login(email: string, password: string): Observable<User> {
    return this.http
      .get<User[]>(`${environment.apiUrl}/users`, {
        params: { email },
      })
      .pipe(
        map((users) => {
          if (users.length === 0) {
            throw new Error('البريد الإلكتروني غلط.');
          }
          const user = users[0];
          if (user.password !== password) {
            throw new Error('كلمة المرور غلط.');
          }
          return user;
        }),
        tap((user) => this.setUser(user))
      );
  }

  // ── Register ─────────────────────────────────────────────────
  register(data: Omit<User, 'id' | 'createdAt'>): Observable<User> {
    // أول بنتأكد إن الإيميل مش موجود
    return this.http
      .get<User[]>(`${environment.apiUrl}/users`, {
        params: { email: data.email },
      })
      .pipe(
        // لو موجود، نرمي error ونوقف هنا
        map((existing) => {
          if (existing.length > 0) {
            throw new Error('البريد الإلكتروني ده مسجل بالفعل.');
          }
          return data;
        }),
        // نستنى POST يخلص فعلياً قبل ما نكمل (switchMap بدل nested subscribe)
        switchMap(() => {
          const newUser = {
            ...data,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
          };
          return this.http.post<User>(`${environment.apiUrl}/users`, newUser);
        }),
        // دلوقتي الـ user اتحفظ فعلياً في db.json، نسجله في الـ session
        tap((savedUser) => this.setUser(savedUser))
      );
  }

  // ── Logout ───────────────────────────────────────────────────
  logout(): void {
    this.currentUserSignal.set(null);
    localStorage.removeItem(STORAGE_KEY);
    this.router.navigate(['/login']);
  }

  // ── Redirect بعد login/register حسب الـ role ────────────────
  redirectAfterLogin(): void {
    const user = this.currentUserSignal();
    if (!user) return;
    const target = user.role === 'pro' ? '/pro/dashboard' : '/find-services';
    this.router.navigate([target]);
  }

  // ── Private helpers ──────────────────────────────────────────
  private setUser(user: User): void {
    this.currentUserSignal.set(user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }

  private loadFromStorage(): User | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }
}

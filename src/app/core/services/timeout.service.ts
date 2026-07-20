import { Injectable, inject, NgZone, effect } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from './Auth.service';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const SESSION_WARNING_MS = 60 * 1000;

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const;

@Injectable({ providedIn: 'root' })
export class IdleTimeoutService {
  private auth = inject(AuthService);
  private toastr = inject(ToastrService);
  private ngZone = inject(NgZone);

  private timerId: ReturnType<typeof setTimeout> | null = null;
  private warningTimerId: ReturnType<typeof setTimeout> | null = null;
  private listening = false;

  constructor() {
    effect(() => {
      if (this.auth.isLoggedIn()) {
        this.start();
      } else {
        this.stop();
      }
    });
  }

  private start(): void {
    if (this.listening) return;
    this.listening = true;

    this.ngZone.runOutsideAngular(() => {
      ACTIVITY_EVENTS.forEach((evt) =>
        document.addEventListener(evt, this.resetTimer, { passive: true })
      );
    });

    this.resetTimer();
  }

  private stop(): void {
    if (!this.listening) return;
    this.listening = false;

    ACTIVITY_EVENTS.forEach((evt) =>
      document.removeEventListener(evt, this.resetTimer)
    );

    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.warningTimerId) {
      clearTimeout(this.warningTimerId);
      this.warningTimerId = null;
    }
  }

  private resetTimer = (): void => {
    this.stop();
    this.listening = true;

    this.timerId = setTimeout(() => this.handleTimeout(), IDLE_TIMEOUT_MS);
    this.warningTimerId = setTimeout(() => this.showWarning(), IDLE_TIMEOUT_MS - SESSION_WARNING_MS);
  };

  private showWarning(): void {
    this.ngZone.run(() => {
      this.toastr.warning('ستنتهي الجلسة خلال دقيقة واحدة بسبب عدم النشاط.', 'تنبيه');
    });
  }

  private handleTimeout(): void {
    this.stop();

    this.ngZone.run(() => {
      this.toastr.info('تم تسجيل خروجك تلقائيًا لعدم النشاط لفترة طويلة.', 'انتهت الجلسة');
      this.auth.logout();
    });
  }
}

import { Injectable, signal } from '@angular/core';

/**
 * State بسيط جدًا بيتشارك بين admin-header (زرار الفتح) و admin-sidebar (الدرج نفسه)
 * عشان الاتنين يفضلوا مستقلين عن بعض (محدش بينادي على التاني مباشرة)
 */
@Injectable({ providedIn: 'root' })
export class AdminUiService {
  mobileNavOpen = signal(false);

  toggle(): void {
    this.mobileNavOpen.update((v) => !v);
  }

  close(): void {
    this.mobileNavOpen.set(false);
  }
}

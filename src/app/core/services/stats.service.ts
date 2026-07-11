import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
// ⚠️ افتراض: الباث ده بيطابق باقي السيرفسز عندك (زي workers.service.ts) اللي
// بتستخدم environment.apiUrl. لو الباث الحقيقي لملف environment.ts مختلف عندك،
// غيّر السطر ده بس — الباقي مش هيتأثر.
import { environment } from '../../../environments/environment';
import { PublicStats } from '../models/stats.model';

@Injectable({ providedIn: 'root' })
export class StatsService {
  private http = inject(HttpClient);

  // ⚠️ shareReplay(1) بيخلي أي كومبوننت تاني في نفس تحميل الصفحة (hero,
  // services-grid, dual-cta, trust-strip) ياخد نفس البيانات من غير ما يعمل
  // HTTP request جديد لكل واحد لوحده — طلب واحد بس يتبعت فعليًا للسيرفر
  private publicStats$: Observable<PublicStats> | null = null;

  getPublicStats(): Observable<PublicStats> {
    if (!this.publicStats$) {
      this.publicStats$ = this.http
        .get<PublicStats>(`${environment.apiUrl}/stats/public`)
        .pipe(shareReplay(1));
    }
    return this.publicStats$;
  }
}

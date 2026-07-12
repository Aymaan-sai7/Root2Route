import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { StatsService } from '../../../../../core/services/stats.service';
import { PublicStats } from '../../../../../core/models/stats.model';

interface TrustBadge {
  label: string;
}

@Component({
  selector: 'app-trust-strip',
  standalone: true,
  imports: [],
  templateUrl: './trust-strip.component.html',
  styleUrl: './trust-strip.component.css'
})
export class TrustStripComponent {
  private statsService = inject(StatsService);

  private stats = toSignal<PublicStats | null>(this.statsService.getPublicStats(), {
    initialValue: null,
  });

  //  بنقرّب العدد لأسفل لأقرب 100 (مثلاً 2450 → 2400) عشان يفضل شكله
  // تسويقي "أكتر من X" ومايتغيّرش بشكل ملحوظ كل ما عميل جديد يتسجل
  private trustedCount = computed(() => {
    const total = this.stats()?.totalClients;
    if (!total || total < 100) return 2000;
    return Math.floor(total / 100) * 100;
  });

  //  toLocaleString('ar-EG') بيحوّل الرقم لأرقام هندية عربية (٢٤٠٠ بدل 2400)
  // تلقائيًا، بالظبط زي الشكل الأصلي "٢٠٠٠" اللي كان متكتوب يدوي في الـ HTML
  trustedCountFormatted = computed(() => this.trustedCount().toLocaleString('ar-EG'));

  badges: TrustBadge[] = [
    { label: 'هويات متأكد منها' },
    { label: 'شغل بضمان' },
    { label: 'دعم على مدار الساعة' },
    { label: 'فلوسك مضمونة' },
    { label: 'فحص أمان شامل' },
    { label: 'صنايعية مرخصين' },
  ];
}

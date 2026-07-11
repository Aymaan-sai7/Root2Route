import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ScrollRevealDirective } from '../../../../../shared/directive/scroll-reveal.directive';
import { CountUpDirective } from '../../../../../shared/directive/count-up.directive';
import { StatsService } from '../../../../../core/services/stats.service';
import { PublicStats } from '../../../../../core/models/stats.model';

@Component({
  selector: 'app-dual-cta',
  standalone: true,
  imports: [RouterLink, ScrollRevealDirective, CountUpDirective],
  templateUrl: './dual-cta.component.html',
  styleUrl: './dual-cta.component.css',
})
export class DualCtaComponent {
  private statsService = inject(StatsService);

  private stats = toSignal<PublicStats | null>(this.statsService.getPublicStats(), {
    initialValue: null,
  });

  clientAvatars = [
    { initial: 'س', color: '#1B4F72' },
    { initial: 'م', color: '#E8762C' },
    { initial: 'ن', color: '#3F7A52' },
    { initial: 'ك', color: '#7A5FA0' },
  ];

  // ⚠️ كل computed تحت بيرجع رقم احتياطي (نفس الأرقام الأصلية) لحد ما رد
  // السيرفر يوصل، عشان appCountUp يبدأ بقيمة معقولة مش صفر
  clientsThisWeek = computed(() => this.stats()?.clientsThisWeek ?? 850);
  activeWorkersNow = computed(() => this.stats()?.activeWorkersNow ?? 146);
  totalWorkers = computed(() => this.stats()?.totalWorkers ?? 1400);
  avgMonthlyIncome = computed(() => this.stats()?.avgMonthlyIncome ?? 4200);

  // ⚠️ "متوسط استجابة 45 دقيقة" سيبناه ثابت في الـ HTML عمدًا — مفيش حقل
  // في الـ Booking بيسجل وقت رد الصنايعي فعليًا (زي acceptedAt)، فمفيش
  // طريقة نحسبه من بيانات حقيقية دلوقتي. لو حابب رقم حقيقي هنا، محتاجين
  // نضيف tracking جديد في السيرفر الأول (تفاصيل في تعليق server.js).
}

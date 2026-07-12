import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TradeIconComponent, TradeIconName } from '../../../../../shared/components/trade-icon/trade-icon.component';
import { ScrollRevealDirective } from '../../../../../shared/directive/scroll-reveal.directive';
import { StatsService } from '../../../../../core/services/stats.service';
import { PublicStats } from '../../../../../core/models/stats.model';

interface ServiceCategory {
  id: string;
  icon: TradeIconName;
  title: string;
  desc: string;
  proCount: string;
  featured?: boolean;
}

//  أرقام احتياطية بتظهر بس وقت اللودينج أو لو حصل خطأ في طلب الإحصائيات —
// مش أرقام وهمية بتتعرض دايمًا، مجرد fallback عشان السكشن ميبانش فاضي
const FALLBACK_COUNTS: Record<string, number> = {
  electrical: 320,
  plumbing: 210,
  carpentry: 180,
  painting: 150,
  ac: 95,
  more: 140,
};

@Component({
  selector: 'app-services-grid',
  standalone: true,
  imports: [RouterLink, TradeIconComponent, ScrollRevealDirective],
  templateUrl: './services-grid.component.html',
  styleUrl: './services-grid.component.css'
})
export class ServicesGridComponent {
  private statsService = inject(StatsService);

  private stats = toSignal<PublicStats | null>(this.statsService.getPublicStats(), {
    initialValue: null,
  });

  private baseCategories: Omit<ServiceCategory, 'proCount'>[] = [
    { id: 'electrical', icon: 'electric', title: 'كهربا', desc: 'لوحات، أسلاك، إنارة، وفحص أمان شامل لبيتك أو محلك.', featured: true },
    { id: 'plumbing', icon: 'plumbing', title: 'سباكة', desc: 'من تسريب الحنفية لتركيب المواسير بالكامل.' },
    { id: 'carpentry', icon: 'carpentry', title: 'نجارة', desc: 'موبيليا، أرفف، وتفصيل على المساحة.' },
    { id: 'painting', icon: 'painting', title: 'نقاشة', desc: 'لمسة نهائية نضيفة لأي حيطة أو سقف.' },
    { id: 'ac', icon: 'ac', title: 'تكييف وتبريد', desc: 'تركيب، صيانة دورية، وتصليح أعطال.' },
    { id: 'more', icon: 'more', title: 'وكمان...', desc: 'نقل عفش، تنظيف، وصيانة عامة.' },
  ];

  //  كارت "وكمان..." بيمثل تخصصات مجمّعة (تنظيف + نقل عفش + حدادة وألوميتال
  // + أي تخصص مخصص "other") مش trade واحد له slug مباشر، فبنجمعهم يدويًا هنا
  private countForCategory(id: string): number {
    const byTrade = this.stats()?.workersByTrade;
    if (!byTrade) return FALLBACK_COUNTS[id] ?? 0;

    if (id === 'more') {
      return (
        (byTrade['cleaning'] ?? 0) +
        (byTrade['moving'] ?? 0) +
        (byTrade['metalwork'] ?? 0) +
        (byTrade['other'] ?? 0)
      );
    }
    return byTrade[id] ?? 0;
  }

  categories = computed<ServiceCategory[]>(() => {
    // بننادي stats() هنا عشان الـ computed يعيد حساب نفسه لما البيانات توصل
    // من السيرفر (بعد ما كانت null وقت اللودينج الأول)
    this.stats();

    return this.baseCategories.map((cat) => {
      const realCount = this.countForCategory(cat.id);
      const count = realCount > 0 ? realCount : FALLBACK_COUNTS[cat.id] ?? 0;
      const suffix = cat.featured ? 'صنايعي متاح' : 'صنايعي';
      return {
        ...cat,
        proCount: `+${count} ${suffix}`,
      };
    });
  });
}

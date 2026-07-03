import { Component, signal } from '@angular/core';
import {
  trigger,
  state,
  style,
  transition,
  animate,
} from '@angular/animations';
import { ScrollRevealDirective } from '../../../../../shared/directive/scroll-reveal.directive';
import { CountUpDirective } from '../../../../../shared/directive/count-up.directive';

interface WhyPoint {
  id: string;
  icon: 'verified' | 'price' | 'guarantee' | 'speed';
  title: string;
  desc: string;
  detail: string;
  stat: number;
  statSuffix: string;
  statLabel: string;
}

@Component({
  selector: 'app-why-sanaye3i',
  standalone: true,
  imports: [ScrollRevealDirective, CountUpDirective],
  templateUrl: './why-sanaye3i.component.html',
  styleUrl: './why-sanaye3i.component.css',
  animations: [
    /* === فتح/قفل الفوكس كارد === */
    trigger('cardWidth', [
      state('active',   style({ flex: '2.4' })),
      state('inactive', style({ flex: '1' })),
      transition('active <=> inactive', animate('380ms cubic-bezier(0.4, 0, 0.2, 1)')),
    ]),

    /* === ظهور/اختفاء تفاصيل الفوكس كارد === */
    trigger('detailReveal', [
      state('show', style({ opacity: 1, height: '*',    marginTop: '14px' })),
      state('hide', style({ opacity: 0, height: '0px', marginTop: '0px'  })),
      transition('show <=> hide', animate('250ms ease')),
    ]),

    /*
     * === أنيميشن كارتين المقارنة ===
     *
     * الكارتين بيتحركوا للوسط (نحو بعض) لما بيتقفلوا،
     * وبيرجعوا لمكانهم الأصلي يمين وشمال لما بيتفتحوا.
     *
     * مهم: الـ --slide-from بيتحدد في الـ HTML لكل كارت على حدة:
     *   كارت "من غير صنايعي" → style="--slide-from: 60px"  (بيتحرك للشمال)
     *   كارت "مع صنايعي"     → style="--slide-from: -60px" (بيتحرك لليمين)
     *
     * بالشكل ده الكارتين بيفترقوا عن الوسط لما يتفتحوا، وبيلتموا
     * على VS لما يتقفلوا.
     */
    trigger('slideCard', [
      state(
        'closed',
        style({
          opacity: 0,
          transform: 'translateX(var(--slide-from, 60px))',
          pointerEvents: 'none',
        })
      ),
      state(
        'open',
        style({
          opacity: 1,
          transform: 'translateX(0)',
          pointerEvents: 'auto',
        })
      ),
      transition(
        'closed => open',
        animate('480ms cubic-bezier(0.16, 1, 0.3, 1)')
      ),
      transition(
        'open => closed',
        animate('320ms cubic-bezier(0.7, 0, 0.84, 0)')
      ),
    ]),
  ],
})
export class WhySanaye3iComponent {
  points: WhyPoint[] = [
  {
    id: 'verified',
    icon: 'verified',
    title: 'صنايعية متأكد منهم',
    desc: 'كل الصنايعية متراجع عليهم.',
    detail:
      'قبل أي صنايعي يشتغل على التطبيق، بنتأكد من بياناته وخبرته عشان تتعامل مع حد موثوق.',
    stat: 100,
    statSuffix: '%',
    statLabel: 'بيانات متراجعة',
  },
  {
    id: 'price',
    icon: 'price',
    title: 'السعر واضح',
    desc: 'بتعرف هتدفع كام من الأول.',
    detail:
      'قبل ما تأكد الطلب هتشوف تكلفة تقريبية، يعني مفيش كلام يتغير بعد ما الشغل يخلص.',
    stat: 0,
    statSuffix: '',
    statLabel: 'مصاريف زيادة',
  },
  {
    id: 'guarantee',
    icon: 'guarantee',
    title: 'ضمان على الشغل',
    desc: 'حقك محفوظ لو حصل أي مشكلة.',
    detail:
      'لو فيه أي حاجة بعد الشغل، تقدر تكلمنا وهنساعدك لحد ما المشكلة تتحل.',
    stat: 100,
    statSuffix: '%',
    statLabel: 'دعم بعد الخدمة',
  },
  {
    id: 'speed',
    icon: 'speed',
    title: 'رد سريع',
    desc: 'تلاقي صنايعي في أسرع وقت.',
    detail:
      'بنوصلك بأقرب صنايعي متاح، عشان متفضلش مستني كتير.',
    stat: 45,
    statSuffix: ' دقيقة',
    statLabel: 'متوسط الوصول',
  },
];

  activeId = signal<string>('verified');
  comparisonOpen = signal(false);

  setActive(id: string): void {
    this.activeId.set(id);
  }

  toggleComparison(): void {
    this.comparisonOpen.update((v) => !v);
  }
}

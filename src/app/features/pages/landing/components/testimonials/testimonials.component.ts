import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { ScrollRevealDirective } from '../../../../../shared/directive/scroll-reveal.directive';

interface Testimonial {
  name: string;
  initial: string;
  color: string;
  service: string;
  rating: number;
  quote: string;
}

@Component({
  selector: 'app-testimonials',
  standalone: true,
  imports: [ScrollRevealDirective],
  templateUrl: './testimonials.component.html',
  styleUrl: './testimonials.component.css',
  animations: [
    trigger('cardSwap', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(16px) scale(0.985)' }),
        animate(
          '450ms cubic-bezier(0.16, 1, 0.3, 1)',
          style({ opacity: 1, transform: 'translateY(0) scale(1)' })
        ),
      ]),
      transition(':leave', [
        animate(
          '260ms cubic-bezier(0.7, 0, 0.84, 0)',
          style({ opacity: 0, transform: 'translateY(-12px) scale(0.99)' })
        ),
      ]),
    ]),
  ],
})
export class TestimonialsComponent implements OnInit, OnDestroy {
  testimonials: Testimonial[] = [
  {
    name: 'محمد حسن',
    initial: 'م',
    color: '#1B4F72',
    service: 'سباكة',
    rating: 5,
    quote:
      'الصنايعي وصل في المعاد، خلص الشغل بسرعة، وكان محترم جدًا. أكيد هستخدم التطبيق تاني لو احتجت أي حاجة.',
  },
  {
    name: 'أحمد السيد',
    initial: 'أ',
    color: '#E8762C',
    service: 'كهرباء',
    rating: 5,
    quote:
      'عجبني إن السعر كان واضح من الأول، ومفيش أي مصاريف زيادة بعد ما الشغل خلص.',
  },
  {
    name: 'سارة محمد',
    initial: 'س',
    color: '#3F7A52',
    service: 'نقاشة',
    rating: 4,
    quote:
      'حجزت من التطبيق لأول مرة، والتجربة كانت سهلة جدًا، والشغل طلع أنضف من اللي كنت متوقعاه.',
  },
  {
    name: 'محمود علي',
    initial: 'م',
    color: '#7A5FA0',
    service: 'تكييف',
    rating: 5,
    quote:
      'التكييف كان واقف خالص، والصنايعي عرف المشكلة بسرعة وخلصها في نفس الزيارة.',
  },
  {
    name: 'منة الله',
    initial: 'م',
    color: '#123550',
    service: 'نجارة',
    rating: 5,
    quote:
      'ركبلي مكتبة وحرفيًا الشغل كان نضيف جدًا، وحتى بعد ما خلص ساب المكان مترتب.',
  },
  {
    name: 'عبدالله خالد',
    initial: 'ع',
    color: '#C05621',
    service: 'تركيب دش',
    rating: 5,
    quote:
      'كنت محتاج حد بشكل مستعجل، ولقيت صنايعي قريب مني وجالي في أقل من ساعة.',
  },
  {
    name: 'نور أحمد',
    initial: 'ن',
    color: '#2563EB',
    service: 'تنظيف خزانات',
    rating: 5,
    quote:
      'التطبيق سهل جدًا، وعرفت أقارن بين أكتر من صنايعي واختارت اللي تقييمه أعلى.',
  },
  {
    name: 'إبراهيم سعيد',
    initial: 'إ',
    color: '#059669',
    service: 'صيانة غسالة',
    rating: 4,
    quote:
      'الصيانة تمت في نفس اليوم، والصنايعي شرحلي سبب العطل وإزاي أتجنبه بعد كده.',
  }
];

  /** الـ index الحالي */
  activeIndex = signal(0);

  /** مدة كل كارد بالـ ms */
  readonly stepDuration = 4500;

  /** إيقاف مؤقت لما المستخدم يتفاعل */
  paused = signal(false);

  private intervalId?: ReturnType<typeof setInterval>;
  private pauseTimeoutId?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.startInterval();
  }

  ngOnDestroy(): void {
    this.clearInterval();
    if (this.pauseTimeoutId) clearTimeout(this.pauseTimeoutId);
  }

  /** الانتقال اليدوي عند دوس على نقطة */
  goTo(idx: number): void {
    this.activeIndex.set(idx);
    /* وقف مؤقت ٨ ثواني بعد التفاعل اليدوي */
    this.pauseFor(8000);
  }

  /** ==================== Private ==================== */

  private startInterval(): void {
    this.intervalId = setInterval(() => {
      if (!this.paused()) {
        this.activeIndex.update(
          (current) => (current + 1) % this.testimonials.length
        );
      }
    }, this.stepDuration);
  }

  private clearInterval(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private pauseFor(ms: number): void {
    this.paused.set(true);
    if (this.pauseTimeoutId) clearTimeout(this.pauseTimeoutId);
    this.pauseTimeoutId = setTimeout(() => {
      this.paused.set(false);
    }, ms);
  }
}

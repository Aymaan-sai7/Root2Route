import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { ScrollRevealDirective } from '../../../../../shared/directive/scroll-reveal.directive';

interface Step {
  number: string;
  title: string;
  desc: string;
  icon: 'search' | 'calendar' | 'shield';
}

@Component({
  selector: 'app-how-it-works',
  standalone: true,
  imports: [ScrollRevealDirective],
  templateUrl: './how-it-works.component.html',
  styleUrl: './how-it-works.component.css'
})
export class HowItWorksComponent implements OnInit, OnDestroy {
  steps: Step[] = [
    { number: '01', title: 'تحدد المشكلة', desc: 'اكتب احتياجك وحدد الميعاد المناسب لك.', icon: 'search' },
    { number: '02', title: 'تختار الصنايعي', desc: 'قارن بين العروض والتقييمات واختار اللي يناسبك.', icon: 'calendar' },
    { number: '03', title: 'الشغل يتم بضمان', desc: 'تدفع بس لما تكون راضي ١٠٠٪ عن الشغل.', icon: 'shield' },
  ];

  activeIndex = signal(0);
  arrowPulsing = signal(false);

  private readonly STEP_DURATION = 3500;
  private readonly PULSE_DURATION = 400;
  private readonly RESUME_DELAY = 5000; // بعد تفاعل يدوي، نستأنف التلقائي بعد 5 ثواني

  private intervalId?: ReturnType<typeof setInterval>;
  private resumeTimeoutId?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.startAutoPlay();
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
    if (this.resumeTimeoutId) {
      clearTimeout(this.resumeTimeoutId);
    }
  }

  goNext(): void {
    this.advanceStep(1);
    this.restartAutoPlayAfterManualAction();
  }

  goPrev(): void {
    this.advanceStep(-1);
    this.restartAutoPlayAfterManualAction();
  }

  goTo(index: number): void {
    this.activeIndex.set(index);
    this.restartAutoPlayAfterManualAction();
  }

  private advanceStep(direction: 1 | -1): void {
    const total = this.steps.length;
    this.activeIndex.update((current) => (current + direction + total) % total);
  }

  private startAutoPlay(): void {
    this.intervalId = setInterval(() => {
      this.arrowPulsing.set(true);

      setTimeout(() => {
        this.advanceStep(1);
        this.arrowPulsing.set(false);
      }, this.PULSE_DURATION);

    }, this.STEP_DURATION);
  }

  private stopAutoPlay(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private restartAutoPlayAfterManualAction(): void {
    // نوقف التلقائي فورًا وقت التفاعل اليدوي
    this.stopAutoPlay();
    this.arrowPulsing.set(false);

    // ونستأنفه تاني بعد فترة قصيرة من عدم التفاعل
    if (this.resumeTimeoutId) {
      clearTimeout(this.resumeTimeoutId);
    }
    this.resumeTimeoutId = setTimeout(() => {
      this.startAutoPlay();
    }, this.RESUME_DELAY);
  }
}

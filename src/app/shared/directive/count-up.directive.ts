import { Directive, ElementRef, Input, OnInit, inject } from '@angular/core';

@Directive({
  selector: '[appCountUp]',
  standalone: true
})
export class CountUpDirective implements OnInit {
  @Input('appCountUp') targetValue = 0;
  @Input() countUpSuffix = '';
  @Input() countUpDuration = 1200;

  private el = inject(ElementRef<HTMLElement>);

  ngOnInit(): void {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.runCount();
            observer.unobserve(this.el.nativeElement);
          }
        });
      },
      { threshold: 0.4 }
    );
    observer.observe(this.el.nativeElement);
  }

  private runCount(): void {
    const start = performance.now();
    const from = 0;
    const to = this.targetValue;

    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / this.countUpDuration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = Math.round(from + (to - from) * eased);

      this.el.nativeElement.textContent = `${current}${this.countUpSuffix}`;

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }
}

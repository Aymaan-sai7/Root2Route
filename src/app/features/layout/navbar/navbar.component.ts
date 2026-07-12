import {
  Component,
  signal,
  HostListener,
  ElementRef,
  Renderer2,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
  animations: [
    trigger('overlayFade', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('220ms ease-out', style({ opacity: 1 })),
      ]),
      transition(':leave', [animate('180ms ease-in', style({ opacity: 0 }))]),
    ]),
    trigger('panelSlide', [
      transition(':enter', [
        style({ transform: 'translateY(-14px)', opacity: 0 }),
        animate(
          '300ms cubic-bezier(0.16, 1, 0.3, 1)',
          style({ transform: 'translateY(0)', opacity: 1 })
        ),
      ]),
      transition(':leave', [
        animate(
          '200ms cubic-bezier(0.7, 0, 0.84, 0)',
          style({ transform: 'translateY(-14px)', opacity: 0 })
        ),
      ]),
    ]),
    trigger('staggerLinks', [
      transition(':enter', [
        query(
          '.mnav-link',
          [
            style({ opacity: 0, transform: 'translateX(10px)' }),
            stagger(50, [
              animate(
                '280ms cubic-bezier(0.16, 1, 0.3, 1)',
                style({ opacity: 1, transform: 'translateX(0)' })
              ),
            ]),
          ],
          { optional: true }
        ),
      ]),
    ]),
  ],
})
export class NavbarComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mobileMenuRoot') mobileMenuRoot?: ElementRef<HTMLElement>;

  private renderer = inject(Renderer2);

  mobileOpen = signal(false);
  showNavbar = signal(true);

  private lastScroll = 0;
  private readonly threshold = 15;

  @HostListener('window:scroll')
  onScroll(): void {
    const current = window.scrollY;
    if (Math.abs(current - this.lastScroll) < this.threshold) return;
    if (current <= 60) {
      this.showNavbar.set(true);
    } else if (current > this.lastScroll) {
      this.showNavbar.set(false);
    } else {
      this.showNavbar.set(true);
    }
    this.lastScroll = current;
  }

  //  جديد: يقفل المنيو تلقائيًا لو الشاشة رجعت md+ وهو لسه فاتح
  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth >= 768 && this.mobileOpen()) {
      this.closeMobile();
    }
  }

  //  جديد: زرار Escape يقفل المنيو
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.mobileOpen()) this.closeMobile();
  }

  ngAfterViewInit(): void {
    //  بننقل المنيو لـ document.body مرة واحدة — نفس مبدأ client-navbar
    // بتاع باقي المشروع، عشان الهيدر عليه transition-transform (لإخفائه
    // عند السكرول) وده بيعمل containing block لأي عنصر fixed جواه
    if (this.mobileMenuRoot) {
      this.renderer.appendChild(document.body, this.mobileMenuRoot.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.renderer.removeClass(document.body, 'mnav-scroll-lock');
    const el = this.mobileMenuRoot?.nativeElement;
    if (el?.parentNode) {
      el.parentNode.removeChild(el);
    }
  }

  toggleMobile(): void {
    this.mobileOpen.update((v) => !v);
    this.syncBodyScrollLock();
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
    this.syncBodyScrollLock();
  }

  private syncBodyScrollLock(): void {
    if (this.mobileOpen()) {
      this.renderer.addClass(document.body, 'mnav-scroll-lock');
    } else {
      this.renderer.removeClass(document.body, 'mnav-scroll-lock');
    }
  }
}

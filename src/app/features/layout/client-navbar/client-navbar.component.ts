import {
  Component, inject, OnInit, OnDestroy, AfterViewInit,
  signal, HostListener, Renderer2, ViewChild, ElementRef,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/Auth.service';
import { MessagesService } from '../../../core/services/messages.service';
import { ConversationListItem } from '../../../core/models/conversation.model';
import { NotificationComponent } from '../../../shared/notification/notification.component';

@Component({
  selector: 'app-client-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NotificationComponent],
  templateUrl: './client-navbar.component.html',
  styleUrl: './client-navbar.component.css',
})
export class ClientNavbarComponent implements OnInit, AfterViewInit, OnDestroy {
  auth = inject(AuthService);
  private messagesService = inject(MessagesService);
  private router = inject(Router);
  private renderer = inject(Renderer2);

  // الـ wrapper اللي فيه الـ backdrop والـ drawer — هننقله لـ body فعليًا
  @ViewChild('navPortal') navPortal?: ElementRef<HTMLElement>;

  mobileOpen      = signal(false);
  dropdownOpen    = signal(false);
  messagesOpen    = signal(false);
  unreadCount     = signal(0);
  conversations   = signal<ConversationListItem[]>([]);
  loadingMessages = signal(false);

  // ── Hide-on-scroll-down / show-on-scroll-up ─────────────────
  showNavbar = signal(true);
  private lastScroll = 0;
  private readonly scrollThreshold = 15;
  private pollingInterval?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.refreshUnreadCount();
    this.pollingInterval = setInterval(() => this.refreshUnreadCount(), 15000);

    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.closeMobile());
  }

  ngAfterViewInit(): void {
    //  الخطوة الأساسية: ننقل الـ backdrop + الـ drawer عشان يبقوا أطفال
    // مباشرين لـ <body> بره أي جد ممكن يكون عنده transform/will-change/filter
    // وبيكسر containing block بتاعة position:fixed (السبب الحقيقي لمشكلة
    // ظهور الـ drawer في نص الصفحة بدل ما يبقى ثابت بالنسبة للشاشة كلها)
    if (this.navPortal) {
      this.renderer.appendChild(document.body, this.navPortal.nativeElement);
    }
  }

  ngOnDestroy(): void {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    this.renderer.setStyle(document.body, 'overflow', '');

    // لازم نشيل العنصر يدويًا من body وقت تدمير الكومبوننت،
    // وإلا هيفضل عالق فيها لو الراوت اتغير
    if (this.navPortal?.nativeElement?.parentNode === document.body) {
      this.renderer.removeChild(document.body, this.navPortal.nativeElement);
    }
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (this.mobileOpen()) return;
    const current = window.scrollY;
    if (Math.abs(current - this.lastScroll) < this.scrollThreshold) return;
    if (current <= 60) {
      this.showNavbar.set(true);
    } else if (current > this.lastScroll) {
      this.showNavbar.set(false);
      this.dropdownOpen.set(false);
      this.messagesOpen.set(false);
    } else {
      this.showNavbar.set(true);
    }
    this.lastScroll = current;
  }

  private refreshUnreadCount(): void {
    const user = this.auth.currentUser();
    if (!user) return;
    this.messagesService.getUnreadCount(user.id).subscribe({
      next: (count) => this.unreadCount.set(count),
    });
  }

  // ── الدرج (Drawer) على الموبايل ──────────────────────────────
  openMobile(): void {
    this.mobileOpen.set(true);
    // استخدمنا setStyle مباشر بدل class عشان overflow:hidden على body —
    // كلاسات CSS بتاعة Angular بتكون scoped جوه كل كومبوننت، فكلاس زي
    // 'sl-no-scroll' اللي معرّف في كومبوننت تاني (specialists-list) ماكانش
    // هيتطبق فعليًا على body لما نضيفه من هنا. الطريقة دي أضمن 100%.
    this.renderer.setStyle(document.body, 'overflow', 'hidden');
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
    this.messagesOpen.set(false);
    this.renderer.setStyle(document.body, 'overflow', '');
  }

  toggleMobile(): void {
    this.mobileOpen() ? this.closeMobile() : this.openMobile();
  }

  toggleDropdown(): void {
    this.dropdownOpen.update((v) => !v);
    this.messagesOpen.set(false);
  }

  closeDropdown(): void {
    this.dropdownOpen.set(false);
  }

  toggleMessages(): void {
    this.messagesOpen.update((v) => !v);
    this.dropdownOpen.set(false);
    if (this.messagesOpen()) this.loadConversations();
  }

  closeMessages(): void {
    this.messagesOpen.set(false);
  }

  private loadConversations(): void {
    const user = this.auth.currentUser();
    if (!user) return;
    this.loadingMessages.set(true);
    this.messagesService.getClientConversations(user.id).subscribe({
      next: (list) => {
        this.conversations.set(list);
        this.loadingMessages.set(false);
      },
      error: () => this.loadingMessages.set(false),
    });
  }

  openConversation(conv: ConversationListItem): void {
    this.closeMobile();
    this.router.navigate(['/messages', conv.otherId], {
      queryParams: { name: conv.otherName, color: conv.otherColor },
    });
    this.refreshUnreadCount();
  }

  logout(): void {
    this.closeMobile();
    this.auth.logout();
  }
}

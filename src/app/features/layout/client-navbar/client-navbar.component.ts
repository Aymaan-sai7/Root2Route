import { Component, inject, OnInit, OnDestroy, signal, HostListener, Renderer2 } from '@angular/core';
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
export class ClientNavbarComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  private messagesService = inject(MessagesService);
  private router = inject(Router);
  private renderer = inject(Renderer2);

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

    // قفل الدرج تلقائيًا لو المستخدم نقل صفحة
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.closeMobile());
  }

  ngOnDestroy(): void {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    this.renderer.removeClass(document.body, 'sl-no-scroll');
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
    this.renderer.addClass(document.body, 'sl-no-scroll');
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
    this.messagesOpen.set(false);
    this.renderer.removeClass(document.body, 'sl-no-scroll');
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

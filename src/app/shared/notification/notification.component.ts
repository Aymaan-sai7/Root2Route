import { Component, DestroyRef, ElementRef, HostListener, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

import { NotificationsService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/Auth.service';
import { Notification } from '../../core/models/notification.model';
import { timeAgo } from '../../core/utils/time.util';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.css',
})
export class NotificationComponent implements OnInit {
  private notificationsService = inject(NotificationsService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private elRef = inject(ElementRef);
  private destroyRef = inject(DestroyRef);

    @Input() variant: 'dropdown' | 'inline' = 'dropdown';
  @Input() label = 'الإشعارات';

  isOpen = signal(false);
  notifications = signal<Notification[]>([]);
  loading = signal(false);

  unreadCount = this.notificationsService.unreadCount;

  private get userId(): string | undefined {
    //  غيّرها لو الشكل الفعلي لـ currentUser() مختلف عندك
    return this.auth.currentUser()?.id;
  }

  ngOnInit(): void {
    this.refreshCount();
    // بولينج كل 10 ثواني عشان الـ badge — نفس فلسفة نظام الرسائل (4-15 ثانية)
    interval(10000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshCount());
  }

  private refreshCount(): void {
    if (this.userId) this.notificationsService.refreshUnreadCount(this.userId);
  }

  toggle(): void {
    this.isOpen.update((v) => !v);
    if (this.isOpen() && this.userId) {
      this.loading.set(true);
      this.notificationsService.getForUser(this.userId).subscribe({
        next: (list) => {
          this.notifications.set(list);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  onItemClick(notification: Notification): void {
    if (!notification.isRead) {
      this.notificationsService.markAsRead(notification.id).subscribe(() => {
        this.notifications.update((list) =>
          list.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
        );
        this.refreshCount();
      });
    }
    this.isOpen.set(false);
    if (notification.link) this.router.navigateByUrl(notification.link);
  }

  markAllRead(): void {
    if (!this.userId) return;
    this.notificationsService.markAllAsRead(this.userId).subscribe(() => {
      this.notifications.update((list) => list.map((n) => ({ ...n, isRead: true })));
      this.refreshCount();
    });
  }

  timeAgo(date: string): string {
    return timeAgo(date);
  }
}

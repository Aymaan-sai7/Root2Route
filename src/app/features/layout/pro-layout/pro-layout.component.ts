import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/Auth.service';
import { MessagesService } from '../../../core/services/messages.service';
import { NotificationComponent } from '../../../shared/notification/notification.component'; // ← جديد

@Component({
  selector: 'app-pro-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NotificationComponent], // ← جديد
  templateUrl: './pro-layout.component.html',
  styleUrl: './pro-layout.component.css',
})
export class ProLayoutComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private messagesService = inject(MessagesService);
  unreadCount = signal(0);
  private workerId: string | null = null;
  private pollingInterval?: ReturnType<typeof setInterval>;
  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user) return;
    this.workerId = user.id;
    this.refreshUnreadCount();
    this.pollingInterval = setInterval(() => this.refreshUnreadCount(), 15000);
  }
  ngOnDestroy(): void {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
  }
  private refreshUnreadCount(): void {
    if (!this.workerId) return;
    this.messagesService.getWorkerConversations(this.workerId).subscribe({
      next: (list) => {
        const total = list.reduce((sum, c) => sum + c.unreadCount, 0);
        this.unreadCount.set(total);
      },
    });
  }
  logout(): void {
    this.auth.logout();
  }
}

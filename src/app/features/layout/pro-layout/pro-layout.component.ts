import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/Auth.service';
import { MessagesService } from '../../../core/services/messages.service';
import { WorkersService } from '../../../core/services/workers.service';
import { Worker } from '../../../core/models/worker.model';
import { NotificationComponent } from '../../../shared/notification/notification.component';

@Component({
  selector: 'app-pro-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NotificationComponent],
  templateUrl: './pro-layout.component.html',
  styleUrl: './pro-layout.component.css',
})
export class ProLayoutComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private messagesService = inject(MessagesService);
  private workersService = inject(WorkersService);

  unreadCount = signal(0);
  worker = signal<Worker | null>(null);

  private workerId: string | null = null;
  private pollingInterval?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user) return;
    this.workerId = user.id;
    this.refreshUnreadCount();
    this.pollingInterval = setInterval(() => this.refreshUnreadCount(), 15000);

    //  بيانات الصنايعي (خصوصًا isAvailable) بتتجاب هنا مرة واحدة عند
    // دخول قسم /pro، عشان الـ dot في السايدبار يعكس الحالة الحقيقية بدل
    // النص الثابت اللي كان موجود قبل كده. لو الصنايعي غيّر الإتاحة من
    // صفحة الإعدادات وبعدين رجع هنا، القيمة هتتغير تاني لأن الإعدادات
    // بتعمل reload كامل للصفحة عند التنقل بين أقسام مختلفة عادةً — لو
    // حبيت مزامنة لحظية بدون أي reload خالص، محتاجين shared signal في
        // WorkersService، ممكن نضيفها لو عايز
    this.workersService.getByUserId(user.id).subscribe({
      next: (list) => this.worker.set(list[0] ?? null),
    });
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

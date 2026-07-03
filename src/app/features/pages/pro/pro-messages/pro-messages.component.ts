import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/Auth.service';
import { MessagesService } from '../../../../core/services/messages.service';
import { ConversationListItem } from '../../../../core/models/conversation.model';

@Component({
  selector: 'app-pro-messages',
  standalone: true,
  imports: [],
  templateUrl: './pro-messages.component.html',
  styleUrl: './pro-messages.component.css',
})
export class ProMessagesComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private messagesService = inject(MessagesService);

  conversations = signal<ConversationListItem[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user) {
      this.error.set('لازم تسجل دخول الأول.');
      this.loading.set(false);
      return;
    }

    this.messagesService.getWorkerConversations(user.id).subscribe({
      next: (list) => {
        this.conversations.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('مش قادر يجيب الرسائل.');
        this.loading.set(false);
      },
    });
  }

  openConversation(conv: ConversationListItem): void {
    this.router.navigate(['/messages', conv.otherId], {
      queryParams: { name: conv.otherName, color: conv.otherColor },
    });
  }
}

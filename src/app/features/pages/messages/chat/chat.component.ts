import { Component, inject, OnInit, OnDestroy, AfterViewChecked, signal, computed, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessagesService } from '../../../../core/services/messages.service';
import { AuthService } from '../../../../core/services/Auth.service';
import { Conversation, Message } from '../../../../core/models/conversation.model';
import { generateAvatarColor } from '../../../../core/utils/color.util';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private messagesService = inject(MessagesService);
  private authService = inject(AuthService);

  @ViewChild('scrollAnchor') scrollAnchor?: ElementRef<HTMLDivElement>;

  isLoading = signal(true);
  messages = signal<Message[]>([]);
  conversation = signal<Conversation | null>(null);
  newMessageText = signal('');
  isSending = signal(false);
  otherName = signal('مستخدم');
  otherColor = signal<string | null>(null);

  private otherId = '';
  private pollingInterval?: ReturnType<typeof setInterval>;
  private shouldScroll = false;

  currentUser = computed(() => this.authService.currentUser());
  avatarColor = computed(() => this.otherColor() ?? generateAvatarColor(this.otherName()));

  ngOnInit(): void {
    const otherId = this.route.snapshot.paramMap.get('otherId');
    const nameParam = this.route.snapshot.queryParamMap.get('name');
    if (nameParam) this.otherName.set(nameParam);

    const colorParam = this.route.snapshot.queryParamMap.get('color');
    if (colorParam) this.otherColor.set(colorParam);

    const user = this.currentUser();
    if (!otherId || !user) {
      this.router.navigate(['/']);
      return;
    }
    this.otherId = otherId;

    const clientId = user.role === 'client' ? user.id : otherId;
    const workerId = user.role === 'client' ? otherId : user.id;

    this.messagesService.getOrCreateConversation(clientId, workerId).subscribe({
      next: (conv) => {
        this.conversation.set(conv);
        this.loadMessages(conv.id);
        this.startPolling(conv.id);
      },
      error: () => this.isLoading.set(false),
    });
  }

  ngOnDestroy(): void {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollAnchor?.nativeElement.scrollIntoView({ behavior: 'smooth' });
      this.shouldScroll = false;
    }
  }

  private loadMessages(conversationId: string): void {
    this.messagesService.getMessages(conversationId).subscribe({
      next: (msgs) => {
        this.messages.set(msgs);
        this.isLoading.set(false);
        this.shouldScroll = true;

        const user = this.currentUser();
        if (user) {
          this.messagesService.markConversationRead(conversationId, user.id).subscribe();
        }
      },
      error: () => this.isLoading.set(false),
    });
  }

  private startPolling(conversationId: string): void {
    this.pollingInterval = setInterval(() => {
      this.messagesService.getMessages(conversationId).subscribe({
        next: (msgs) => {
          if (msgs.length !== this.messages().length) {
            this.messages.set(msgs);
            this.shouldScroll = true;
          }
        },
      });
    }, 4000);
  }

  send(): void {
    const text = this.newMessageText().trim();
    const conv = this.conversation();
    const user = this.currentUser();
    if (!text || !conv || !user || this.isSending()) return;

    if (user.role !== 'client' && user.role !== 'pro') {
  return;
}

    this.isSending.set(true);

    this.messagesService.sendMessage({
      conversationId: conv.id,
      senderId: user.id,
      senderRole: user.role,
      recipientId: this.otherId,
      text,
    }).subscribe({
      next: (msg) => {
        this.messages.update((list) => [...list, msg]);
        this.newMessageText.set('');
        this.isSending.set(false);
        this.shouldScroll = true;
      },
      error: () => this.isSending.set(false),
    });
  }

  isMine(msg: Message): boolean {
    return msg.senderId === this.currentUser()?.id;
  }

  goBack(): void {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigate(['/']);
    }
  }
}

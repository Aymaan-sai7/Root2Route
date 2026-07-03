import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, switchMap, map, of, forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Conversation, Message, SendMessageDto, ConversationListItem } from '../models/conversation.model';
import { WorkersService } from './workers.service';
import { BookingsService } from './bookings.service';
import { generateAvatarColor } from '../utils/color.util';

@Injectable({ providedIn: 'root' })
export class MessagesService {
  private http = inject(HttpClient);
  private workers = inject(WorkersService);
  private conversationsBase = `${environment.apiUrl}/conversations`;
  private messagesBase = `${environment.apiUrl}/messages`;
private bookings = inject(BookingsService);

  getOrCreateConversation(clientId: string, workerId: string): Observable<Conversation> {
    const params = new HttpParams().set('clientId', clientId).set('workerId', workerId);
    return this.http.get<Conversation[]>(this.conversationsBase, { params }).pipe(
      switchMap((existing) => {
        if (existing.length > 0) return of(existing[0]);
        const newConversation: Omit<Conversation, 'id'> = {
          clientId,
          workerId,
          lastMessage: '',
          lastMessageAt: new Date().toISOString(),
        };
        return this.http.post<Conversation>(this.conversationsBase, newConversation);
      })
    );
  }

  getMessages(conversationId: string): Observable<Message[]> {
    const params = new HttpParams().set('conversationId', conversationId);
    return this.http.get<Message[]>(this.messagesBase, { params }).pipe(
      map((messages) => messages.sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ))
    );
  }

  sendMessage(dto: SendMessageDto): Observable<Message> {
    const message: Omit<Message, 'id'> = {
      ...dto,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    return this.http.post<Message>(this.messagesBase, message).pipe(
      switchMap((created) =>
        this.http.patch<Conversation>(`${this.conversationsBase}/${dto.conversationId}`, {
          lastMessage: dto.text,
          lastMessageAt: created.createdAt,
        }).pipe(map(() => created))
      )
    );
  }

  /** عدد الرسايل اللي لسه متقراش لمستخدم معين (للبادج) */
  getUnreadCount(userId: string): Observable<number> {
    const params = new HttpParams().set('recipientId', userId).set('isRead', 'false');
    return this.http.get<Message[]>(this.messagesBase, { params }).pipe(
      map((msgs) => msgs.length)
    );
  }

  /** يعلّم كل رسايل محادثة معينة كمقروءة */
  markConversationRead(conversationId: string, readerId: string): Observable<void> {
    const params = new HttpParams()
      .set('conversationId', conversationId)
      .set('recipientId', readerId)
      .set('isRead', 'false');

    return this.http.get<Message[]>(this.messagesBase, { params }).pipe(
      switchMap((unread) => {
        if (unread.length === 0) return of(void 0);
        return forkJoin(
          unread.map((m) => this.http.patch(`${this.messagesBase}/${m.id}`, { isRead: true }))
        ).pipe(map(() => void 0));
      })
    );
  }

  /** قايمة محادثات الـ client مع بيانات الصنايعي وعدد الرسايل الغير مقروءة لكل محادثة */
  getClientConversations(clientId: string): Observable<ConversationListItem[]> {
    const params = new HttpParams().set('clientId', clientId);

    return this.http.get<Conversation[]>(this.conversationsBase, { params }).pipe(
      switchMap((conversations) => {
        if (conversations.length === 0) return of([]);

        return forkJoin(
          conversations.map((conv) =>
            forkJoin({
              worker: this.workers.getByUserId(conv.workerId).pipe(map((list) => list[0] ?? null)),
              unread: this.getUnreadMessagesForConversation(conv.id, clientId),
            }).pipe(
              map(({ worker, unread }): ConversationListItem => ({
                conversationId: conv.id,
                otherId: conv.workerId,
                otherName: worker?.fullName ?? 'صنايعي',
                otherColor: worker?.avatarColor ?? '#64748B',
                lastMessage: conv.lastMessage,
                lastMessageAt: conv.lastMessageAt,
                unreadCount: unread.length,
              }))
            )
          )
        );
      }),
      map((items) =>
        items.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
      )
    );
  }

  private getUnreadMessagesForConversation(conversationId: string, readerId: string): Observable<Message[]> {
    const params = new HttpParams()
      .set('conversationId', conversationId)
      .set('recipientId', readerId)
      .set('isRead', 'false');
    return this.http.get<Message[]>(this.messagesBase, { params });
  }

  /** قايمة محادثات الصنايعي مع بيانات الـ client وعدد الرسايل الغير مقروءة */
  /** قايمة محادثات الصنايعي (بالـ user id الحقيقي بتاعه) مع بيانات الـ client */
  getWorkerConversations(workerUserId: string): Observable<ConversationListItem[]> {
    const params = new HttpParams().set('workerId', workerUserId);

    return this.http.get<Conversation[]>(this.conversationsBase, { params }).pipe(
      switchMap((conversations) => {
        if (conversations.length === 0) return of([]);

        return forkJoin(
          conversations.map((conv) =>
            forkJoin({
              clientBookings: this.bookings.getByClient(conv.clientId),
              unread: this.getUnreadMessagesForConversation(conv.id, workerUserId),
            }).pipe(
              map(({ clientBookings, unread }): ConversationListItem => {
                const clientName = clientBookings[0]?.clientName ?? 'عميل';
                return {
                  conversationId: conv.id,
                  otherId: conv.clientId,
                  otherName: clientName,
                  otherColor: generateAvatarColor(clientName),
                  lastMessage: conv.lastMessage,
                  lastMessageAt: conv.lastMessageAt,
                  unreadCount: unread.length,
                };
              })
            )
          )
        );
      }),
      map((items) =>
        items.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
      )
    );
  }
}

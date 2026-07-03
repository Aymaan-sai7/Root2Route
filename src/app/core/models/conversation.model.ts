export interface Conversation {
  id: string;
  clientId: string;
  workerId: string;
  lastMessage: string;
  lastMessageAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: 'client' | 'pro';
  recipientId: string;   // ← جديد: مين المفروض يقرا الرسالة دي
  text: string;
  isRead: boolean;       // ← جديد
  createdAt: string;
}

export interface SendMessageDto {
  conversationId: string;
  senderId: string;
  senderRole: 'client' | 'pro';
  recipientId: string;
  text: string;
}

export interface ConversationListItem {
  conversationId: string;
  otherId: string;
  otherName: string;
  otherColor: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

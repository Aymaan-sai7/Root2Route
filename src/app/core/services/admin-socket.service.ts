import { inject, Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AuthService } from './Auth.service';
import { AdminService } from './admin.service';

@Injectable({ providedIn: 'root' })
export class AdminSocketService {
  private auth = inject(AuthService);
  private adminService = inject(AdminService);
  private socket: Socket | null = null;

  connect(): void {
    if (this.socket?.connected) return;

    const token = this.auth.getToken();
    if (!token) {
      this.socket = io(environment.apiUrl, {
        withCredentials: true,
        transports: ['websocket'],
      });
    } else {
      this.socket = io(environment.apiUrl, {
        auth: { token },
        withCredentials: true,
        transports: ['websocket'],
      });
    }

    this.socket.on('admin:pendingApprovalsChanged', (payload: { pendingApprovals: number }) => {
      this.adminService.setPendingApprovals(payload.pendingApprovals);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}

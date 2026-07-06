import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AdminService } from '../../../../../core/services/admin.service';
import { AuthService } from '../../../../../core/services/Auth.service';
import { AdminUiService } from '../../../../../core/services/admin ui.service';
import { AdminSocketService } from '../../../../../core/services/admin-socket.service';

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './admin-sidebar.component.html',
  styleUrl: './admin-sidebar.component.css',
})
export class AdminSidebarComponent implements OnInit, OnDestroy {
  private adminService = inject(AdminService);
  private auth = inject(AuthService);
  private adminSocket = inject(AdminSocketService);
  adminUi = inject(AdminUiService);

  pendingApprovals = this.adminService.pendingApprovals;

  ngOnInit(): void {
    // أول تحميل: نجيب الرقم الحالي مرة واحدة (fallback لحد ما الـ socket يبدأ يبعت)
    this.adminService.refreshPendingApprovals();
    // بعد كده الرقم بيتحدث لايف عن طريق الـ WebSocket من غير أي polling أو refresh
    this.adminSocket.connect();
  }

  ngOnDestroy(): void {
    this.adminSocket.disconnect();
  }

  onNavigate(): void {
    this.adminUi.close();
  }

  logout(): void {
    this.adminUi.close();
    this.auth.logout();
  }
}

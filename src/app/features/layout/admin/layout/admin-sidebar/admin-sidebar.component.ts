import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AdminService } from '../../../../../core/services/admin.service';
import { AuthService } from '../../../../../core/services/Auth.service';
import { AdminUiService } from '../../../../../core/services/admin ui.service';

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './admin-sidebar.component.html',
  styleUrl: './admin-sidebar.component.css',
})
export class AdminSidebarComponent implements OnInit {
  private adminService = inject(AdminService);
  private auth = inject(AuthService);
  adminUi = inject(AdminUiService);

  pendingApprovals = signal(0);

  ngOnInit(): void {
    this.adminService.getStats().subscribe({
      next: (stats) => this.pendingApprovals.set(stats.pendingApprovals),
    });
  }

  /** بيتنادى من كل رابط في الدرج — يقفل الدرج بعد أي اختيار على الموبايل */
  onNavigate(): void {
    this.adminUi.close();
  }

  logout(): void {
    this.adminUi.close();
    this.auth.logout();
  }
}

import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { AuthService } from '../../../../../core/services/Auth.service';
import { AdminUiService } from '../../../../../core/services/admin ui.service';

@Component({
  selector: 'app-admin-header',
  standalone: true,
  imports: [],
  templateUrl: './admin-header.component.html',
  styleUrl: './admin-header.component.css',
})
export class AdminHeaderComponent {
  auth = inject(AuthService);
  adminUi = inject(AdminUiService);
  private elRef = inject(ElementRef);

  dropdownOpen = signal(false);

  toggleDropdown(): void {
    this.dropdownOpen.update((v) => !v);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.dropdownOpen.set(false);
    }
  }

  logout(): void {
    this.auth.logout();
  }
}

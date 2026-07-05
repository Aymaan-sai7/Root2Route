import { Component, inject } from '@angular/core';
import { AuthService } from '../../../../../core/services/Auth.service';

@Component({
  selector: 'app-admin-header',
  standalone: true,
  imports: [],
  templateUrl: './admin-header.component.html',
  styleUrl: './admin-header.component.css',
})
export class AdminHeaderComponent {
  auth = inject(AuthService);
}

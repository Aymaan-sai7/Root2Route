import { Component, input, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-step-account-info',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './step-account-info.component.html',
  styleUrl: './step-account-info.component.css'
})
export class StepAccountInfoComponent {
  form = input.required<FormGroup>();

  private toastr = inject(ToastrService);

  signInWithGoogle(): void {
    this.toastr.info('تسجيل الدخول بجوجل قيد التطوير.', 'قريبًا');
  }
}

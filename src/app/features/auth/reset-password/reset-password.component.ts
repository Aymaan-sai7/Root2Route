import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ScrollRevealDirective } from '../../../shared/directive/scroll-reveal.directive';
import { AuthService } from '../../../core/services/Auth.service';

//  Validator بسيط للتأكد إن الباسورد وتأكيده متطابقين
function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm   = control.get('confirmPassword')?.value;
  return password === confirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ScrollRevealDirective],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css',
})
export class ResetPasswordComponent {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private route  = inject(ActivatedRoute);
  private router = inject(Router);

  form: FormGroup = this.fb.group(
    {
      password:        ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch }
  );

  loading      = signal(false);
  success      = signal(false);
  showPassword = signal(false);
  errorMessage = signal<string | null>(null);

  //  التوكن والإيميل جايين من الـ query params في اللينك اللي وصل بالإيميل،
  // مش من input المستخدم — لو مش موجودين، اللينك أصلاً باطل ومفيش داعي نعرض فورم
  private token = this.route.snapshot.queryParamMap.get('token');
  private email  = this.route.snapshot.queryParamMap.get('email');

  linkInvalid = !this.token || !this.email;

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  submit(): void {
    if (this.form.invalid || !this.token || !this.email) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);

    this.auth.resetPassword(this.email, this.token, this.form.value.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
        setTimeout(() => this.router.navigate(['/login']), 2500);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }
}

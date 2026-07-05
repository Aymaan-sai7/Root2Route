import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ScrollRevealDirective } from '../../../shared/directive/scroll-reveal.directive';
import { AuthService } from '../../../core/services/Auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ScrollRevealDirective],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private route  = inject(ActivatedRoute);
  private router = inject(Router);

  form: FormGroup = this.fb.group({
    email:        ['', [Validators.required, Validators.email]],
    password:     ['', [Validators.required, Validators.minLength(8)]],
    keepSignedIn: [false],
  });

  loading      = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  signInWithGoogle(): void {
    this.errorMessage.set('تسجيل الدخول بجوجل قيد التطوير.');
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { email, password, keepSignedIn } = this.form.value;

    this.auth.login(email, password, keepSignedIn).subscribe({
      next: () => {
        this.loading.set(false);

        // لو المستخدم كان جاي من رابط محدد (authGuard حفظها كـ returnUrl)،
        // نرجّعه لنفس الصفحة دي بدل ما نوديه مكانه الافتراضي حسب الدور.
        // roleGuard هيفضل يتأكد إن الصفحة دي فعلاً بتاعة دوره.
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        if (returnUrl) {
          this.router.navigateByUrl(returnUrl);
        } else {
          this.auth.redirectAfterLogin();
        }
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }
}

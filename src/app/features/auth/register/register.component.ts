import { Component, signal, OnInit, inject, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { switchMap, of } from 'rxjs';
import { StepIndicatorComponent } from './components/step-indicator/step-indicator.component';
import { StepAccountInfoComponent } from './components/step-account-info/step-account-info.component';
import { StepRoleSetupComponent } from './components/step-role-setup/step-role-setup.component';
import { StepProDetailsComponent } from './components/step-pro-details/step-pro-details.component';
import { StepVerificationComponent } from './components/step-verification/step-verification.component';
import { StepVerificationDocsComponent } from './components/step-verification-docs/step-verification-docs.component';
import { ScrollRevealDirective } from '../../../shared/directive/scroll-reveal.directive';
import { AuthService } from '../../../core/services/Auth.service';
import { WorkersService } from '../../../core/services/workers.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    RouterLink,
    StepIndicatorComponent,
    StepAccountInfoComponent,
    StepRoleSetupComponent,
    StepProDetailsComponent,
    StepVerificationComponent,
    StepVerificationDocsComponent,
    ScrollRevealDirective,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent implements OnInit {
  private fb      = new FormBuilder();
  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private auth    = inject(AuthService);
  private workers = inject(WorkersService);

  currentStep  = signal(1);
  loading      = signal(false);
  errorMessage = signal<string | null>(null);

  form: FormGroup = this.fb.group({
    fullName:         ['', [Validators.required, Validators.minLength(3)]],
    email:            ['', [Validators.required, Validators.email]],
    password:         ['', [Validators.required, Validators.minLength(8)]],
    role:             ['', Validators.required],
    trade:            [''],
    hourlyRate:       [null],
    yearsOfExperience:[null],
    city:             [''],
    serviceRadius:    [null],
    idFront:          [null],
    idBack:           [null],
    certificate:      [null],
  });

  private roleValue = toSignal(this.form.get('role')!.valueChanges, {
    initialValue: this.form.get('role')!.value,
  });

  totalSteps = computed(() => (this.roleValue() === 'pro' ? 5 : 3));

  private stepFields = computed<Partial<Record<number, string[]>>>(() => {
    if (this.roleValue() === 'pro') {
      return {
        1: ['fullName', 'email', 'password'],
        2: ['role'],
        3: ['trade', 'hourlyRate', 'yearsOfExperience', 'city'],
        4: ['idFront', 'idBack'],
        5: [],
      };
    }
    return {
      1: ['fullName', 'email', 'password'],
      2: ['role'],
      3: [],
    };
  });

  ngOnInit(): void {
    const roleFromUrl = this.route.snapshot.queryParamMap.get('role');
    if (roleFromUrl === 'client' || roleFromUrl === 'pro') {
      this.form.get('role')?.setValue(roleFromUrl);
    }
    this.syncProValidators();
  }

  goNext(): void {
    const fieldsToCheck = this.stepFields()[this.currentStep()] ?? [];
    const isValid = fieldsToCheck.every((f) => this.form.get(f)?.valid);

    if (!isValid) {
      fieldsToCheck.forEach((f) => this.form.get(f)?.markAsTouched());
      return;
    }

    if (this.currentStep() === 2) this.syncProValidators();

    if (this.currentStep() < this.totalSteps()) {
      this.currentStep.update((s) => s + 1);
    }
  }

  goBack(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update((s) => s - 1);
    }
  }

  submit(): void {
    console.log('submit() called, form valid:', this.form.valid, this.form.value);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      console.log('Form invalid, errors:', this.getFormErrors());
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const v    = this.form.value;
    const role = v.role as 'client' | 'pro';

    // ── تسجيل الـ user ──────────────────────────────────────
    this.auth.register({ fullName: v.fullName, email: v.email, password: v.password, role }).pipe(

      // ── لو pro، نضيف بياناته في /workers بعد الـ user ────
      switchMap((user: User) => {
        if (role !== 'pro') {
          return of(user);
        }
        return this.workers.createWorker({
          userId:            user.id,
          fullName:          v.fullName,
          trade:             v.trade,
          tradeLabel:        this.getTradeLabel(v.trade),
          city:              v.city,
          hourlyRate:        Number(v.hourlyRate),
          yearsOfExperience: Number(v.yearsOfExperience),
          serviceRadius:     Number(v.serviceRadius) || 15,
          rating:            0,
          reviewsCount:      0,
          isAvailable:       true,
          completedJobs:     0,
          bio:               '',
          avatarColor:       this.randomColor(),
        }).pipe(switchMap(() => of(user)));
      })

    ).subscribe({
      next: () => {
        console.log('Register success!');
        this.loading.set(false);
        if (role === 'pro') {
          this.router.navigate(['/login']);
        } else {
          this.auth.redirectAfterLogin();
        }
      },
      error: (err: Error) => {
        console.error('Register error:', err);
        this.loading.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }

  private getFormErrors(): Record<string, any> {
    const errors: Record<string, any> = {};
    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.get(key);
      if (control && control.invalid) {
        errors[key] = control.errors;
      }
    });
    return errors;
  }

  private getTradeLabel(trade: string): string {
    const map: Record<string, string> = {
      electrical: 'كهربا',
      plumbing:   'سباكة',
      carpentry:  'نجارة',
      painting:   'نقاشة',
      ac:         'تكييف وتبريد',
      other:      'خدمات أخرى',
    };
    return map[trade] ?? trade;
  }

  private randomColor(): string {
    const colors = ['#1B4F72', '#E8762C', '#3F7A52', '#7A5FA0', '#123550', '#2563EB'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private syncProValidators(): void {
    const isPro = this.form.get('role')?.value === 'pro';

    const fields = ['trade', 'hourlyRate', 'yearsOfExperience', 'city', 'idFront', 'idBack'];

    fields.forEach((field) => {
      const control = this.form.get(field);
      if (isPro) {
        if (field === 'trade' || field === 'city' || field === 'idFront' || field === 'idBack') {
          control?.setValidators([Validators.required]);
        } else {
          control?.setValidators([Validators.required, Validators.min(1)]);
        }
      } else {
        control?.clearValidators();
      }
      control?.updateValueAndValidity();
    });
  }
}
